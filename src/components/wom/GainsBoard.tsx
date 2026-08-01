"use client";

import { useMemo, useState } from "react";

import { formatNumber, womPlayerUrl } from "@/wom/format";
import type { GainEntry } from "@/wom/leaderboards";
import { type Metric, metricName } from "@/wom/metrics";

import { PlayerTypeIcon } from "./Icon";
import { MetricSelect } from "./MetricSelect";
import { Pagination } from "./Pagination";

type GainsPeriod = "week" | "month";

const PAGE_SIZE = 25;
const PERIODS: { key: GainsPeriod; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const pickDefault = (metrics: Metric[]) =>
  metrics.includes("overall") ? "overall" : metrics[0];

export function GainsBoard({
  leaderboards,
  metrics,
}: {
  leaderboards: Record<GainsPeriod, Record<string, GainEntry[]>>;
  metrics: Record<GainsPeriod, Metric[]>;
}) {
  const [period, setPeriod] = useState<GainsPeriod>(
    metrics.week.length > 0 ? "week" : "month",
  );
  const [metric, setMetric] = useState<Metric>(pickDefault(metrics[period]));
  const [page, setPage] = useState(0);

  const periodMetrics = metrics[period];
  const entries = useMemo(
    () => leaderboards[period][metric] ?? [],
    [leaderboards, period, metric],
  );
  const pageCount = Math.ceil(entries.length / PAGE_SIZE);
  const visible = useMemo(
    () => entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [entries, page],
  );

  const selectMetric = (m: Metric) => {
    setMetric(m);
    setPage(0);
  };

  const selectPeriod = (p: GainsPeriod) => {
    setPeriod(p);
    setPage(0);
    // Keep the current metric if it exists for the new period; else fall back.
    if (!metrics[p].includes(metric)) setMetric(pickDefault(metrics[p]));
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-fg-subtle">
          <span>Metric</span>
          <MetricSelect
            value={metric}
            onChange={selectMetric}
            metrics={periodMetrics}
          />
        </div>

        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => selectPeriod(p.key)}
              className={`px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-all active:scale-95 ${
                period === p.key
                  ? "bg-surface-2 text-fg"
                  : "bg-surface text-fg-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-fg-subtle">
          {entries.length} ranked
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          No {metricName(metric)} gains recorded{" "}
          {period === "week" ? "this week" : "this month"} yet.
        </p>
      ) : (
        <>
          <ol className="overflow-hidden rounded-xl border border-border">
            {visible.map((e, i) => {
              const rank = page * PAGE_SIZE + i + 1;
              return (
                <li
                  key={e.u}
                  className="flex items-center gap-4 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-surface/60"
                >
                  <span
                    className={`w-8 shrink-0 text-center font-display text-sm font-bold tabular-nums ${
                      rank <= 3 ? "text-accent-strong" : "text-fg-subtle"
                    }`}
                  >
                    {rank}
                  </span>
                  <a
                    href={womPlayerUrl(e.u)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate font-display font-semibold text-fg transition-colors hover:text-accent-strong"
                  >
                    {e.n}
                    {e.t ? (
                      <PlayerTypeIcon type={e.t} className="ml-2 align-[-0.1em]" />
                    ) : null}
                  </a>
                  <span className="w-28 text-right font-display font-semibold tabular-nums text-accent-strong">
                    +{formatNumber(e.g)}
                  </span>
                </li>
              );
            })}
          </ol>
          <Pagination page={page} pageCount={pageCount} onPage={setPage} />
        </>
      )}
    </div>
  );
}
