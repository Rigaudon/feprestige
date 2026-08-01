import type { ComponentType } from "react";
import {
  type ArrayOfPrimitivesInputProps,
  defineArrayMember,
  defineField,
  defineType,
} from "sanity";

import { BodyPasteImageInput } from "@/sanity/components/BodyPasteImageInput";

// A page = one tab on the site. Editors control the nav entirely from here:
// toggle "Show in navigation" and set the order. Flag exactly one page as the
// home page to control what renders at the site root (/).
export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
      description: "The URL path for this page, e.g. 'about' -> /about.",
    }),
    defineField({
      name: "isHome",
      title: "Use as home page",
      type: "boolean",
      initialValue: false,
      description:
        "The home page renders at the site root (/). Flag only one page.",
    }),
    defineField({
      name: "showInNav",
      title: "Show in navigation",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "navOrder",
      title: "Navigation order",
      type: "number",
      description: "Lower numbers appear first in the nav.",
      initialValue: 0,
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      description: "Optional line shown under the title in the hero.",
    }),
    defineField({
      name: "heroImage",
      title: "Hero image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({ name: "alt", title: "Alt text", type: "string" }),
      ],
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      // Custom input adds paste-to-inline-image: paste a copied image (e.g. a
      // Discord emoji) straight into the text and it uploads + inserts inline.
      // Sanity infers this array's input as primitives, but at runtime it is the
      // Portable Text editor, so the component receives PortableTextInputProps.
      components: {
        input: BodyPasteImageInput as unknown as ComponentType<ArrayOfPrimitivesInputProps>,
      },
      of: [
        defineArrayMember({
          type: "block",
          // Inline objects allowed within a line of text (e.g. a small emoji
          // dropped mid-sentence). Distinct from the standalone image below.
          of: [
            defineArrayMember({
              type: "image",
              name: "inlineImage",
              title: "Inline image (emoji-sized)",
              options: { hotspot: false },
              fields: [
                defineField({ name: "alt", title: "Alt text", type: "string" }),
              ],
            }),
          ],
        }),
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({ name: "alt", title: "Alt text", type: "string" }),
          ],
        }),
        defineArrayMember({ type: "videoEmbed" }),
        defineArrayMember({ type: "carousel" }),
      ],
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current", isHome: "isHome" },
    prepare: ({ title, subtitle, isHome }) => ({
      title,
      subtitle: isHome ? "Home page" : subtitle ? `/${subtitle}` : undefined,
    }),
  },
});
