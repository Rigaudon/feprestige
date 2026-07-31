"use client";

import { useMemo, useState } from "react";

import { formatNumber, formatRole, womPlayerUrl } from "@/wom/format";

import { Pagination } from "./Pagination";

const PAGE_SIZE = 25;

export interface RosterMember {
  username: string;
  displayName: string;
  role: string | null;
  type: string;
  country: string | null;
  exp: number;
  ehp: number;
  ehb: number;
}

type SortKey = "role" | "name" | "exp" | "ehp" | "ehb";

// Rough rank ordering so leaders float to the top on the default "role" sort.
const ROLE_RANK: Record<string, number> = {
  owner: 0,
  deputy_owner: 1,
  administrator: 2,
  moderator: 3,
  leader: 4,
  officer: 5,
};
const roleWeight = (role: string | null) =>
  role && role in ROLE_RANK ? ROLE_RANK[role] : 100;

export function RosterTable({ members }: { members: RosterMember[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("role");
  const [page, setPage] = useState(0);

  // Reset to the first page whenever the filter/sort changes (handled in the
  // event handlers below rather than an effect). `safePage` also clamps if the
  // result set shrinks under the current page.
  const search = (value: string) => {
    setQuery(value);
    setPage(0);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setPage(0);
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? members.filter((m) => m.displayName.toLowerCase().includes(q))
      : members;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.displayName.localeCompare(b.displayName);
        case "exp":
          return b.exp - a.exp;
        case "ehp":
          return b.ehp - a.ehp;
        case "ehb":
          return b.ehb - a.ehb;
        case "role":
        default:
          return (
            roleWeight(a.role) - roleWeight(b.role) ||
            b.exp - a.exp ||
            a.displayName.localeCompare(b.displayName)
          );
      }
    });
    return sorted;
  }, [members, query, sort]);

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search members…"
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-accent"
        />
        <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neutral-500">
          Sort
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value as SortKey)}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white outline-none transition-colors hover:border-accent focus:border-accent"
          >
            <option value="role">Rank</option>
            <option value="name">Name</option>
            <option value="exp">Total XP</option>
            <option value="ehp">EHP</option>
            <option value="ehb">EHB</option>
          </select>
        </label>
        <span className="ml-auto font-mono text-xs uppercase tracking-wider text-neutral-500">
          {rows.length} {rows.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left font-mono text-[11px] uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 text-right font-medium">Total XP</th>
              <th className="px-4 py-3 text-right font-medium">EHP</th>
              <th className="px-4 py-3 text-right font-medium">EHB</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr
                key={m.username}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60"
              >
                <td className="px-4 py-3">
                  <a
                    href={womPlayerUrl(m.username)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display font-semibold text-white transition-colors hover:text-accent-strong"
                  >
                    {m.displayName}
                  </a>
                  {m.type && m.type !== "regular" && m.type !== "unknown" ? (
                    <span className="ml-2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                      {m.type}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  {formatRole(m.role)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                  {formatNumber(m.exp)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                  {m.ehp.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-300">
                  {m.ehb.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
    </div>
  );
}
