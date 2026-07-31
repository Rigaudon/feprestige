import { defineField, defineType } from "sanity";

// Optional roster entry. The schema ships ready to use; wire up a roster tab
// when the clan wants one (query membersQuery in sanity/queries.ts).
export const member = defineType({
  name: "member",
  title: "Member",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      description: "e.g. Leader, Officer, Member.",
    }),
    defineField({
      name: "avatar",
      title: "Avatar",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "joinedDate",
      title: "Joined date",
      type: "date",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 0,
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "avatar" },
  },
});
