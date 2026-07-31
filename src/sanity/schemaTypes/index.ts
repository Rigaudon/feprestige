import type { SchemaTypeDefinition } from "sanity";

import { page } from "./page";
import { siteSettings } from "./siteSettings";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [siteSettings, page],
};
