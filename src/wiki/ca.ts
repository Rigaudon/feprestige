// Pure Combat Achievement maths — no I/O, so it runs identically in the ingest
// worker and in the page render.
//
// The ONLY hard-coded knowledge here is the six tier names and their
// points-per-task. Everything else — how many tasks a tier has, how many points
// it is worth, and the point thresholds that unlock its rewards — is DERIVED
// from the live task table fetched off the wiki (see client.ts), because Jagex
// adds and retunes CAs regularly and any baked-in count would silently rot.
//
// Threshold rule, per the wiki's own Module:Globals/data: a tier's reward
// threshold is the cumulative point pool of that tier AND every lower tier, so
// Grandmaster's threshold is simply every CA point in the game.

export const CA_TIERS = [
  "Easy",
  "Medium",
  "Hard",
  "Elite",
  "Master",
  "Grandmaster",
] as const;

export type CaTier = (typeof CA_TIERS)[number];

// Fixed by the game: an easy task is worth 1 point, a grandmaster task 6.
export const CA_TIER_POINTS = [1, 2, 3, 4, 5, 6] as const;

/**
 * The live task table, packed as one character per task id: the character at
 * index `id` is that task's tier index ("0" = Easy … "5" = Grandmaster), and
 * any other character means "not in the table" (a removed id, or one released
 * after we last fetched). The id space is dense, so a string is both the
 * smallest thing we can put in the manifest and the fastest lookup.
 */
export type CaTierTable = string;

// Sentinel for an id the table doesn't describe. Chosen so the charCode maths
// in `tierOf` lands outside 0..5 without a special case.
export const CA_UNKNOWN_TIER = "-";

const ZERO = "0".charCodeAt(0);

function tierOf(tiers: CaTierTable, id: number): number {
  if (id < 0 || id >= tiers.length) return -1;
  const tier = tiers.charCodeAt(id) - ZERO;
  return tier >= 0 && tier < CA_TIERS.length ? tier : -1;
}

export interface CaTotals {
  taskCounts: number[]; // tasks in each tier
  tierPoints: number[]; // points available within each tier
  thresholds: number[]; // cumulative — the reward threshold for each tier
  totalTasks: number;
  totalPoints: number;
}

/** Derive every denominator the UI needs from the live task table. */
export function deriveTotals(tiers: CaTierTable): CaTotals {
  const taskCounts = CA_TIERS.map(() => 0);
  let totalTasks = 0;
  for (let id = 0; id < tiers.length; id++) {
    const tier = tierOf(tiers, id);
    if (tier < 0) continue; // gap in the table — not a real task
    taskCounts[tier]++;
    totalTasks++;
  }

  const tierPoints = taskCounts.map((n, i) => n * CA_TIER_POINTS[i]);
  const thresholds: number[] = [];
  let running = 0;
  for (const points of tierPoints) {
    running += points;
    thresholds.push(running);
  }

  return { taskCounts, tierPoints, thresholds, totalTasks, totalPoints: running };
}

/**
 * Index of the highest tier whose reward threshold `points` meets, or -1 if the
 * player hasn't reached the easy threshold yet.
 */
export function tierUnlocked(points: number, thresholds: number[]): number {
  let unlocked = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (points >= thresholds[i]) unlocked = i;
  }
  return unlocked;
}

export interface CaScore {
  counts: number[]; // completed tasks per tier
  done: number; // completed tasks overall
  points: number;
  unknown: number; // completed ids the table doesn't describe (see below)
}

/**
 * Score a player's completed task ids against a task table.
 *
 * Ids the table doesn't know about still count towards `done` but can't be
 * assigned a tier or a point value — that happens only in the window between a
 * CA release and our next table refresh, and is reconciled automatically on the
 * next cycle (or immediately via the sync route's `rescore` mode).
 */
export function scoreTasks(
  ids: readonly number[],
  tiers: CaTierTable,
): CaScore {
  const counts = CA_TIERS.map(() => 0);
  let points = 0;
  let unknown = 0;

  for (const id of ids) {
    const tier = tierOf(tiers, id);
    if (tier < 0) {
      unknown++;
      continue;
    }
    counts[tier]++;
    points += CA_TIER_POINTS[tier];
  }

  return { counts, done: ids.length, points, unknown };
}

/**
 * Pack completed task ids into a base64 bitmap (~110 chars for today's 655
 * tasks). Storing this alongside the derived counts means a CA release can be
 * absorbed by recomputing from what we already have, instead of re-hitting the
 * sync API once per member.
 */
export function encodeCompleted(ids: readonly number[]): string {
  let max = -1;
  for (const id of ids) {
    if (id > max) max = id;
  }
  if (max < 0) return "";

  const bytes = new Uint8Array((max >> 3) + 1);
  for (const id of ids) {
    if (id < 0) continue;
    bytes[id >> 3] |= 1 << (id & 7);
  }

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Inverse of `encodeCompleted`. The bitmap is self-describing — no length needed. */
export function decodeCompleted(packed: string): number[] {
  if (!packed) return [];

  const binary = atob(packed);
  const ids: number[] = [];
  for (let i = 0; i < binary.length; i++) {
    const byte = binary.charCodeAt(i);
    if (byte === 0) continue;
    for (let bit = 0; bit < 8; bit++) {
      if (byte & (1 << bit)) ids.push(i * 8 + bit);
    }
  }
  return ids;
}
