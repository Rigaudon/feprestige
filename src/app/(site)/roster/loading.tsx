import { WomHeader } from "@/components/wom/WomHeader";
import { WomTableSkeleton } from "@/components/wom/WomTableSkeleton";

// Shown instantly while the roster renders (e.g. first cache-warm after deploy).
export default function Loading() {
  return (
    <>
      <WomHeader eyebrow="Members" title="Roster" />
      <WomTableSkeleton />
    </>
  );
}
