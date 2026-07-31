import Image from "next/image";

import { urlFor } from "@/sanity/image";
import type { ImageWithAlt } from "@/sanity/types";

// Page hero: title, optional subtitle, optional background image.
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
    <section className="relative overflow-hidden border-b border-white/10">
      {hasImage ? (
        <>
          <Image
            src={urlFor(image!).width(1920).height(720).fit("crop").auto("format").url()}
            alt={image?.alt || ""}
            fill
            priority
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-neutral-950/30" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-neutral-950 to-neutral-950" />
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-lg text-neutral-300">{subtitle}</p>
        ) : null}
      </div>
    </section>
  );
}
