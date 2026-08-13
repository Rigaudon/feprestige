// Inline font size an editor can apply to a selection in a page body.
//
// This is a Portable Text *annotation* (like the built-in Link), not a
// decorator. Decorators (bold, italic) are booleans, so they can't carry a
// value; an annotation is an object stored in the block's `markDefs`, which
// lets it hold an arbitrary number. Block styles (Normal / Heading 2) are no
// use here either — those always restyle the whole paragraph.
//
// Shared deliberately: the Studio reads it from
// sanity/components/FontSizeAnnotation, the site from components/PortableText.
// Keep this file dependency-free so importing it into the server renderer
// doesn't pull the Studio into the worker bundle.
export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 40;

// Value stored on the annotation. `size` is in px; absent/invalid means the
// text falls back to whatever its block would render at anyway.
export interface FontSizeMark {
  _type?: "fontSize";
  size?: number;
}

// Clamp before rendering: content can predate a range change, and a document
// can be saved (drafts skip validation) with a size outside the allowed range.
export function fontSizeStyle(size: number | undefined) {
  if (typeof size !== "number" || !Number.isFinite(size)) return undefined;
  const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size));
  return `${clamped}px`;
}
