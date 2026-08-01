// Standalone page header for the WOM data tabs — same violet treatment as the
// Sanity-driven <Hero>, but self-contained (no image) and used by code routes.
export function WomHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-[radial-gradient(40rem_22rem_at_10%_-30%,rgba(168,85,247,0.26),transparent_60%),radial-gradient(32rem_20rem_at_95%_130%,rgba(236,72,153,0.14),transparent_60%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-16 lg:px-10">
        <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
          <span className="inline-block h-px w-8 bg-gradient-to-r from-accent to-transparent" />
          {eyebrow}
        </p>
        <h1 className="font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight text-fg drop-shadow-[0_2px_20px_rgba(168,85,247,0.35)] sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-fg-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
