import { defineArrayMember, defineField, defineType } from "sanity";

import { CarouselCaptionsInput } from "@/sanity/components/CarouselCaptionsInput";

// A swipeable image carousel for page bodies — built for the Clan Drops tab, where
// members upload many tagged screenshots. Images are stored OLDEST-FIRST: the site
// reverses them for display, so a new upload added at the bottom of the list shows up
// at the FRONT of the carousel. That keeps the editor workflow one click ("Add item")
// with no dragging. Captions are optional; leave blank for untagged drops.
export const carousel = defineType({
  name: "carousel",
  title: "Image carousel",
  type: "object",
  fields: [
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      description:
        "Add images here. The newest (last in this list) shows first in the carousel, so just add new drops to the bottom.",
      options: { layout: "grid" },
      // Custom input adds an inline "quick caption editor" below the grid so
      // captions can be edited all at once without opening each image.
      components: { input: CarouselCaptionsInput },
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "caption",
              title: "Caption",
              type: "string",
              description:
                "Optional. e.g. 'Player - Scythe of Vitur - 7/28/2026'. Leave blank if untagged.",
            }),
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
              description: "Optional description for screen readers.",
            }),
          ],
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "autoplay",
      title: "Auto-advance slides",
      type: "boolean",
      initialValue: true,
      description:
        "Slowly rotate through images on their own. Pauses on hover and for visitors who prefer reduced motion.",
    }),
  ],
  preview: {
    // Sanity's preview `select` can't read an array's length, so we show the first
    // image as a thumbnail (proof the block is populated) plus its caption. The true
    // image count is shown by the `images` array field's own header inside the block.
    select: { media: "images.0", caption: "images.0.caption" },
    prepare: ({ media, caption }) => ({
      title: "Image carousel",
      subtitle: caption || "Drops gallery",
      media,
    }),
  },
});
