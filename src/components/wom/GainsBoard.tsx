"use client";

import { useMemo, useState } from "react";

import { formatNumber, womPlayerUrl } from "@/wom/format";
import { type Metric, metricName } from "@/wom/metrics";

import { MetricSelect } from "./MetricSelect";

type GainsPeriod = "week" | "month";

export interface GainsRow {
  username: string;
  displayName: string;
  // period -> (metric key -> gained). Missing = 0 gained.
  gains: Record<GainsPeriod, Record<string, number>>;
}

const PERIODS: { key: GainsPeriod; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export function GainsBoard({ rows }: { rows: GainsRow[] }) {
  const [metric, setMetric] = useState<Metric>("overall");
  const [period, setPeriod] = useState<GainsPeriod>("week");

  const ranked = useMemo(() => {
    return rows
      .map((r) => ({ row: r, gained: r.gains[period]?.[metric] ?? 0 }))
      .filter((x) => x.gained > 0)
      .sort((a, b) => b.gained - a.gained);
  }, [rows, metric, period]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Metric
          <MetricSelect value={metric} onChange={setMetric} />
        </label>

        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                period === p.key
                  ? "bg-surface-2 text-white"
                  : "bg-surface text-neutral-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-neutral-500">
          {ranked.length} gaining
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-neutral-400">
          No {metricName(metric)} gains recorded{" "}
          {period === "week" ? "this week" : "this month"} yet.
        </p>
      ) : (
        <ol className="overflow-hidden rounded-xl border border-border">
          {ranked.map(({ row, gained }, i) => (
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
              <span className="w-28 text-right font-display font-semibold tabular-nums text-accent-strong">
                +{formatNumber(gained)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
