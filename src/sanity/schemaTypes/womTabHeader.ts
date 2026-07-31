import { defineField, defineType } from "sanity";

// Reusable header block for the live Wise Old Man tabs (Roster / Hiscores /
// Gains). Every field is optional: blank fields fall back to the built-in
// default text in each page, so the tabs look identical until someone edits them.
export const womTabHeader = defineType({
  name: "womTabHeader",
  title: "Tab header",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      description: "Small label shown above the title (e.g. Leaderboards).",
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Main heading for the tab.",
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "text",
      rows: 2,
      description: "Short line of text shown under the title.",
    }),
  ],
});
