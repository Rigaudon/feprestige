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

  return (
    <section className="relative overflow-hidden border-b border-border">
      {hasImage ? (
        <>
          <Image
            src={urlFor(image!).width(1920).height(760).fit("crop").auto("format").url()}
            alt={image?.alt || ""}
            fill
            priority
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(40rem_24rem_at_10%_-20%,rgba(168,85,247,0.28),transparent_60%),radial-gradient(36rem_24rem_at_90%_120%,rgba(236,72,153,0.16),transparent_60%)]" />
      )}

      <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28 lg:px-10">
        <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
          <span className="inline-block h-px w-8 bg-gradient-to-r from-accent to-transparent" />
          FE Prestige
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(168,85,247,0.35)] sm:text-6xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-neutral-300">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-8 h-1 w-24 rounded-full bg-gradient-to-r from-accent to-accent-hot shadow-[0_0_16px_-2px_var(--color-accent)]" />
      </div>
    </section>
  );
}
