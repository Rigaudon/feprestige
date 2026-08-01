import {
  PortableText as PortableTextRenderer,
  type PortableTextComponents,
} from "@portabletext/react";
import type { PortableTextBlock } from "next-sanity";
import Image from "next/image";

import { imageDimensions, urlFor } from "@/sanity/image";
import type { Carousel as CarouselValue, ImageWithAlt, VideoEmbed } from "@/sanity/types";
import { parseVideoUrl } from "@/sanity/video";

import { Carousel } from "./Carousel";

// Rendering rules for Portable Text. Editors write rich text + drop in images
// in the Studio; this maps that structured content to styled HTML.
const components: PortableTextComponents = {
  types: {
    image: ({ value }: { value: ImageWithAlt }) => {
      if (!value?.asset?._ref) return null;
      // Render at the image's natural size, capped at the column width — a small
      // image stays small (centered) instead of being upscaled to full width.
      const dim = imageDimensions(value);
      const width = dim?.width ?? 1200;
      const height = dim?.height ?? 800;
      const requestWidth = Math.min(width, 1600);
      return (
        <figure
          className="my-8 mx-auto"
          style={{ maxWidth: `${width}px` }}
        >
          <Image
            src={urlFor(value).width(requestWidth).fit("max").auto("format").url()}
            alt={value.alt || ""}
            width={width}
            height={height}
            className="h-auto w-full rounded-lg"
          />
          {value.alt ? (
            <figcaption className="mt-2 text-center text-sm text-fg-muted">
              {value.alt}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    inlineImage: ({ value }: { value: ImageWithAlt }) => {
      if (!value?.asset?._ref) return null;
      // Flows within the line of text at roughly the text height, like an emoji.
      // A plain <img> is intentional here: next/image forces a block wrapper and
      // fixed dimensions, which don't sit inline with text.
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlFor(value).height(72).fit("max").auto("format").url()}
          alt={value.alt || ""}
          className="inline-block h-[1.4em] w-auto align-text-bottom"
          loading="lazy"
        />
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
            <figcaption className="mt-2 text-center text-sm text-fg-muted">
              {value.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    },
  },
  // The article container is wide (max-w-5xl) so media can grow on large
  // screens; keep the text itself at a readable measure (max-w-3xl, centered).
  block: {
    h2: ({ children }) => (
      <h2 className="mx-auto mt-10 mb-4 max-w-3xl font-display text-2xl font-bold uppercase tracking-wide text-fg">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mx-auto mt-8 mb-3 max-w-3xl font-display text-xl font-semibold uppercase tracking-wide text-fg">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mx-auto my-6 max-w-3xl border-l-4 border-accent pl-4 text-fg-muted italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => (
      <p className="mx-auto my-4 max-w-3xl leading-7 text-fg-muted">
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mx-auto my-4 max-w-3xl list-disc space-y-2 pl-6 text-fg-muted">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mx-auto my-4 max-w-3xl list-decimal space-y-2 pl-6 text-fg-muted">
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
      <strong className="font-semibold text-fg">{children}</strong>
    ),
  },
};

export function PortableText({ value }: { value: PortableTextBlock[] }) {
  return <PortableTextRenderer value={value} components={components} />;
}
