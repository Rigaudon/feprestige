// Minimal prev/next pager shared by the WOM boards. Renders nothing when there's
// only one page.
export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number; // 0-indexed
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const btn =
    "rounded-lg border border-border bg-surface px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-fg-muted transition-all enabled:hover:border-accent enabled:hover:text-fg enabled:active:scale-95 disabled:opacity-40";

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        type="button"
        className={btn}
        onClick={() => onPage(page - 1)}
        disabled={page <= 0}
      >
        ← Prev
      </button>
      <span className="font-mono text-xs uppercase tracking-wider text-fg-subtle">
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onPage(page + 1)}
        disabled={page >= pageCount - 1}
      >
        Next →
      </button>
    </div>
  );
}
