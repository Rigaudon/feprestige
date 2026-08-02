import { WomHeader } from "@/components/wom/WomHeader";

// Shown instantly while the Drops page renders (e.g. first cache-warm after deploy).
export default function Loading() {
  return (
    <>
      <WomHeader eyebrow="Drop of the Week" title="Drops" />
      <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
        <div className="flex flex-col gap-5">
          <div className="aspect-video w-full animate-pulse rounded-xl border border-border bg-surface" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          <div className="flex gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-16 shrink-0 animate-pulse rounded-md border border-border bg-surface"
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
