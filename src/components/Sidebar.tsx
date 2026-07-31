"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { urlFor } from "@/sanity/image";
import type { NavItem, Settings } from "@/sanity/types";

// Left sidebar navigation (replaces the old top nav + footer). Holds the brand,
// the page tabs with an active-state highlight, and the socials + primary CTA
// that used to live in the footer. On small screens it collapses to a top bar
// with a slide-out drawer. Client component: needs usePathname + open state.
export function Sidebar({
  settings,
  navItems,
  extraNav = [],
}: {
  settings: Settings | null;
  navItems: NavItem[];
  // Code-driven links appended after the Sanity page tabs (e.g. WOM tabs).
  extraNav?: { title: string; href: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const brand = settings?.title || "FE Prestige";
  const hasLogo = Boolean(settings?.logo);
  const socials = settings?.socialLinks?.filter((s) => s.url && s.platform) ?? [];
  const cta = settings?.primaryCta;

  const isActive = (item: NavItem) =>
    item.isHome ? pathname === "/" : pathname === `/${item.slug}`;

  // Shared nav link markup for both Sanity page tabs and code-driven links.
  const renderLink = (key: string, href: string, label: string, active: boolean) => (
    <Link
      key={key}
      href={href}
      onClick={close}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm font-semibold uppercase tracking-wide transition-all ${
        active
          ? "bg-surface-2 text-white"
          : "text-neutral-400 hover:bg-surface hover:text-white"
      }`}
    >
      {/* Neon spine on the active / hovered item. */}
      <span
        className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-accent-hot transition-all ${
          active ? "w-1 opacity-100" : "w-1 opacity-0 group-hover:opacity-60"
        }`}
      />
      <span
        className={`h-1.5 w-1.5 rounded-full transition-colors ${
          active
            ? "bg-accent shadow-[0_0_8px_1px_var(--color-accent)]"
            : "bg-neutral-600 group-hover:bg-accent"
        }`}
      />
      {label}
    </Link>
  );

  const brandBlock = (
    <Link href="/" onClick={close} className="group flex items-center gap-3">
      {hasLogo ? (
        <Image
          src={urlFor(settings!.logo!).width(80).height(80).fit("crop").url()}
          alt={brand}
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg ring-1 ring-border"
        />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-hot font-display text-lg font-bold text-white shadow-[0_0_20px_-4px_var(--color-accent)]">
          {brand.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-display text-lg font-bold uppercase tracking-wider text-white transition-colors group-hover:text-accent-strong">
        {brand}
      </span>
    </Link>
  );

  // The scrolling body of the sidebar, shared by desktop rail and mobile drawer.
  const inner = (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="px-1 pt-1">{brandBlock}</div>

      {settings?.tagline ? (
        <p className="px-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-strong/70">
          {settings.tagline}
        </p>
      ) : null}

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) =>
          renderLink(
            item.slug || "home",
            item.isHome ? "/" : `/${item.slug}`,
            item.title ?? "",
            isActive(item),
          ),
        )}

        {extraNav.length > 0 ? (
          <>
            <p className="mt-4 px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
              Clan Stats
            </p>
            {extraNav.map((item) =>
              renderLink(
                item.href,
                item.href,
                item.title,
                pathname === item.href,
              ),
            )}
          </>
        ) : null}
      </nav>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        {cta?.url && cta.label ? (
          <a
            href={cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-lg bg-gradient-to-r from-accent to-accent-hot px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_20px_-6px_var(--color-accent)] transition-all hover:shadow-[0_0_28px_-4px_var(--color-accent-hot)] hover:brightness-110"
          >
            {cta.label}
          </a>
        ) : null}

        {socials.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400 transition-colors hover:border-accent hover:text-accent-strong"
              >
                {s.platform}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail — fixed, full height. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface/60 backdrop-blur-xl lg:block">
        {inner}
      </aside>

      {/* Mobile top bar. */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        {brandBlock}
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border text-neutral-300 transition-colors hover:border-accent hover:text-accent-strong"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile drawer + backdrop. */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[80%] border-r border-border bg-surface transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {inner}
        </aside>
      </div>
    </>
  );
}
