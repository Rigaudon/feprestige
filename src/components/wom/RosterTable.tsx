"use client";

import { useMemo, useState } from "react";

import { formatNumber, formatRole, womPlayerUrl } from "@/wom/format";

import { GroupRoleIcon, PlayerTypeIcon } from "./Icon";
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

// FE Prestige's clan rank hierarchy, highest → lowest. OSRS clan rank titles
// are cosmetic and each clan slots them into its own order, which the WOM API
// doesn't expose — so the hierarchy has to be defined here from the clan's own
// ranking. Admins (owner/deputy/moderator) sit on top; any role not listed
// shares the fallback weight and just sorts by XP among the rest.
const ROLE_ORDER = [
  "owner",
  "deputy_owner",
  "moderator",
  "beast",
  "skulled",
  "maxed",
  "tzkal",
  "gamer",
  "elite",
  "raider",
  "completionist",
  "explorer",
  "athlete",
  "adventurer",
] as const;
const ROLE_RANK: Record<string, number> = Object.fromEntries(
  ROLE_ORDER.map((role, i) => [role, i]),
);
const roleWeight = (role: string | null) =>
  role && role in ROLE_RANK ? ROLE_RANK[role] : ROLE_ORDER.length;

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
                  <PlayerTypeIcon type={m.type} className="ml-2 align-[-0.1em]" />
                </td>
                <td className="px-4 py-3 text-neutral-300">
                  <span className="flex items-center gap-2">
                    <GroupRoleIcon role={m.role} />
                    {formatRole(m.role)}
                  </span>
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
