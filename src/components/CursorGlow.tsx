"use client";

import { useEffect, useRef } from "react";

// A soft violet glow that trails the cursor, painted behind the page content so
// it washes the dark background without ever touching text (it sits at z-0; the
// site's <main> is lifted to z-10). Pointer position is pushed straight to CSS
// variables via a ref + requestAnimationFrame — no React re-render per move.
// Bails out entirely on coarse/touch pointers and for reduced-motion visitors,
// so it stays a desktop-only flourish.
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    // Coalesce bursts of pointermove into one style write per frame.
    const paint = () => {
      frame = 0;
      el.style.setProperty("--gx", `${x}px`);
      el.style.setProperty("--gy", `${y}px`);
      el.style.opacity = "1";
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    // Fade out when the cursor leaves the window entirely.
    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-0 transition-opacity duration-500"
      style={{
        background:
          "radial-gradient(26rem 26rem at var(--gx, 50%) var(--gy, 50%), rgba(168, 85, 247, 0.13), rgba(236, 72, 153, 0.06) 38%, transparent 68%)",
      }}
    />
  );
}
