// Server-side leaderboard shaping. Instead of shipping every member × every
// metric to the browser (huge — ~1.2 MB for a large clan) and sorting client-
// side, we pre-sort at build/revalidate time and ship only a bounded top-N per
// metric. This shrinks the payload and moves the work off the request path.

import { ALL_METRICS, METRIC_PROPS, type Metric } from "./metrics";
import { snapshotLevel, snapshotValue } from "./queries";
import type { BulkGainsEntry, BulkHiscoresEntry } from "./types";

// How many ranked players to keep per metric. A leaderboard rarely needs more;
// keeps the shipped payload bounded regardless of clan size.
export const LEADERBOARD_SIZE = 50;

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

// Build a { metric -> top-N sorted entries } map from bulk hiscores. Only metrics
// with at least one ranked member are included.
export function buildHiscoreLeaderboards(
  entries: BulkHiscoresEntry[],
): Record<string, LeaderEntry[]> {
  const out: Record<string, LeaderEntry[]> = {};

  for (const metric of ALL_METRICS) {
    const ranked = entries
      .map((e) => ({ e, v: snapshotValue(e.data.data, metric) }))
      .filter((x) => x.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, LEADERBOARD_SIZE);

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

// Build a { metric -> top-N gainers } map from bulk gains for one period.
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
      .sort((a, b) => b.g - a.g)
      .slice(0, LEADERBOARD_SIZE);

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
