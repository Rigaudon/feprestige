import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
} from "@portabletext/react";
import type { PortableTextBlock } from "next-sanity";
import Image from "next/image";

import { urlFor } from "@/sanity/image";
import type { Carousel as CarouselValue, ImageWithAlt, VideoEmbed } from "@/sanity/types";
import { parseVideoUrl } from "@/sanity/video";

import { Carousel } from "./Carousel";

// Rendering rules for Portable Text. Editors write rich text + drop in images
// in the Studio; this maps that structured content to styled HTML.
const components: PortableTextComponents = {
  types: {
    image: ({ value }: { value: ImageWithAlt }) => {
      if (!value?.asset?._ref) return null;
      return (
        <figure className="my-8">
          <Image
            src={urlFor(value).width(1200).fit("max").auto("format").url()}
            alt={value.alt || ""}
            width={1200}
            height={800}
            className="h-auto w-full rounded-lg"
          />
          {value.alt ? (
            <figcaption className="mt-2 text-center text-sm text-neutral-400">
              {value.alt}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    carousel: ({ value }: { value: CarouselValue }) =>
      value?.images?.length ? (
        <figure className="my-8">
          <Carousel images={value.images} autoplay={value.autoplay} />
        </figure>
      ) : null,
    videoEmbed: ({ value }: { value: VideoEmbed }) => {
      const info = value?.url ? parseVideoUrl(value.url) : null;
      if (!info) return null;
      return (
        <figure className="my-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src={info.embedUrl}
              title={value.caption || "Embedded video"}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {value.caption ? (
            <figcaption className="mt-2 text-center text-sm text-neutral-400">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
  },
  block: {
    h2: ({ children }) => (
      <h2 className="mt-10 mb-4 font-display text-2xl font-bold uppercase tracking-wide text-white">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 font-display text-xl font-semibold uppercase tracking-wide text-white">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-accent pl-4 text-neutral-300 italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="my-4 leading-7 text-neutral-300">{children}</p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 list-disc space-y-2 pl-6 text-neutral-300">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 list-decimal space-y-2 pl-6 text-neutral-300">
        {children}
      </ol>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || "#";
      const external = href.startsWith("http");
      return (
        <a
          href={href}
          className="text-accent-strong underline underline-offset-2 hover:text-accent-hot"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {children}
        </a>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-neutral-100">{children}</strong>
    ),
  },
};

export function PortableText({ value }: { value: PortableTextBlock[] }) {
  return <PortableTextRenderer value={value} components={components} />;
}
