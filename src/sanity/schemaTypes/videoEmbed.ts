import { defineField, defineType } from "sanity";

import { parseVideoUrl } from "../video";

// A video block for page bodies. Editors paste a YouTube or Vimeo link and the
// site renders a responsive iframe. The video stays hosted on YouTube/Vimeo, so
// there's no storage or bandwidth cost here — handoff-safe by design.
export const videoEmbed = defineType({
  name: "videoEmbed",
  title: "Video",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Video URL",
      type: "url",
      description:
        "Paste a YouTube or Vimeo link, e.g. https://youtu.be/dQw4w9WgXcQ",
      validation: (rule) =>
        rule
          .required()
          .uri({ scheme: ["http", "https"] })
          .custom((value) =>
            !value || parseVideoUrl(value)
              ? true
              : "Enter a valid YouTube or Vimeo URL.",
          ),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
      description: "Optional caption shown under the video.",
    }),
  ],
  preview: {
    select: { url: "url", caption: "caption" },
    prepare: ({ url, caption }) => ({
      title: caption || "Video",
      subtitle: url,
    }),
  },
});
