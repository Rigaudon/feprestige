import Image from "next/image";

import { urlFor } from "@/sanity/image";
import type { ImageWithAlt } from "@/sanity/types";

// Page hero: title, optional subtitle, optional background image. Styled with
// the violet gaming accent — tech eyebrow, angular accent bar.
export function Hero({
  title,
  subtitle,
  image,
}: {
  title?: string;
  subtitle?: string;
  image?: ImageWithAlt;
}) {
  const hasImage = Boolean(image?.asset?._ref);

  // Legibility halo for text over the hero image. The shadow color is the theme
  // background, so it's a dark halo in dark themes / a light halo in light mode
  // (always opposite the text) — and invisible over the plain no-image hero
  // since it matches the background.
  const haloShadow =
    "0 1px 2px var(--color-bg), 0 2px 10px var(--color-bg)";

  return (
    <section className="relative overflow-hidden border-b border-border">
      {hasImage ? (
        <>
          <Image
            src={urlFor(image!).width(1920).height(760).fit("crop").auto("format").url()}
            alt={image?.alt || ""}
            fill
            priority
            className="object-cover opacity-75"
          />
          {/* Lighter scrim: grounds the bottom for text legibility while letting
              the image show through up top. */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-bg/35 to-transparent" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(40rem 24rem at 10% -20%, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 60%), radial-gradient(36rem 24rem at 90% 120%, color-mix(in srgb, var(--color-accent-hot) 16%, transparent), transparent 60%)",
          }}
        />
      )}

      <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28 lg:px-10">
        <p
          className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong"
          style={{ textShadow: haloShadow }}
        >
          <span className="inline-block h-px w-8 bg-gradient-to-r from-accent to-transparent" />
          FE Prestige
        </p>
        <h1
          className="font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight text-fg sm:text-6xl"
          style={{
            // Legibility halo + a soft accent glow for style.
            textShadow: `${haloShadow}, 0 0 28px color-mix(in srgb, var(--color-accent) 45%, transparent)`,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted"
            style={{ textShadow: haloShadow }}
          >
            {subtitle}
          </p>
        ) : null}
        <div className="mt-8 h-1 w-24 rounded-full bg-gradient-to-r from-accent to-accent-hot shadow-[0_0_16px_-2px_var(--color-accent)]" />
      </div>
    </section>
  );
}
