// The OSRS Wiki Sync -> R2 ingest. Walks the clan roster a batch at a time,
// asks the wiki sync backend for each member's completed combat achievements,
// scores them against the live task table, and rewrites the manifest.
//
// Why batched rather than fetched on render (the pattern the WOM tabs use):
// there are ~300 members, and a Cloudflare Worker on the free plan gets 50
// subrequests and 10 ms of CPU per invocation. So this follows the Drops
// pattern instead — cron -> ingest -> manifest in R2 -> the page reads one file.
// A cursor in the manifest makes each run resume where the last one stopped.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidateTag } from "next/cache";

import { sanityFetch } from "@/sanity/client";
import { settingsQuery } from "@/sanity/queries";
import type { Settings } from "@/sanity/types";
import { getGroupDetails } from "@/wom/queries";

import {
  decodeCompleted,
  encodeCompleted,
  scoreTasks,
  type CaTierTable,
} from "./ca";
import { fetchCaTierTable, fetchPlayerCa } from "./client";
import { WIKI_BUCKET_BINDING, WIKI_MANIFEST_KEY, WIKI_TAG } from "./env";
import {
  EMPTY_WIKI_MANIFEST,
  type CaEntry,
  type WikiManifest,
} from "./types";

// Players fetched per invocation. Plus at most 3 cycle-start calls (wiki task
// table, Sanity settings, WOM group) that is 23 of the 50-subrequest cap.
const DEFAULT_BATCH = 20;
const MAX_BATCH = 40;

// Persist this often mid-batch. R2 writes go through the binding, so they are
// not subrequests and cost nothing — but they mean a run killed by the 10 ms CPU
// limit loses at most this many players and the cursor still moves forward.
const PERSIST_EVERY = 5;

// Pace the player calls. Measured: ~40 req/s gets 429'd hard (177 of 300),
// sequential does not. Awaiting a timer burns no CPU, and 20 players at this
// spacing is ~3 s of a 15-minute cron budget.
const REQUEST_SPACING_MS = 150;

