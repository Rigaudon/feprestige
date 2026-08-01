"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { urlFor } from "@/sanity/image";
import type { CarouselImage } from "@/sanity/types";

// A swipeable, lazy-loading image carousel. Slides live in a native horizontal
// scroll-snap track: that gives free touch/swipe AND real lazy loading, since a
// slide scrolled out of the track sits outside the viewport, so next/image (default
// lazy, no `priority`) only fetches it as it scrolls into view.
//
// Images arrive OLDEST-FIRST from Sanity (see carousel schema); we reverse for
// display so the newest — the one an editor just appended — shows first. Change the
// single `.reverse()` below to flip that rule.
export function Carousel({
  images,
  autoplay = false,
}: {
  images?: CarouselImage[];
  autoplay?: boolean;
}) {
  const slides = useMemo(
    () => (images ?? []).filter((img) => img?.asset?._ref).reverse(),
    [images],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentRef = useRef(0);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const count = slides.length;
  const hasMultiple = count > 1;

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    const track = trackRef.current;
    const slide = slideRefs.current[i];
    if (!track || !slide) return;
    // offsetLeft is relative to the track (it's the positioned offset parent).
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Keep `current` in sync with whatever slide is actually centered — covers manual
  // swipe/scroll, arrow clicks, and autoplay alike.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = slideRefs.current.indexOf(
              entry.target as HTMLDivElement,
            );
            if (idx !== -1) {
              currentRef.current = idx;
              setCurrent(idx);
            }
          }
        }
      },
      { root: track, threshold: [0.6] },
    );
    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, [count]);

  // Autoplay: advance on a timer, but never while hovered, while the lightbox is
  // open, or for visitors who prefer reduced motion (guard mirrors CursorGlow).
  useEffect(() => {
    if (!autoplay || !hasMultiple || paused || lightbox !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      scrollToIndex((currentRef.current + 1) % count);
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoplay, hasMultiple, paused, lightbox, count, scrollToIndex]);

  // Lock body scroll while the lightbox overlay is open.
  useEffect(() => {
    if (lightbox === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  // Lightbox keyboard: Esc closes, arrows page through.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight")
        setLightbox((i) => (i === null ? i : (i + 1) % count));
      else if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + count) % count));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, count]);

  if (count === 0) return null;

  const go = (i: number) => scrollToIndex((i + count) % count);

  // Keyboard nav for the inline carousel (when focus is within the region).
  const onRegionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(current - 1);
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      className="not-prose relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onRegionKeyDown}
    >
      {/* Slide track */}
      <div
        ref={trackRef}
        className="relative flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((img, i) => (
          <div
            key={img._key ?? i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className="relative w-full shrink-0 snap-center"
          >
            <button
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={
                img.caption ? `Enlarge: ${img.caption}` : "Enlarge image"
              }
              className="relative block aspect-video w-full bg-black/40"
            >
              <Image
                src={urlFor(img).width(1200).fit("max").auto("format").url()}
                alt={img.alt || img.caption || ""}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </button>
            {img.caption ? (
              <p className="px-4 py-2 text-center text-sm text-neutral-400">
                {img.caption}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {hasMultiple ? (
        <>
          {/* Prev / next arrows */}
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Previous image"
            className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/80 text-lg text-white backdrop-blur transition-colors hover:border-accent hover:text-accent-strong"
          >
            &#8249;
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Next image"
            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/80 text-lg text-white backdrop-blur transition-colors hover:border-accent hover:text-accent-strong"
          >
            &#8250;
          </button>

          {/* Dots */}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {slides.map((img, i) => (
              <button
                key={img._key ?? i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === current}
                className={`size-2 rounded-full transition-colors ${
                  i === current
                    ? "bg-accent-strong"
                    : "bg-border hover:bg-accent"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Lightbox overlay — portaled to <body> so it escapes the `main`
          stacking context (relative z-10) and can layer above the fixed
          sidebar (z-40) / mobile drawer (z-50) instead of behind them. */}
      {lightbox !== null
        ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged image"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border border-border bg-surface/80 text-xl text-white hover:border-accent hover:text-accent-strong"
          >
            &times;
          </button>

          {/* Stop backdrop-close when interacting with the image/controls. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-[85vh] w-[92vw] items-center justify-center"
          >
            <Image
              src={urlFor(slides[lightbox])
                .width(2000)
                .fit("max")
                .auto("format")
                .url()}
              alt={slides[lightbox].alt || slides[lightbox].caption || ""}
              fill
              sizes="92vw"
              className="object-contain"
            />
          </div>

          {slides[lightbox].caption ? (
            <p className="mt-3 text-center text-sm text-neutral-300">
              {slides[lightbox].caption}
            </p>
          ) : null}

          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i - 1 + count) % count));
                }}
                aria-label="Previous image"
                className="absolute top-1/2 left-4 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/80 text-2xl text-white hover:border-accent hover:text-accent-strong"
              >
                &#8249;
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i + 1) % count));
                }}
                aria-label="Next image"
                className="absolute top-1/2 right-4 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface/80 text-2xl text-white hover:border-accent hover:text-accent-strong"
              >
                &#8250;
              </button>
            </>
          ) : null}
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
