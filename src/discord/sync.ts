// The Discord -> R2 ingest. Reads a manifest from R2, pulls channel messages,
// downloads NEW image attachments (dedup by attachment id), re-hosts them to R2
// (permanent URLs), and rewrites the manifest. Runs from the secret sync route
// and (throttled) from the Drops page's `after()` lazy trigger.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidateTag } from "next/cache";

import { DROPS_BUCKET_BINDING, DROPS_TAG, MANIFEST_KEY } from "./env";
import { extractImages, fetchMessages } from "./messages";
import { EMPTY_MANIFEST, type Drop, type Manifest } from "./types";

// Bounds downloads per invocation. Cloudflare Workers cap outbound subrequests
// per invocation (50 on the free tier); an R2 `.put` via binding does NOT count,
// but each image download does. We stop *between messages*, so a single message
// with several images may nudge slightly over the batch — 30 leaves headroom.
const BACKFILL_BATCH = 30;

// Don't run the lazy (page-triggered) sync more often than this, regardless of
// how often the page revalidates.
const LAZY_MIN_INTERVAL_MS = 15 * 60 * 1000;

// Minimal shape of the R2 binding we use — declared locally so we don't need
// @cloudflare/workers-types (kept out of the project, per its "local minimal
// types" convention; see wom/types.ts).
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
  const bucket = (ctx.env as unknown as Record<string, R2BucketLike | undefined>)[
    DROPS_BUCKET_BINDING
  ];
  if (!bucket) {
    throw new Error(`R2 binding "${DROPS_BUCKET_BINDING}" is not configured`);
  }
  return bucket;
}

async function readManifest(bucket: R2BucketLike): Promise<Manifest> {
  const obj = await bucket.get(MANIFEST_KEY);
  if (!obj) return { ...EMPTY_MANIFEST };
  try {
    return await obj.json<Manifest>();
  } catch {
    return { ...EMPTY_MANIFEST };
  }
}

async function writeManifest(
  bucket: R2BucketLike,
  manifest: Manifest,
): Promise<void> {
  await bucket.put(MANIFEST_KEY, JSON.stringify(manifest), {
    // no-cache so the r2.dev edge doesn't serve a stale manifest; freshness is
    // otherwise governed by the page's tag + 1h revalidate.
    httpMetadata: { contentType: "application/json", cacheControl: "no-cache" },
  });
}

function extFor(filename: string, contentType?: string): string {
  const m = filename.match(/\.([a-z0-9]+)$/i);
  if (m) return m[1].toLowerCase();
  if (contentType?.includes("/")) return contentType.split("/")[1];
  return "png";
}

// Download a (freshly-signed) Discord CDN url and store it in R2. Returns false
// on any failure so one bad attachment doesn't abort the whole batch.
async function downloadToR2(
  bucket: R2BucketLike,
  url: string,
  key: string,
  contentType?: string,
): Promise<boolean> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return false;
    const body = await res.arrayBuffer();
    await bucket.put(key, body, {
      httpMetadata: {
        contentType:
          contentType || res.headers.get("content-type") || "image/png",
      },
    });
    return true;
  } catch {
    return false;
  }
}

export type SyncMode = "backfill" | "incremental";

export interface SyncResult {
  mode: SyncMode;
  processed: number; // new drops ingested this run
  pageMessages: number; // messages returned by Discord this run
  hitCap: boolean; // stopped early due to the per-run batch cap
  done: boolean; // nothing more to do for this mode right now
  backfillComplete: boolean;
  total: number; // total drops in the manifest after this run
}

/**
 * Run one ingest pass.
 *
 * - `incremental` walks forward from `newestId`, processing OLDEST-first so the
 *   cursor advances contiguously (no gaps if we hit the batch cap).
 * - `backfill` walks backward from `oldestId` (newest-first) toward the channel
 *   start; `done` becomes true once we reach the beginning.
 * - The first ever run (no cursors) seeds from the latest page and leaves
 *   backfill to continue older.
 *
 * Re-fetches are safe: dedup by attachment id means overlapping pages never
 * re-download an image.
 */
