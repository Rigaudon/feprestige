"use client";

import { useSyncExternalStore } from "react";

// Visitor-facing theme picker. Themes are driven entirely by the `data-theme`
// attribute on <html> (see src/app/globals.css); this just sets that attribute
// and remembers the choice in localStorage. The pre-paint script in the root
// layout applies the saved theme (default: dark) before React mounts, so there's
// no flash.
//
// Swatch colors are hardcoded here (not CSS vars) so every swatch previews its
// OWN theme rather than the currently-active one. Keep in sync with globals.css.
const THEMES = [
  { id: "dark", label: "Dark Violet", bg: "#0a0812", accent: "#a855f7", hot: "#ec4899" },
  { id: "gold", label: "Gold", bg: "#000000", accent: "#fceb4f", hot: "#fceb4f" },
  { id: "emerald", label: "Emerald", bg: "#06110b", accent: "#10b981", hot: "#2dd4bf" },
  { id: "crimson", label: "Crimson", bg: "#130607", accent: "#ef4444", hot: "#fb923c" },
  { id: "ocean", label: "Ocean", bg: "#050f1b", accent: "#0ea5e9", hot: "#22d3ee" },
  { id: "amber", label: "Amber", bg: "#140f04", accent: "#f59e0b", hot: "#f97316" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

// Read the active theme straight from the DOM (set by the pre-paint script in
// the root layout and by pick() below). useSyncExternalStore gives an SSR-safe
// snapshot with no hydration mismatch, and re-renders on any data-theme change.
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};
const getSnapshot = () => document.documentElement.getAttribute("data-theme");
const getServerSnapshot = () => null;

export function ThemePicker() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = THEMES.some((t) => t.id === raw) ? (raw as ThemeId) : null;

  const pick = (id: ThemeId) => {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("theme", id);
    } catch {
      // Private mode / storage disabled — the theme still applies for this visit.
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 font-mono text-[10px] uppercase tracking-[0.25em] text-fg-subtle">
        Theme
      </p>
      <div
        role="radiogroup"
        aria-label="Color theme"
        className="flex flex-wrap gap-2"
      >
        {THEMES.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t.label}
              title={t.label}
              onClick={() => pick(t.id)}
              style={{ backgroundColor: t.bg }}
              className={`grid size-7 place-items-center rounded-full ring-1 transition-all active:scale-95 ${
                active
                  ? "scale-110 ring-2 ring-accent-strong"
                  : "ring-border hover:ring-accent"
              }`}
            >
              <span
                aria-hidden
                style={{
                  backgroundImage: `linear-gradient(135deg, ${t.accent}, ${t.hot})`,
                }}
                className="size-3.5 rounded-full"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
