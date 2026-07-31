"use client";

import { useMemo, useState } from "react";

import { formatMetricValue, womPlayerUrl } from "@/wom/format";
import { METRIC_PROPS, type Metric, metricName } from "@/wom/metrics";

import { MetricSelect } from "./MetricSelect";

// Per-member value for a single metric: value, rank, and (skills only) level.
export interface MetricStat {
  v: number;
  l?: number;
}
export interface HiscoresRow {
  username: string;
  displayName: string;
  type: string;
  // metric key -> stat. Only positive values are meaningful; missing/-1 = unranked.
  values: Record<string, MetricStat>;
}

export function HiscoresBoard({ rows }: { rows: HiscoresRow[] }) {
  const [metric, setMetric] = useState<Metric>("overall");

  const ranked = useMemo(() => {
    return rows
      .map((r) => ({ row: r, stat: r.values[metric] }))
      .filter((x) => x.stat && x.stat.v > 0)
      .sort((a, b) => b.stat.v - a.stat.v);
  }, [rows, metric]);

  const isSkill = METRIC_PROPS[metric]?.type === "skill";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Metric
          <MetricSelect value={metric} onChange={setMetric} />
        </label>
        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-neutral-500">
          {ranked.length} ranked
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-neutral-400">
          No members are ranked in {metricName(metric)} yet.
        </p>
      ) : (
        <ol className="overflow-hidden rounded-xl border border-border">
          {ranked.map(({ row, stat }, i) => (
            <li
              key={row.username}
              className="flex items-center gap-4 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-surface/60"
            >
              <span
                className={`w-8 shrink-0 text-center font-display text-sm font-bold tabular-nums ${
                  i < 3 ? "text-accent-strong" : "text-neutral-500"
                }`}
              >
                {i + 1}
              </span>
              <a
                href={womPlayerUrl(row.username)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-display font-semibold text-white transition-colors hover:text-accent-strong"
              >
                {row.displayName}
              </a>
              {isSkill && stat.l !== undefined ? (
                <span className="hidden w-16 text-right font-mono text-xs uppercase tracking-wider text-neutral-500 sm:block">
                  Lv {stat.l}
                </span>
              ) : null}
              <span className="w-28 text-right font-display font-semibold tabular-nums text-neutral-200">
                {formatMetricValue(metric, stat.v)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
