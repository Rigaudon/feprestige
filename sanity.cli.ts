import { defineCliConfig } from "sanity/cli";

import { dataset, projectId } from "./src/sanity/env";

// Enables the Sanity CLI (`npx sanity ...`) for tasks like schema deploys and
// TypeGen. Reads the same env vars as the app.
export default defineCliConfig({
  api: { projectId, dataset },
});
