import { defineArrayMember, defineField, defineType } from "sanity";

// Singleton document holding site-wide settings: clan identity, the primary
// call-to-action (e.g. Discord invite), social links, and footer text.
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Clan name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "Short phrase shown under the clan name.",
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "ogImage",
      title: "Social preview image",
      type: "image",
      description:
        "The image shown when the site is shared on Discord, Slack, iMessage, " +
        "etc. Looks best as a wide banner (1200×630). Leave blank to fall back " +
        "to the logo.",
      options: { hotspot: true },
    }),
    defineField({
      name: "primaryCta",
      title: "Primary call-to-action",
      type: "object",
      description: "The main button in the header (e.g. Join our Discord).",
      fields: [
        defineField({ name: "label", title: "Label", type: "string" }),
        defineField({ name: "url", title: "URL", type: "url" }),
      ],
    }),
    defineField({
      name: "socialLinks",
      title: "Social links",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "platform", title: "Platform", type: "string" }),
            defineField({ name: "url", title: "URL", type: "url" }),
          ],
          preview: {
            select: { title: "platform", subtitle: "url" },
          },
        }),
      ],
    }),
    defineField({
      name: "footerText",
      title: "Footer text",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "womGroupId",
      title: "Wise Old Man group ID",
      type: "number",
      description:
        "The clan's Wise Old Man group ID — the number in its URL, e.g. " +
        "wiseoldman.net/groups/1234 → 1234. Set this to enable the live " +
        "Roster, Hiscores and Gains tabs. Leave blank to hide them.",
      validation: (rule) => rule.positive().integer(),
    }),
    defineField({
      name: "showWomTabs",
      title: "Show Wise Old Man tabs",
      type: "boolean",
      description:
        "Show the Roster / Hiscores / Gains tabs in the nav (requires a group " +
        "ID above). Turn off to hide them without removing the group ID.",
      initialValue: true,
    }),
    defineField({
      name: "womContent",
      title: "Wise Old Man tab headers",
      type: "object",
      description:
        "Custom heading text for the Roster, Hiscores and Gains tabs. Leave " +
        "any field blank to use the built-in default text.",
      options: { collapsible: true, collapsed: true },
      fields: [
        defineField({ name: "roster", title: "Roster", type: "womTabHeader" }),
        defineField({
          name: "hiscores",
          title: "Hiscores",
          type: "womTabHeader",
        }),
        defineField({ name: "gains", title: "Gains", type: "womTabHeader" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
