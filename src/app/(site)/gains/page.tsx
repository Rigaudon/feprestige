import type { Metadata } from "next";

import { GainsBoard } from "@/components/wom/GainsBoard";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import {
  availableMetrics,
  buildGainLeaderboards,
} from "@/wom/leaderboards";
import { getBulkGroupGains } from "@/wom/queries";
import { getWomGroupId } from "@/wom/settings";

export const metadata: Metadata = {
  title: "Gains",
  description: "Top clan gainers this week and month, powered by Wise Old Man.",
};

export default async function GainsPage() {
  const groupId = await getWomGroupId();

  if (!groupId) {
    return (
      <>
        <WomHeader eyebrow="Leaderboards" title="Gains" />
        <WomEmptyState
          title="Gains not configured"
          message="Add your Wise Old Man group ID in Site Settings to show top gainers here."
        />
      </>
    );
  }

  // Two calls (week + month) so the client can toggle period with no extra
  // fetch. Both are pre-sorted into bounded top-N leaderboards per metric.
  const [week, month] = await Promise.all([
    getBulkGroupGains(groupId, "week"),
    getBulkGroupGains(groupId, "month"),
  ]);

  const leaderboards = {
    week: buildGainLeaderboards(week),
    month: buildGainLeaderboards(month),
  };
  const metrics = {
    week: availableMetrics(leaderboards.week),
    month: availableMetrics(leaderboards.month),
  };
  const hasAny = metrics.week.length > 0 || metrics.month.length > 0;

  return (
    <>
      <WomHeader
        eyebrow="Leaderboards"
        title="Top Gainers"
        subtitle="Who's grinding hardest — XP, boss KC and more, this week and this month."
      />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {!hasAny ? (
          <WomEmptyState
            title="No gains yet"
            message="No tracked gains are available, or Wise Old Man couldn't be reached. Check back soon."
          />
        ) : (
          <GainsBoard leaderboards={leaderboards} metrics={metrics} />
        )}
      </div>
    </>
  );
}
