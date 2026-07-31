// Sanity project configuration, read from environment variables.
// See .env.example for the full list. projectId/dataset are safe to expose
// (they're public), which is why they use the NEXT_PUBLIC_ prefix.

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

// Defaults to the FE Prestige project id — a public, non-secret identifier (it
// ships in the browser bundle anyway). Baking it in means builds/deploys need no
// env-var configuration; .env.local still overrides it for local dev or to point
// at a different project. See sanity/client.ts.
export const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "k00wzpm0";

// True whenever a project id is set (always true given the default above); kept
// so the data layer can still short-circuit to fallbacks if it's ever blanked.
export const isSanityConfigured = projectId.length > 0;
