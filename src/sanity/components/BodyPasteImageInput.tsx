"use client";

import { useToast } from "@sanity/ui";
import { useCallback } from "react";
import { type PortableTextInputProps, useClient } from "sanity";

import { apiVersion } from "@/sanity/env";

// Handler + argument types derived from the input props so we don't have to
// import editor-internal types across the nested @portabletext/editor boundary.
type OnPaste = NonNullable<PortableTextInputProps["onPaste"]>;
type PasteData = Parameters<OnPaste>[0];

// Unique _key for each inserted inline image (Portable Text members need one).
const randomKey = () =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
    .replace(/-/g, "")
    .slice(0, 12);

// Custom Portable Text input for page bodies: lets an editor paste an image
// straight into the text (e.g. a copied Discord emoji). The image is uploaded to
// Sanity and inserted as an inline image at the cursor. Anything that isn't an
// image (plain text, HTML, links) falls through to the editor's normal paste.
export function BodyPasteImageInput(props: PortableTextInputProps) {
  const client = useClient({ apiVersion });
  const toast = useToast();

  const onPaste = useCallback(
    ({ event }: PasteData) => {
      // Grab any pasted image File(s) synchronously, before an await could
      // consume the event.
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      // No image file (plain text, links, or an emoji copied from within the
      // editor) → return plain `undefined` so the editor's native paste runs.
      // Returning a Promise here is unreliable for native fallback, so we must
      // stay synchronous on this path.
      if (files.length === 0) return undefined;

      // Only now, when we're actually handling an image, return a Promise that
      // uploads it and inserts an inline image at the cursor.
      return (async () => {
        try {
          const assets = await Promise.all(
            files.map((file) =>
              client.assets.upload("image", file, {
                filename: file.name || "pasted-image",
              }),
            ),
          );
          return {
            insert: assets.map((asset) => ({
              _type: "inlineImage",
              _key: randomKey(),
              asset: { _type: "reference", _ref: asset._id },
            })),
          };
        } catch (err) {
          toast.push({
            status: "error",
            title: "Couldn't upload the pasted image",
            description: err instanceof Error ? err.message : undefined,
          });
          return undefined;
        }
      })();
    },
    [client, toast],
  );

  return props.renderDefault({ ...props, onPaste });
}
