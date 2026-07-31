import type { Metadata } from "next";

import { GainsBoard, type GainsRow } from "@/components/wom/GainsBoard";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import { getBulkGroupGains } from "@/wom/queries";
import { getWomGroupId } from "@/wom/settings";
import type { BulkGainsEntry } from "@/wom/types";

export const metadata: Metadata = {
  title: "Gains",
  description: "Top clan gainers this week and month, powered by Wise Old Man.",
};

// Reduce a bulk-gains response into a per-member { metric -> gained } map.
function gainedByMetric(entry: BulkGainsEntry): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of entry.data) {
    if (d.gained > 0) out[d.metric] = d.gained;
  }
  return out;
}

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
  // fetch. All at build/revalidate time.
  const [week, month] = await Promise.all([
    getBulkGroupGains(groupId, "week"),
    getBulkGroupGains(groupId, "month"),
  ]);

  // Merge both periods keyed by username. A member may appear in either list.
  const byUser = new Map<string, GainsRow>();
  const ensure = (username: string, displayName: string): GainsRow => {
    let row = byUser.get(username);
    if (!row) {
      row = { username, displayName, gains: { week: {}, month: {} } };
      byUser.set(username, row);
    }
    return row;
  };
  for (const e of week) {
    ensure(e.player.username, e.player.displayName).gains.week =
      gainedByMetric(e);
  }
  for (const e of month) {
    ensure(e.player.username, e.player.displayName).gains.month =
      gainedByMetric(e);
  }
  const rows = [...byUser.values()];

  return (
    <>
      <WomHeader
        eyebrow="Leaderboards"
        title="Top Gainers"
        subtitle="Who's grinding hardest — XP, boss KC and more, this week and this month."
      />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {rows.length === 0 ? (
          <WomEmptyState
            title="No gains yet"
            message="No tracked gains are available, or Wise Old Man couldn't be reached. Check back soon."
          />
        ) : (
          <GainsBoard rows={rows} />
        )}
      </div>
    </>
  );
}
