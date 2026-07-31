import { WomHeader } from "@/components/wom/WomHeader";
import { WomTableSkeleton } from "@/components/wom/WomTableSkeleton";

export default function Loading() {
  return (
    <>
      <WomHeader eyebrow="Leaderboards" title="Top Gainers" />
      <WomTableSkeleton />
    </>
  );
}
