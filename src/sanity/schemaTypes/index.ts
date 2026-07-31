import type { SchemaTypeDefinition } from "sanity";

import { member } from "./member";
import { page } from "./page";
import { siteSettings } from "./siteSettings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [siteSettings, page, member],
};
