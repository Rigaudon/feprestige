import type { Metadata } from "next";

import { HiscoresBoard } from "@/components/wom/HiscoresBoard";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import {
  availableMetrics,
  buildHiscoreLeaderboards,
} from "@/wom/leaderboards";
import { getGroupBulkHiscores } from "@/wom/queries";
import { getWomPageSettings } from "@/wom/settings";

export const metadata: Metadata = {
  title: "Hiscores",
  description: "Clan hiscores across every skill, boss and activity.",
};

export default async function HiscoresPage() {
  const { groupId, header } = await getWomPageSettings("hiscores");

  // Editor-controlled headings from Site Settings, falling back to defaults.
  const eyebrow = header.eyebrow ?? "Leaderboards";
  const title = header.title ?? "Hiscores";
  const subtitle =
    header.subtitle ??
    "Where members rank across every skill, boss and activity. Pick a metric to see the top of the clan.";

  if (!groupId) {
    return (
      <>
        <WomHeader eyebrow={eyebrow} title={title} />
        <WomEmptyState
          title="Hiscores not configured"
          message="Add your Wise Old Man group ID in Site Settings to show clan hiscores here."
        />
      </>
    );
  }

  const entries = await getGroupBulkHiscores(groupId);

  // Pre-sort into bounded top-N leaderboards per metric at build/revalidate time
  // (see leaderboards.ts) so the browser gets a small, ready-to-render payload.
  const leaderboards = buildHiscoreLeaderboards(entries);
  const metrics = availableMetrics(leaderboards);

  return (
    <>
      <WomHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {metrics.length === 0 ? (
          <WomEmptyState
            title="No hiscores yet"
            message="No member stats are available, or Wise Old Man couldn't be reached. Check back soon."
          />
        ) : (
          <HiscoresBoard leaderboards={leaderboards} metrics={metrics} />
        )}
      </div>
    </>
  );
}
