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
