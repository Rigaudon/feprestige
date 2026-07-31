// Placeholder rows shown while a WOM page renders (route loading.tsx). Mirrors
// the leaderboard/table layout so the shell doesn't jump when data arrives.
export function WomTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
      {/* Controls row placeholder. */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-surface-2" />
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-surface-2" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-0"
          >
            <div className="h-4 w-6 animate-pulse rounded bg-surface-2" />
            <div className="h-4 flex-1 max-w-[40%] animate-pulse rounded bg-surface-2" />
            <div className="ml-auto h-4 w-24 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
