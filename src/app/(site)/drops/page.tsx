import type { Metadata } from "next";
import { after } from "next/server";

import { DropsCarousel } from "@/components/drops/DropsCarousel";
import { WomHeader } from "@/components/wom/WomHeader";
import { readManifestCached } from "@/discord/client";
import { dropsCdnBase, isDropsIngestConfigured } from "@/discord/env";
import { lazyIncrementalSync } from "@/discord/sync";

export const metadata: Metadata = {
  title: "Drops",
  description: "The clan's drop of the week — standout loot from our members.",
};

// Re-render hourly. The `after()` lazy sync below plus the sync route's
// revalidateTag keep drops fresh without a cron (see src/discord/sync.ts).
export const revalidate = 3600;

export default async function DropsPage() {
  const manifest = await readManifestCached();

  // Opportunistically pull new drops after the response is sent (throttled to
  // ~15min in lazyIncrementalSync). Runs on revalidation, not per request.
  if (isDropsIngestConfigured) {
    after(() => lazyIncrementalSync());
  }

  const drops = [...manifest.drops].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <>
      <WomHeader
        eyebrow="Drop of the Week"
        title="Drops"
        subtitle="The clan's standout loot — big drops and lucky moments, straight from our Discord."
      />
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
        {drops.length === 0 ? (
          <div className="mx-auto max-w-2xl px-6 py-24 text-center">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
              Drop of the Week
            </p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-fg">
              No drops yet
            </h2>
            <p className="mt-4 text-fg-muted">
              Notable drops shared in our Discord will show up here. Check back
              soon.
            </p>
          </div>
        ) : (
          <DropsCarousel drops={drops} cdnBase={dropsCdnBase} />
        )}
      </div>
    </>
  );
}
