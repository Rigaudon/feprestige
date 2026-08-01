import Link from "next/link";

// Shown on the WOM tabs when no group ID is configured, or when WOM is
// unreachable and returned no data. Mirrors the home page's empty state.
export function WomEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
        Wise Old Man
      </p>
      <h2 className="font-display text-3xl font-bold uppercase tracking-tight text-fg">
        {title}
      </h2>
      <p className="mt-4 text-fg-muted">{message}</p>
      <Link
        href="/admin"
        className="mt-8 inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-accent-strong transition-colors hover:border-accent hover:text-fg"
      >
        Open the Studio
      </Link>
    </div>
  );
}
