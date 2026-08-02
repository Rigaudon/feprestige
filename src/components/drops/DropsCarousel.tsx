"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import type { Drop } from "@/discord/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A windowed thumbnail strip — only renders a slice around the current drop so a
// large channel doesn't mount thousands of <Image>s.
function Thumbs({
  drops,
  cdnBase,
  index,
  onPick,
}: {
  drops: Drop[];
  cdnBase: string;
  index: number;
  onPick: (i: number) => void;
}) {
  const count = drops.length;
  const WINDOW = 9;
  const end = Math.min(count, Math.max(index + 5, WINDOW));
  const start = Math.max(0, end - WINDOW);
  const items: number[] = [];
  for (let i = start; i < end; i++) items.push(i);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((i) => (
        <button
          key={drops[i].id}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Go to drop ${i + 1}`}
          aria-current={i === index}
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border transition-all ${
            i === index
              ? "border-accent shadow-[0_0_12px_-2px_var(--color-accent)]"
              : "border-border opacity-70 hover:opacity-100"
          }`}
        >
          <Image
            src={`${cdnBase}/${drops[i].key}`}
            alt=""
            fill
            sizes="64px"
            className="object-cover"
          />
        </button>
      ))}
    </div>
  );
}

// Chronological (newest-first) carousel of re-hosted Discord drops. Keyboard
// (←/→) navigable; keeps the current image + immediate neighbors mounted so
// navigation feels instant without preloading the whole set.
export function DropsCarousel({
  drops,
  cdnBase,
}: {
  drops: Drop[];
  cdnBase: string;
}) {
  const [index, setIndex] = useState(0);
  const count = drops.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const current = drops[index];

  // Current + immediate neighbors, de-duped (handles count === 1 or 2).
  const mounted = [index - 1, index, index + 1]
    .map((i) => (i + count) % count)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-surface">
          {mounted.map((i) => (
            <Image
              key={drops[i].id}
              src={`${cdnBase}/${drops[i].key}`}
              alt={drops[i].caption || "Clan drop"}
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              priority={i === index}
              className={`object-contain transition-opacity duration-200 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        {count > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous drop"
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/80 text-fg-muted backdrop-blur transition-all hover:border-accent hover:text-accent-strong active:scale-95"
            >
              <Arrow dir="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next drop"
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface/80 text-fg-muted backdrop-blur transition-all hover:border-accent hover:text-accent-strong active:scale-95"
            >
              <Arrow dir="right" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {current.caption ? (
            <p className="whitespace-pre-wrap break-words text-fg">
              {current.caption}
            </p>
          ) : (
            <p className="italic text-fg-subtle">No caption</p>
          )}
          {current.date ? (
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-accent-strong/80">
              {formatDate(current.date)}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 font-mono text-xs text-fg-subtle">
          {index + 1} / {count}
        </span>
      </div>

      {count > 1 ? (
        <Thumbs
          drops={drops}
          cdnBase={cdnBase}
          index={index}
          onPick={setIndex}
        />
      ) : null}
    </div>
  );
}
