// Server-side clients for the OSRS wiki integration.
//
// - `fetchCaTierTable` / `fetchPlayerCa` are ingest calls. They THROW on
//   unexpected failure so the sync route can report and stop — a broken ingest
//   should be loud rather than quietly writing wrong numbers.
// - `readWikiManifestCached` is the page's read, and is build-resilient
//   (returns an empty manifest on any error) exactly like `readManifestCached`
//   in src/discord/client.ts.

import {
  CA_TIERS,
  CA_UNKNOWN_TIER,
  type CaTierTable,
} from "./ca";
import {
  WIKI_API_BASE,
  WIKI_SYNC_BASE,
  WIKI_TAG,
  wikiManifestUrl,
} from "./env";
import { EMPTY_WIKI_MANIFEST, type WikiManifest } from "./types";

// Courtesy identifier, like the WOM user agent — not a secret. The sync backend
// rejects requests without a User-Agent outright (403).
const USER_AGENT = "FE Prestige clan site (github.com/feprestige)";

// The wiki stores combat achievements as structured data in its `Bucket`
// extension; this is the same query its own Module:Combat Achievements runs, cut
// down to the two columns we need. One request returns every task.
const CA_BUCKET_QUERY =
  'bucket("combat_achievement").select("id","tier").limit(5000).run()';

// A sanity floor. The real table is in the high hundreds, so anything this small
// means the wiki returned something unexpected and we'd be shrinking every
// denominator on the page if we trusted it.
const MIN_PLAUSIBLE_TASKS = 100;

interface BucketRow {
  id: number;
  tier: string;
}

const TIER_INDEX = new Map(
  CA_TIERS.map((tier, i) => [tier.toLowerCase(), i] as const),
);

/**
 * Fetch the live combat achievement task table and pack it into a `CaTierTable`
 * (one character per task id — see ca.ts). Throws rather than returning a short
 * table, because a short table silently understates everyone's progress.
 */
export async function fetchCaTierTable(): Promise<CaTierTable> {
  const url = `${WIKI_API_BASE}?action=bucket&format=json&query=${encodeURIComponent(
    CA_BUCKET_QUERY,
  )}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Wiki bucket query failed: HTTP ${res.status}`);
  }

  const body = (await res.json()) as { bucket?: BucketRow[] };
  const rows = body.bucket;
  if (!Array.isArray(rows) || rows.length < MIN_PLAUSIBLE_TASKS) {
    throw new Error(
      `Wiki bucket query returned ${rows?.length ?? "no"} combat achievement rows`,
    );
  }

  let maxId = -1;
  for (const row of rows) {
    if (typeof row.id === "number" && row.id > maxId) maxId = row.id;
  }

  // Ids are dense in practice; any hole stays as the unknown sentinel so it is
  // excluded from the totals rather than miscounted as an easy task.
  const table = new Array<string>(maxId + 1).fill(CA_UNKNOWN_TIER);
  for (const row of rows) {
    const tier = TIER_INDEX.get(String(row.tier).toLowerCase());
    if (tier === undefined || typeof row.id !== "number" || row.id < 0) continue;
    table[row.id] = String(tier);
  }

  return table.join("");
}

/**
 * A player's completed combat achievement task ids, or `null` when they have
 * never synced (the API answers `400 NO_USER_DATA` for those — 45 of our 300
 * members at time of writing, which is normal, not an error).
 *
 * Retries once on 429. The backend rate-limits bursts but is happy with the
 * paced, sequential calls the ingest makes; this is belt-and-braces.
 */
export async function fetchPlayerCa(
  username: string,
): Promise<number[] | null> {
  const url = `${WIKI_SYNC_BASE}/${encodeURIComponent(username)}/STANDARD`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      cache: "no-store",
    });

    if (res.status === 429) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw new Error(`Wiki sync rate-limited for ${username}`);
    }
    // No synced data for this player. Not an error — just nothing to show.
    if (res.status === 400) return null;
    if (!res.ok) {
      throw new Error(`Wiki sync HTTP ${res.status} for ${username}`);
    }

    const body = (await res.json()) as { combat_achievements?: unknown };
    const ids = body.combat_achievements;
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is number => typeof id === "number");
  }

  throw new Error(`Wiki sync repeatedly rate-limited for ${username}`);
}

/**
 * Build-resilient manifest read for the Combat Achievements page. Uses the
 * Next.js Data Cache (tagged + 1h revalidate) like `womFetch`, and falls back to
 * an empty manifest so the page always renders — including during a local build
 * behind the corporate proxy, where outbound fetches time out.
 */
export async function readWikiManifestCached(): Promise<WikiManifest> {
  try {
    const res = await fetch(wikiManifestUrl, {
      next: { tags: [WIKI_TAG], revalidate: 3600 },
    });
    if (!res.ok) return EMPTY_WIKI_MANIFEST;
    return {
      ...EMPTY_WIKI_MANIFEST,
      ...((await res.json()) as Partial<WikiManifest>),
    };
  } catch {
    return EMPTY_WIKI_MANIFEST;
  }
}
