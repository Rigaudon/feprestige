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
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
