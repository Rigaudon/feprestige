import type { Metadata } from "next";

import {
  CombatAchievementsBoard,
  type CaRow,
} from "@/components/wiki/CombatAchievementsBoard";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import { deriveTotals } from "@/wiki/ca";
import { readWikiManifestCached } from "@/wiki/client";
import { getWomPageSettings } from "@/wom/settings";

export const metadata: Metadata = {
  title: "Combat Achievements",
  description:
    "Clan combat achievement leaderboard — points, tier unlocked and per-tier completion.",
};

export default async function CombatAchievementsPage() {
  const { groupId, header } = await getWomPageSettings("combat");

  // Editor-controlled headings from Site Settings, falling back to defaults.
  const eyebrow = header.eyebrow ?? "Leaderboards";
  const title = header.title ?? "Combat Achievements";
  const subtitle =
    header.subtitle ??
    "Who's furthest through the CA grind. Points, tier unlocked and task counts for every member who's synced with the OSRS Wiki.";

  if (!groupId) {
    return (
      <>
        <WomHeader eyebrow={eyebrow} title={title} />
        <WomEmptyState
          title="Combat Achievements not configured"
          message="Add your Wise Old Man group ID in Site Settings — it's the member list this leaderboard is built from."
        />
      </>
    );
  }

  const manifest = await readWikiManifestCached();

  // Every denominator is derived from the task table captured with the data, so
  // a new CA release moves the totals without a code change.
  const totals = manifest.ca ? deriveTotals(manifest.ca.tiers) : null;

  // `players` only ever contains members the wiki had data for, so members who
  // have never used the Wiki Sync plugin simply don't appear.
  const rows: CaRow[] = Object.values(manifest.players)
    .map((entry) => ({
      name: entry.n,
      tiers: entry.t,
      done: entry.d,
      points: entry.p,
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  // Formatted server-side: the page is prerendered, so formatting in the client
  // component would risk a hydration mismatch.
  const updatedLabel = manifest.syncedAt
    ? new Date(manifest.syncedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  return (
    <>
      <WomHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {!totals || rows.length === 0 ? (
          <WomEmptyState
            title="No combat achievements yet"
            message="Nobody's combat achievement data has been collected yet, or the OSRS Wiki couldn't be reached. Check back soon."
          />
        ) : (
          <CombatAchievementsBoard
            rows={rows}
            totals={totals}
            updatedLabel={updatedLabel}
          />
        )}
      </div>
    </>
  );
}
