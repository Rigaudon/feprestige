import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { apiVersion, dataset, projectId } from "./src/sanity/env";
import { schema } from "./src/sanity/schemaTypes";

// Configuration for the embedded Studio mounted at /admin (see
// src/app/(studio)/admin/[[...tool]]/page.tsx).
export default defineConfig({
  basePath: "/admin",
  projectId,
  dataset,
  schema,
  // First-party Media Library: a searchable, taggable asset browser for reusing
  // uploads (e.g. emojis dropped inline). Enabling it here makes it an asset
  // source on every image field; the libraryId is auto-detected for the project.
  mediaLibrary: { enabled: true },
  plugins: [
    structureTool(),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
