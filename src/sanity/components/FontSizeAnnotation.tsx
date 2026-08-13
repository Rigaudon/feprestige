"use client";

import type { BlockAnnotationProps } from "sanity";

import { fontSizeStyle, type FontSizeMark } from "@/sanity/textSizes";

// Toolbar glyph for the annotation button — two A's at different sizes reads
// as "text size" without pulling in an icon dependency.
export function FontSizeIcon() {
  return (
    <span style={{ lineHeight: 1, letterSpacing: "0.02em" }}>
      <span style={{ fontSize: "1.15em", fontWeight: 700 }}>A</span>
      <span style={{ fontSize: "0.7em", fontWeight: 700 }}>A</span>
    </span>
  );
}

// In-editor preview: show the annotated text at the size it will publish at,
// while keeping Sanity's default annotation chrome (click-to-edit, popover
// form, validation markers) intact.
//
// `textElement` is the annotated text; `children` is the edit form, which the
// default renderer positions for us — so we resize the former and hand the
// rest straight back to `renderDefault`.
export function FontSizeAnnotation(props: BlockAnnotationProps) {
  const fontSize = fontSizeStyle((props.value as FontSizeMark)?.size);
  if (!fontSize) return props.renderDefault(props);
  return props.renderDefault({
    ...props,
    textElement: <span style={{ fontSize }}>{props.textElement}</span>,
  });
}
