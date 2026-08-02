// Configuration for the Discord "Drops" (drop of the week) ingest + page.
// Modeled on sanity/env.ts and the wom module. The bot token and sync secret are
// server-only; the CDN base is public (it ships in <img> src). The ingest layer
// is generic/channel-parameterized so a future channel could reuse it — only the
// defaults here are drops-specific.

// The drop-of-the-week channel. Defaults to the clan's channel id (a public,
// non-secret identifier) so builds/deploys need no env config; override with
// DISCORD_DROPS_CHANNEL_ID for a different channel or local testing.
export const DROPS_CHANNEL_ID =
  process.env.DISCORD_DROPS_CHANNEL_ID || "1434049805688115221";

// Next.js Data Cache tag for the Drops page; the sync route invalidates it so
// newly-ingested drops surface without waiting for the 1h time-based revalidate.
export const DROPS_TAG = "discord-drops";

// R2 binding name (see wrangler.jsonc r2_buckets) holding re-hosted drop images
// and the manifest.
export const DROPS_BUCKET_BINDING = "DROPS_BUCKET";

// Manifest object key at the bucket root.
export const MANIFEST_KEY = "manifest.json";

// Public base URL images are served from — the bucket's r2.dev URL for now, a
// custom subdomain later. Because the manifest stores only object keys, swapping
// this is the whole migration (no re-ingest). Trailing slashes trimmed.
export const dropsCdnBase = (process.env.NEXT_PUBLIC_DROPS_CDN_BASE || "").replace(
  /\/+$/,
  "",
);

// Server-only, runtime secret. Gates ingest (the sync route / lazy trigger).
// NOT suitable for gating the nav tab: it's absent during `next build`, so the
// statically prerendered nav would drop the tab.
export const isDropsIngestConfigured = Boolean(process.env.DISCORD_BOT_TOKEN);

// Whether the Drops page can render — i.e. we know where images are served from.
// This is a public, build-time value (unlike the bot token), so it's the correct
// signal for gating the nav tab in the prerendered layout.
export const isDropsConfigured = dropsCdnBase.length > 0;

// Public URL for a stored object key.
export function dropUrl(key: string): string {
  return `${dropsCdnBase}/${key}`;
}
