import type { SchemaTypeDefinition } from "sanity";

import { page } from "./page";
import { siteSettings } from "./siteSettings";
import { videoEmbed } from "./videoEmbed";
import { womTabHeader } from "./womTabHeader";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [siteSettings, page, videoEmbed, womTabHeader],
};
