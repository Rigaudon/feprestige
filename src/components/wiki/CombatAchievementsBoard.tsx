"use client";

import { useMemo, useState } from "react";

import { CA_TIERS, tierUnlocked, type CaTotals } from "@/wiki/ca";
import { formatNumber, womPlayerUrl } from "@/wom/format";

import { Pagination } from "../wom/Pagination";

const PAGE_SIZE = 25;

// Abbreviated tier labels for the per-tier columns, which are narrow.
const SHORT_TIERS = ["Easy", "Med", "Hard", "Elite", "Mast", "GM"] as const;

export interface CaRow {
  name: string;
  tiers: number[]; // completed per tier, indexed like CA_TIERS
  done: number;
  points: number;
}

// "all" sorts by points; a number sorts by that tier's completions.
type SortKey = "all" | number;

export function CombatAchievementsBoard({
  rows,
  totals,
  updatedLabel,
}: {
  rows: CaRow[];
  totals: CaTotals;
  updatedLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("all");
  const [page, setPage] = useState(0);

  // Reset to the first page whenever the filter/sort changes (in the handlers
  // rather than an effect); `safePage` also clamps if the result set shrinks.
  const search = (value: string) => {
    setQuery(value);
    setPage(0);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setPage(0);
  };

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : rows;

    return [...filtered].sort((a, b) => {
      if (typeof sort === "number") {
        const diff = (b.tiers[sort] ?? 0) - (a.tiers[sort] ?? 0);
        if (diff !== 0) return diff;
      }
      return b.points - a.points || a.name.localeCompare(b.name);
    });
  }, [rows, query, sort]);

  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = sorted.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggle = (active: boolean) =>
    `px-3 py-2 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      active ? "bg-surface-2 text-fg" : "bg-surface text-fg-muted hover:text-fg"
    }`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search members…"
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-accent"
        />
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            className={toggle(sort === "all")}
            onClick={() => changeSort("all")}
          >
            Points
          </button>
          {CA_TIERS.map((tier, i) => (
            <button
              key={tier}
              type="button"
              className={toggle(sort === i)}
              onClick={() => changeSort(i)}
            >
              {SHORT_TIERS[i]}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-fg-subtle">
          {sorted.length} {sorted.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
              <th className="w-12 px-4 py-3 text-center font-medium">#</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 text-right font-medium">
                Points <span className="text-fg-subtle/60">/{totals.totalPoints}</span>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Tasks <span className="text-fg-subtle/60">/{totals.totalTasks}</span>
              </th>
              {CA_TIERS.map((tier, i) => (
                <th
                  key={tier}
                  className={`hidden px-4 py-3 text-right font-medium lg:table-cell ${
                    sort === i ? "text-accent-strong" : ""
                  }`}
                >
                  {SHORT_TIERS[i]}{" "}
                  <span className="text-fg-subtle/60">/{totals.taskCounts[i]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const rank = safePage * PAGE_SIZE + i + 1;
              const unlocked = tierUnlocked(row.points, totals.thresholds);
              return (
                <tr
                  key={row.name}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60"
                >
                  <td
                    className={`px-4 py-3 text-center font-display text-sm font-bold tabular-nums ${
                      rank <= 3 ? "text-accent-strong" : "text-fg-subtle"
                    }`}
                  >
                    {rank}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={womPlayerUrl(row.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-display font-semibold text-fg transition-colors hover:text-accent-strong"
                    >
                      {row.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {unlocked < 0 ? "—" : CA_TIERS[unlocked]}
                  </td>
                  <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-fg">
                    {formatNumber(row.points, false)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg-muted">
                    {formatNumber(row.done, false)}
                  </td>
                  {CA_TIERS.map((tier, t) => (
                    <td
                      key={tier}
                      className={`hidden px-4 py-3 text-right tabular-nums lg:table-cell ${
                        sort === t ? "text-fg" : "text-fg-muted"
                      }`}
                    >
                      {row.tiers[t] ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
        Synced from the OSRS Wiki
        {updatedLabel ? ` · updated ${updatedLabel}` : ""}
      </p>

      <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
    </div>
  );
}
