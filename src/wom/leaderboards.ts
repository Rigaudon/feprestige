// Server-side leaderboard shaping. Rather than shipping every member × every
// metric with full snapshot data and sorting client-side, we pre-sort at
// build/revalidate time into a compact { metric -> ranked entries } map. Every
// ranked member is included (the whole clan appears, paginated in the browser);
// the short-keyed LeaderEntry/GainEntry shapes keep the payload small.

import { ALL_METRICS, METRIC_PROPS, type Metric } from "./metrics";
import { snapshotLevel, snapshotValue } from "./queries";
import type { BulkGainsEntry, BulkHiscoresEntry } from "./types";

// Compact leaderboard entry (short keys to keep the serialized payload small).
export interface LeaderEntry {
  n: string; // displayName
  u: string; // username (for the WOM profile link)
  t?: string; // account type, only when notable (ironman variants)
  v: number; // value (exp / kills / score / computed)
  l?: number; // level (skills only)
}

export interface GainEntry {
  n: string;
  u: string;
  t?: string; // account type, only when notable (ironman variants)
  g: number; // gained
}

function notableType(type: string): string | undefined {
  return type && type !== "regular" && type !== "unknown" ? type : undefined;
}

// Build a { metric -> sorted entries } map from bulk hiscores, keeping every
// ranked member. Only metrics with at least one ranked member are included.
export function buildHiscoreLeaderboards(
  entries: BulkHiscoresEntry[],
): Record<string, LeaderEntry[]> {
  const out: Record<string, LeaderEntry[]> = {};

  for (const metric of ALL_METRICS) {
    const ranked = entries
      .map((e) => ({ e, v: snapshotValue(e.data.data, metric) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v);

    if (ranked.length === 0) continue;

    out[metric] = ranked.map(({ e, v }) => {
      const entry: LeaderEntry = {
        n: e.player.displayName,
        u: e.player.username,
        v,
      };
      const t = notableType(e.player.type);
      if (t) entry.t = t;
      if (METRIC_PROPS[metric].type === "skill") {
        const l = snapshotLevel(e.data.data, metric);
        if (l !== undefined) entry.l = l;
      }
      return entry;
    });
  }

  return out;
}

// Build a { metric -> gainers } map from bulk gains for one period, keeping
// every member with a positive gain.
export function buildGainLeaderboards(
  entries: BulkGainsEntry[],
): Record<string, GainEntry[]> {
  // Index each member's positive gains once (metric -> gained) so the per-metric
  // pass below is O(1) lookups rather than a linear scan of all 113 metrics.
  const indexed = entries.map((e) => {
    const gains = new Map<string, number>();
    for (const d of e.data) if (d.gained > 0) gains.set(d.metric, d.gained);
    return { player: e.player, gains };
  });

  const typeOf = (player: BulkGainsEntry["player"]) => notableType(player.type);

  const out: Record<string, GainEntry[]> = {};

  for (const metric of ALL_METRICS) {
    const ranked = indexed
      .map(({ player, gains }) => ({ player, g: gains.get(metric) ?? 0 }))
      .filter((x) => x.g > 0)
      .sort((a, b) => b.g - a.g);

    if (ranked.length === 0) continue;

    out[metric] = ranked.map(({ player, g }) => {
      const entry: GainEntry = {
        n: player.displayName,
        u: player.username,
        g,
      };
      const t = typeOf(player);
      if (t) entry.t = t;
      return entry;
    });
  }

  return out;
}

// The metrics that actually have entries, in canonical order — for building the
// selector so it only offers metrics this clan is ranked in.
export function availableMetrics(
  leaderboards: Record<string, unknown>,
): Metric[] {
  return ALL_METRICS.filter((m) => m in leaderboards);
}
