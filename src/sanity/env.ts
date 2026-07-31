// Sanity project configuration, read from environment variables.
// See .env.example for the full list. projectId/dataset are safe to expose
// (they're public), which is why they use the NEXT_PUBLIC_ prefix.

export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-01-01";

export const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

// Empty when the project hasn't been connected yet. The data layer treats an
// empty projectId as "not configured" and returns fallbacks so the site still
// builds before Sanity is wired up. See sanity/client.ts.
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";

// True once a real Sanity project id has been provided.
export const isSanityConfigured = projectId.length > 0;
