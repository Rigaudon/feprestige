import type { Metadata } from "next";

import { RosterTable, type RosterMember } from "@/components/wom/RosterTable";
import { WomEmptyState } from "@/components/wom/WomEmptyState";
import { WomHeader } from "@/components/wom/WomHeader";
import { getGroupDetails } from "@/wom/queries";
import { getWomPageSettings } from "@/wom/settings";

export const metadata: Metadata = {
  title: "Roster",
  description: "The clan's live member roster, powered by Wise Old Man.",
};

export default async function RosterPage() {
  const { groupId, header } = await getWomPageSettings("roster");
  const eyebrow = header.eyebrow ?? "Members";

  if (!groupId) {
    return (
      <>
        <WomHeader eyebrow={eyebrow} title={header.title ?? "Roster"} />
        <WomEmptyState
          title="Roster not configured"
          message="Add your Wise Old Man group ID in Site Settings to show the live clan roster here."
        />
      </>
    );
  }

  const group = await getGroupDetails(groupId);
  const members: RosterMember[] = (group?.memberships ?? []).map((m) => ({
    username: m.player.username,
    displayName: m.player.displayName,
    role: m.role,
    type: m.player.type,
    country: m.player.country,
    exp: m.player.exp ?? 0,
    ehp: m.player.ehp ?? 0,
    ehb: m.player.ehb ?? 0,
  }));

  return (
    <>
      <WomHeader
        eyebrow={eyebrow}
        title={header.title ?? (group?.name ? `${group.name} Roster` : "Roster")}
        subtitle={
          header.subtitle ??
          group?.description ??
          "Our live member roster, synced from Wise Old Man."
        }
      />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        {members.length === 0 ? (
          <WomEmptyState
            title="No members yet"
            message="The Wise Old Man group has no members, or couldn't be reached. Check back soon."
          />
        ) : (
          <RosterTable members={members} />
        )}
      </div>
    </>
  );
}
