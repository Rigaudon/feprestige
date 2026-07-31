import type { Metadata } from "next";

import {
  HiscoresBoard,
  type HiscoresRow,
} from "@/components/wom/HiscoresBoard";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import { ALL_METRICS } from "@/wom/metrics";
import {
  getGroupBulkHiscores,
  snapshotLevel,
  snapshotValue,
} from "@/wom/queries";
import { getWomGroupId } from "@/wom/settings";

export const metadata: Metadata = {
  title: "Hiscores",
  description: "Clan hiscores across every skill, boss and activity.",
};

export default async function HiscoresPage() {
  const groupId = await getWomGroupId();

  if (!groupId) {
    return (
      <>
        <WomHeader eyebrow="Leaderboards" title="Hiscores" />
        <WomEmptyState
          title="Hiscores not configured"
          message="Add your Wise Old Man group ID in Site Settings to show clan hiscores here."
        />
      </>
    );
  }

  const entries = await getGroupBulkHiscores(groupId);

  // Flatten each member's snapshot into a compact metric -> {value, level} map so
  // the client board can switch metrics without re-fetching. Built once at
  // build/revalidate time.
  const rows: HiscoresRow[] = entries.map((e) => {
    const values: HiscoresRow["values"] = {};
    for (const metric of ALL_METRICS) {
      const v = snapshotValue(e.data.data, metric);
      if (v > 0) {
        const l = snapshotLevel(e.data.data, metric);
        values[metric] = l !== undefined ? { v, l } : { v };
      }
    }
    return {
      username: e.player.username,
      displayName: e.player.displayName,
      type: e.player.type,
      values,
    };
  });

  return (
    <>
      <WomHeader
        eyebrow="Leaderboards"
        title="Hiscores"
        subtitle="Where members rank across every skill, boss and activity. Pick a metric to sort the clan."
      />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {rows.length === 0 ? (
          <WomEmptyState
            title="No hiscores yet"
            message="No member stats are available, or Wise Old Man couldn't be reached. Check back soon."
          />
        ) : (
          <HiscoresBoard rows={rows} />
        )}
      </div>
    </>
  );
}
