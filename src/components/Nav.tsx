import Link from "next/link";

import type { NavItem, Settings } from "@/sanity/types";

// Top navigation. Brand links home; tab links come from Sanity pages flagged
// "Show in navigation". The primary CTA (e.g. Discord) comes from Site Settings.
export function Nav({
  settings,
  navItems,
}: {
  settings: Settings | null;
  navItems: NavItem[];
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {settings?.title || "Clan Site"}
        </Link>

        <div className="flex items-center gap-5 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.slug || "home"}
              href={item.isHome ? "/" : `/${item.slug}`}
              className="text-neutral-300 transition-colors hover:text-white"
            >
              {item.title}
            </Link>
          ))}

          {settings?.primaryCta?.url && settings.primaryCta.label ? (
            <a
              href={settings.primaryCta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-indigo-500 px-4 py-1.5 font-medium text-white transition-colors hover:bg-indigo-400"
            >
              {settings.primaryCta.label}
            </a>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
