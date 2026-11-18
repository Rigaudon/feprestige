// Server-side leaderboard shaping. Rather than shipping every member × every
// metric with full snapshot data and sorting client-side, we pre-sort at
// build/revalidate time into a compact { metric -> ranked entries } map. Every
// ranked member is included (the whole clan appears, paginated in the browser);
// the short-keyed LeaderEntry/GainEntry shapes keep the payload small.
//
// The set of metrics comes from the payload itself, not from the METRIC_PROPS
// catalog, so when WOM adds a boss/raid it appears on the next revalidate with no
// code change. The catalog only supplies nicer display names.

import {
  METRIC_PROPS,
  type Metric,
  type MetricOption,
  type MetricType,
  metricName,
} from "./metrics";
import { CATEGORY_BY_TYPE, entryValue } from "./queries";
import type { BulkGainsEntry, BulkHiscoresEntry } from "./types";

const TYPES = Object.keys(CATEGORY_BY_TYPE) as MetricType[];

// Leaderboards keyed by metric, plus the picker options for the metrics that
// have at least one entry, in WOM's canonical order (skills, bosses, …).
export interface Leaderboards<E> {
  boards: Record<Metric, E[]>;
  metrics: MetricOption[];
}

const option = (id: Metric, type: MetricType): MetricOption => ({
  id,
  name: metricName(id),
  type,
});

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
// ranked member. A metric's type is the snapshot bucket it's filed under.
export function buildHiscoreLeaderboards(
  entries: BulkHiscoresEntry[],
): Leaderboards<LeaderEntry> {
  const boards: Record<Metric, LeaderEntry[]> = {};
  const metrics: MetricOption[] = [];

  for (const type of TYPES) {
    const category = CATEGORY_BY_TYPE[type];
    // Union of keys across members (insertion-ordered, so WOM's order holds).
    const keys = new Set<Metric>();
    for (const e of entries) {
      for (const k of Object.keys(e.data.data[category] ?? {})) keys.add(k);
    }

    for (const metric of keys) {
      const ranked = entries
        .map((e) => ({ e, s: e.data.data[category]?.[metric] }))
        .map(({ e, s }) => ({ e, s, v: entryValue(s, type) }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v);

      if (ranked.length === 0) continue;

      metrics.push(option(metric, type));
      boards[metric] = ranked.map(({ e, s, v }) => {
        const entry: LeaderEntry = {
          n: e.player.displayName,
          u: e.player.username,
          v,
        };
        const t = notableType(e.player.type);
        if (t) entry.t = t;
        if (type === "skill" && s?.level !== undefined) entry.l = s.level;
        return entry;
      });
    }
  }

  return { boards, metrics };
}

// Build a { metric -> gainers } map from bulk gains for one period, keeping
// every member with a positive gain.
export function buildGainLeaderboards(
  entries: BulkGainsEntry[],
): Leaderboards<GainEntry> {
  // Index each member's positive gains once (metric -> gained) so the per-metric
  // pass below is O(1) lookups rather than a linear scan of every metric.
  const indexed = entries.map((e) => {
    const gains = new Map<string, number>();
    for (const d of e.data) if (d.gained > 0) gains.set(d.metric, d.gained);
    return { player: e.player, gains };
  });

  const typeOf = (player: BulkGainsEntry["player"]) => notableType(player.type);

  // Gains rows carry no type, so take it from the catalog. For a metric the
  // catalog doesn't know yet, inherit the type of the metric before it: WOM lists
  // metrics grouped by type, and new ones land inside their group (e.g.
  // the_fractured_archive sits between two gauntlets, so it's a boss).
  const order: { metric: Metric; type: MetricType }[] = [];
  const seen = new Set<Metric>();
  for (const e of entries) {
    for (const { metric } of e.data) {
      if (seen.has(metric)) continue;
      seen.add(metric);
      const prev = order[order.length - 1]?.type ?? "skill";
      order.push({ metric, type: METRIC_PROPS[metric]?.type ?? prev });
    }
  }

  const boards: Record<Metric, GainEntry[]> = {};
  const metrics: MetricOption[] = [];

  for (const { metric, type } of order) {
    const ranked = indexed
      .map(({ player, gains }) => ({ player, g: gains.get(metric) ?? 0 }))
      .filter((x) => x.g > 0)
      .sort((a, b) => b.g - a.g);

    if (ranked.length === 0) continue;

    metrics.push(option(metric, type));
    boards[metric] = ranked.map(({ player, g }) => {
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

  return { boards, metrics };
}
