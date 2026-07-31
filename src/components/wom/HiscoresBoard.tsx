"use client";

import { useMemo, useState } from "react";

import { formatMetricValue, womPlayerUrl } from "@/wom/format";
import type { LeaderEntry } from "@/wom/leaderboards";
import { type Metric, METRIC_PROPS, metricName } from "@/wom/metrics";

import { MetricSelect } from "./MetricSelect";
import { Pagination } from "./Pagination";

const PAGE_SIZE = 25;

export function HiscoresBoard({
  leaderboards,
  metrics,
}: {
  leaderboards: Record<string, LeaderEntry[]>;
  metrics: Metric[];
}) {
  // Default to Overall when present, else the first available metric.
  const initial = metrics.includes("overall") ? "overall" : metrics[0];
  const [metric, setMetric] = useState<Metric>(initial);
  const [page, setPage] = useState(0);

  const entries = useMemo(
    () => leaderboards[metric] ?? [],
    [leaderboards, metric],
  );
  const pageCount = Math.ceil(entries.length / PAGE_SIZE);
  const visible = useMemo(
    () => entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [entries, page],
  );

  const isSkill = METRIC_PROPS[metric]?.type === "skill";

  const selectMetric = (m: Metric) => {
    setMetric(m);
    setPage(0);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Metric
          <MetricSelect value={metric} onChange={selectMetric} metrics={metrics} />
        </label>
        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-neutral-500">
          Top {entries.length}
        </span>
      </div>

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
                  rank <= 3 ? "text-accent-strong" : "text-neutral-500"
                }`}
              >
                {rank}
              </span>
              <a
                href={womPlayerUrl(e.u)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate font-display font-semibold text-white transition-colors hover:text-accent-strong"
              >
                {e.n}
                {e.t ? (
                  <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    {e.t}
                  </span>
                ) : null}
              </a>
              {isSkill && e.l !== undefined ? (
                <span className="hidden w-16 text-right font-mono text-xs uppercase tracking-wider text-neutral-500 sm:block">
                  Lv {e.l}
                </span>
              ) : null}
              <span className="w-28 text-right font-display font-semibold tabular-nums text-neutral-200">
                {formatMetricValue(metric, e.v)}
              </span>
            </li>
          );
        })}
      </ol>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-neutral-400">
          No members are ranked in {metricName(metric)} yet.
        </p>
      ) : null}

      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
    </div>
  );
}
