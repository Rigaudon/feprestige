"use client";

import { useEffect, useRef, useState } from "react";

import { type Metric, METRIC_PROPS, type MetricType, metricName } from "@/wom/metrics";

import { MetricIcon } from "./Icon";

const GROUPS: { type: MetricType; label: string }[] = [
  { type: "skill", label: "Skills" },
  { type: "boss", label: "Bosses" },
  { type: "activity", label: "Activities" },
  { type: "computed", label: "Computed" },
];

// Grouped metric picker shared by the Hiscores and Gains boards. A native
// <select> can't show icons in its options, so this is a custom listbox: a
// trigger button showing the selected metric's icon + name, and a popup panel
// with the same for every available option. Controlled; the parent owns the
// selected metric. Only the metrics passed in `metrics` are offered (i.e. those
// the clan is actually ranked in), grouped by type.
export function MetricSelect({
  value,
  onChange,
  metrics,
  id,
}: {
  value: Metric;
  onChange: (metric: Metric) => void;
  metrics: Metric[];
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape while the panel is open.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (m: Metric) => {
    onChange(m);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-44 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white outline-none transition-all hover:border-accent focus:border-accent active:scale-[0.98]"
      >
        <MetricIcon metric={value} size={18} />
        <span className="truncate">{metricName(value)}</span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`ml-auto h-4 w-4 shrink-0 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 z-20 mt-1 max-h-80 w-64 overflow-auto rounded-lg border border-border bg-surface-2 py-1 shadow-xl shadow-black/40"
        >
          {GROUPS.map(({ type, label }) => {
            const options = metrics.filter((m) => METRIC_PROPS[m].type === type);
            if (options.length === 0) return null;
            return (
              <div key={type}>
                <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                  {label}
                </div>
                {options.map((m) => {
                  const selected = m === value;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => select(m)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left font-display text-sm font-semibold tracking-wide transition-colors ${
                        selected
                          ? "bg-surface text-accent-strong"
                          : "text-neutral-200 hover:bg-surface"
                      }`}
                    >
                      <MetricIcon metric={m} size={18} />
                      <span className="truncate">{metricName(m)}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