export async function runSync(
  opts: { mode?: SyncMode; limit?: number } = {},
): Promise<SyncResult> {
  const mode: SyncMode = opts.mode ?? "incremental";
  const batchLimit = opts.limit ?? BACKFILL_BATCH;

  const bucket = await getBucket();
  const manifest = await readManifest(bucket);
  const known = new Set(manifest.drops.map((d) => d.id));

  const isFirstEver = !manifest.newestId && !manifest.oldestId;

  // Fetch the relevant window.
  let messages;
  if (mode === "backfill" && manifest.oldestId) {
    messages = await fetchMessages({ before: manifest.oldestId });
  } else if (mode === "incremental" && manifest.newestId) {
    messages = await fetchMessages({ after: manifest.newestId });
    messages.reverse(); // oldest-first for contiguous cursor advance
  } else {
    messages = await fetchMessages({}); // first-ever seed (latest page)
  }
  const pageMessages = messages.length;

  // Process message-by-message, stopping *before* a message once the cap is hit
  // so cursors only ever advance over fully-processed messages.
  const newDrops: Drop[] = [];
  const processedIds: string[] = [];
  let hitCap = false;
  for (const m of messages) {
    if (newDrops.length >= batchLimit) {
      hitCap = true;
      break;
    }
    for (const img of extractImages(m)) {
      if (known.has(img.attachment.id)) continue;
      const a = img.attachment;
      const key = `images/${a.id}.${extFor(a.filename, a.content_type)}`;
      const ok = await downloadToR2(bucket, a.url, key, a.content_type);
      if (!ok) continue;
      known.add(a.id);
      newDrops.push({
        id: a.id,
        key,
        caption: img.caption,
        date: img.date,
        w: a.width ?? undefined,
        h: a.height ?? undefined,
      });
    }
    processedIds.push(m.id);
  }

  // Advance cursors + completion, per mode.
  let { newestId, oldestId, backfillComplete } = manifest;
  const pageWasFull = pageMessages >= 100;

  if (mode === "incremental" && !isFirstEver) {
    // processedIds are oldest-first; advance the newest cursor to the last one.
    if (processedIds.length) newestId = processedIds[processedIds.length - 1];
  } else if (mode === "backfill") {
    // processedIds are newest-first; the last is the oldest we finished.
    if (processedIds.length) oldestId = processedIds[processedIds.length - 1];
    if (!hitCap && !pageWasFull) backfillComplete = true;
  } else {
    // First-ever seed: newest = max id of the page; oldest = oldest processed.
    for (const m of messages) {
      if (!newestId || BigInt(m.id) > BigInt(newestId)) newestId = m.id;
    }
    if (processedIds.length) oldestId = processedIds[processedIds.length - 1];
    if (!hitCap && !pageWasFull) backfillComplete = true;
  }

  const updated: Manifest = {
    newestId,
    oldestId,
    backfillComplete,
    syncedAt: new Date().toISOString(),
    drops: [...manifest.drops, ...newDrops],
  };
  await writeManifest(bucket, updated);

  if (newDrops.length > 0) revalidateTag(DROPS_TAG, "max");

  // "done" = nothing left to do for this mode right now.
  const done =
    mode === "incremental"
      ? !hitCap && !pageWasFull
      : backfillComplete;

  return {
    mode,
    processed: newDrops.length,
    pageMessages,
    hitCap,
    done,
    backfillComplete,
    total: updated.drops.length,
  };
}

export interface RecaptionResult {
  updated: number; // captions changed
  scanned: number; // messages scanned
  matched: number; // manifest drops seen in the scanned window
  done: boolean; // reached the start of the channel within the page cap
}

/**
 * Rewrite existing drops' captions in place from a fresh scan of the channel —
 * used to backfill mention names (and any other markup fixes) onto drops that
 * were ingested before caption resolution existed. Fetches message lists only
 * (no image downloads), so it can page through a lot per invocation.
 */
export async function runRecaption(): Promise<RecaptionResult> {
  // Message-list fetches count against the ~50 subrequest cap; 40 pages covers
  // ~4000 messages. If a channel is larger, re-run (idempotent) — for a typical
  // drops channel one pass is plenty.
  const MAX_PAGES = 40;

  const bucket = await getBucket();
  const manifest = await readManifest(bucket);
  const byId = new Map(manifest.drops.map((d) => [d.id, d]));

  let updated = 0;
  let scanned = 0;
  let matched = 0;
  let done = false;
  let before: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const messages = await fetchMessages({ before });
    if (messages.length === 0) {
      done = true;
      break;
    }
    scanned += messages.length;
    for (const m of messages) {
      for (const img of extractImages(m)) {
        const drop = byId.get(img.attachment.id);
        if (!drop) continue;
        matched++;
        if (drop.caption !== img.caption) {
          drop.caption = img.caption;
          updated++;
        }
      }
    }
    before = messages[messages.length - 1].id;
    if (messages.length < 100) {
      done = true;
      break;
    }
  }

  if (updated > 0) {
    await writeManifest(bucket, manifest);
    revalidateTag(DROPS_TAG, "max");
  }

  return { updated, scanned, matched, done };
}

/**
 * Throttled incremental sync for the page's `after()` lazy trigger. Swallows all
 * errors (the manual sync route is the reliable path) so it can never break a
 * page render.
 *
 * Note: this relies on the R2 binding being reachable via getCloudflareContext
 * inside `after()`. If that proves unavailable in production, switch this to a
 * fire-and-forget authenticated fetch to /api/discord/sync instead.
 */
export async function lazyIncrementalSync(): Promise<void> {
  try {
    const bucket = await getBucket();
    const manifest = await readManifest(bucket);
    if (manifest.syncedAt) {
      const age = Date.now() - new Date(manifest.syncedAt).getTime();
      if (age < LAZY_MIN_INTERVAL_MS) return;
    }
    await runSync({ mode: "incremental" });
  } catch (err) {
    console.error("Drops lazy sync failed:", err);
  }
}