// Minimal shape of the R2 binding we use — declared locally so we don't need
// @cloudflare/workers-types (see src/discord/sync.ts for the same convention).
interface R2ObjectBodyLike {
  json<T>(): Promise<T>;
}
interface R2BucketLike {
  get(key: string): Promise<R2ObjectBodyLike | null>;
  put(
    key: string,
    value: ArrayBuffer | string,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
}

async function getBucket(): Promise<R2BucketLike> {
  const ctx = await getCloudflareContext({ async: true });
  const bucket = (
    ctx.env as unknown as Record<string, R2BucketLike | undefined>
  )[WIKI_BUCKET_BINDING];
  if (!bucket) {
    throw new Error(`R2 binding "${WIKI_BUCKET_BINDING}" is not configured`);
  }
  return bucket;
}

async function readManifest(bucket: R2BucketLike): Promise<WikiManifest> {
  const obj = await bucket.get(WIKI_MANIFEST_KEY);
  if (!obj) return { ...EMPTY_WIKI_MANIFEST, players: {} };
  try {
    // Merge over the empty shape so an older manifest missing newer fields gets
    // sane defaults instead of undefined.
    return {
      ...EMPTY_WIKI_MANIFEST,
      ...(await obj.json<Partial<WikiManifest>>()),
    };
  } catch {
    return { ...EMPTY_WIKI_MANIFEST, players: {} };
  }
}

async function writeManifest(
  bucket: R2BucketLike,
  manifest: WikiManifest,
): Promise<void> {
  await bucket.put(WIKI_MANIFEST_KEY, JSON.stringify(manifest), {
    // no-cache so the r2.dev edge doesn't serve a stale manifest; freshness is
    // otherwise governed by the page's tag + 1h revalidate.
    httpMetadata: { contentType: "application/json", cacheControl: "no-cache" },
  });
}

// The roster is whatever WOM says the clan is, so the tabs never disagree about
// who's a member.
async function fetchRoster(): Promise<string[]> {
  const settings = await sanityFetch<Settings | null>({
    query: settingsQuery,
    fallback: null,
  });
  const groupId = settings?.womGroupId;
  if (!groupId) return [];

  const group = await getGroupDetails(groupId);
  return (group?.memberships ?? [])
    .map((m) => m.player.displayName)
    .filter((name): name is string => Boolean(name));
}

const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sameCounts(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export type WikiSyncMode = "refresh" | "rescore";

export interface WikiSyncResult {
  mode: WikiSyncMode;
  cycleStart: boolean; // this run refreshed the task table + roster
  processed: number; // members attempted this run
  updated: number; // members whose numbers actually changed
  missing: number; // members with no synced data (normal)
  failed: number; // members whose fetch errored
  cursor: number; // where the next run resumes
  members: number; // roster size
  tracked: number; // members with data in the manifest
  taskTableSize: number; // size of the live task table (highest task id + 1)
  wrapped: boolean; // finished a full pass over the roster
}

/**
 * Run one ingest pass.
 *
 * `refresh` (default) advances the cursor through the roster. When the cursor is
 * at 0 it first refreshes the live task table and the member list, then prunes
 * anyone who has left the clan.
 *
 * `rescore` re-derives every stored player's tier counts and points from their
 * saved bitmap against a freshly fetched task table. No player fetches, so it's
 * the cheap way to absorb a new CA release immediately instead of waiting for
 * the next full cycle.
 */
export async function runWikiSync(
  opts: { mode?: WikiSyncMode; batch?: number } = {},
): Promise<WikiSyncResult> {
  const bucket = await getBucket();
  const manifest = await readManifest(bucket);

  if (opts.mode === "rescore") return runRescore(bucket, manifest);

  const batch = Math.min(
    Math.max(Math.trunc(opts.batch ?? DEFAULT_BATCH), 1),
    MAX_BATCH,
  );

  let cursor = manifest.cursor;
  // Anything missing means we can't trust the cursor — start a fresh cycle.
  const cycleStart =
    cursor <= 0 || !manifest.ca || manifest.members.length === 0;

  if (cycleStart) {
    cursor = 0;
    manifest.cycleStartedAt = now();

    // Keep the previous table/roster if the upstream is briefly unavailable —
    // stale-but-working beats stalling the whole cycle. Only a first-ever run
    // with nothing cached is fatal.
    try {
      manifest.ca = { tiers: await fetchCaTierTable(), fetchedAt: now() };
    } catch (err) {
      if (!manifest.ca) throw err;
      console.error("Wiki sync: task table refresh failed, reusing cached", err);
    }

    try {
      const members = await fetchRoster();
      if (members.length > 0) {
        manifest.members = members;
        const current = new Set(members.map((m) => m.toLowerCase()));
        for (const key of Object.keys(manifest.players)) {
          if (!current.has(key)) delete manifest.players[key];
        }
      }
    } catch (err) {
      if (manifest.members.length === 0) throw err;
      console.error("Wiki sync: roster refresh failed, reusing cached", err);
    }
  }

  const members = manifest.members;
  if (members.length === 0) {
    throw new Error(
      "Wiki sync: no clan members (set the Wise Old Man group ID in Site Settings)",
    );
  }
  const tiers = manifest.ca?.tiers;
  if (!tiers) throw new Error("Wiki sync: no combat achievement task table");

  let processed = 0;
  let updated = 0;
  let missing = 0;
  let failed = 0;

  while (processed < batch && cursor < members.length) {
    const displayName = members[cursor];
    const key = displayName.toLowerCase();

    if (processed > 0) await sleep(REQUEST_SPACING_MS);

    try {
      const ids = await fetchPlayerCa(displayName);
      if (ids === null) {
        // Never synced. Leave any previous data intact; just note we looked.
        missing++;
        const previous = manifest.players[key];
        if (previous) previous.c = now();
      } else if (score(manifest, key, displayName, ids, tiers)) {
        updated++;
      }
    } catch (err) {
      failed++;
      console.error(`Wiki sync: ${displayName} failed`, err);
    }

    processed++;
    cursor++;

    if (processed % PERSIST_EVERY === 0) {
      manifest.cursor = cursor;
      manifest.syncedAt = now();
      await writeManifest(bucket, manifest);
    }
  }

  const wrapped = cursor >= members.length;
  manifest.cursor = wrapped ? 0 : cursor;
  manifest.syncedAt = now();
  await writeManifest(bucket, manifest);

  if (updated > 0) revalidateTag(WIKI_TAG, "max");

  return {
    mode: "refresh",
    cycleStart,
    processed,
    updated,
    missing,
    failed,
    cursor: manifest.cursor,
    members: members.length,
    tracked: Object.keys(manifest.players).length,
    taskTableSize: tiers.length,
    wrapped,
  };
}

// Write a player's scored entry, returning whether anything actually changed.
// `u` only moves when the numbers move — it's the closest thing we have to a
// "last synced" timestamp, since the API doesn't expose one.
function score(
  manifest: WikiManifest,
  key: string,
  displayName: string,
  ids: number[],
  tiers: CaTierTable,
): boolean {
  const result = scoreTasks(ids, tiers);
  const previous = manifest.players[key];
  const changed =
    !previous ||
    previous.d !== result.done ||
    previous.p !== result.points ||
    !sameCounts(previous.t, result.counts);

  const entry: CaEntry = {
    n: displayName,
    b: encodeCompleted(ids),
    t: result.counts,
    d: result.done,
    p: result.points,
    u: changed ? now() : previous.u,
    c: now(),
  };
  manifest.players[key] = entry;
  return changed;
}

async function runRescore(
  bucket: R2BucketLike,
  manifest: WikiManifest,
): Promise<WikiSyncResult> {
  const tiers = await fetchCaTierTable();
  manifest.ca = { tiers, fetchedAt: now() };

  let updated = 0;
  for (const entry of Object.values(manifest.players)) {
    const result = scoreTasks(decodeCompleted(entry.b), tiers);
    if (
      entry.d === result.done &&
      entry.p === result.points &&
      sameCounts(entry.t, result.counts)
    ) {
      continue;
    }
    entry.t = result.counts;
    entry.d = result.done;
    entry.p = result.points;
    entry.u = now();
    updated++;
  }

  manifest.syncedAt = now();
  await writeManifest(bucket, manifest);
  if (updated > 0) revalidateTag(WIKI_TAG, "max");

  const tracked = Object.keys(manifest.players).length;
  return {
    mode: "rescore",
    cycleStart: false,
    processed: tracked,
    updated,
    missing: 0,
    failed: 0,
    cursor: manifest.cursor,
    members: manifest.members.length,
    tracked,
    taskTableSize: tiers.length,
    wrapped: false,
  };
}
