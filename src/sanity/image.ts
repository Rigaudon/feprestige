import {
  createImageUrlBuilder,
  type SanityImageSource,
} from "@sanity/image-url";

import { dataset, projectId } from "./env";

const builder = createImageUrlBuilder({
  projectId: projectId || "placeholder",
  dataset,
});

/**
 * Build a URL for a Sanity image source. Chain builder methods for on-the-fly
 * transforms, e.g. `urlFor(img).width(1200).height(630).fit("crop").url()`.
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/**
 * Read an image's intrinsic pixel dimensions out of its Sanity asset ref, which
 * is shaped like `image-{id}-{width}x{height}-{ext}`. Lets us render at natural
 * size (and never upscale a tiny emoji-sized image) without a metadata fetch.
 */
export function imageDimensions(
  source: SanityImageSource,
): { width: number; height: number } | null {
  const ref =
    typeof source === "string"
      ? source
      : (source as { asset?: { _ref?: string } })?.asset?._ref;
  if (!ref) return null;
  const match = /-(\d+)x(\d+)-/.exec(ref);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
}
