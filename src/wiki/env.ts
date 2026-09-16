// Configuration for the OSRS Wiki Sync ("Combat Achievements") ingest + page.
// Modeled on src/discord/env.ts. Nothing here is a secret: both upstream APIs
// are anonymous, and the manifest is stored in — and read from — the same public
// R2 bucket the Drops images already use.

import { dropsCdnBase } from "@/discord/env";

// The RuneLite "Wiki Sync" plugin backend. `GET {base}/{username}/STANDARD`
// returns whatever that player last synced from the game; we only read
// `combat_achievements`. No auth, but it 403s without a User-Agent, and only
// the STANDARD world type is accepted.
export const WIKI_SYNC_BASE = "https://sync.runescape.wiki/runelite/player";

// The wiki proper (MediaWiki). We query its `Bucket` extension for the live
// combat achievement task table — see client.ts.
export const WIKI_API_BASE = "https://oldschool.runescape.wiki/api.php";

// Next.js Data Cache tag for the Combat Achievements page; the sync route
// invalidates it so a finished batch surfaces without waiting for the 1h
// time-based revalidate.
export const WIKI_TAG = "wiki-ca";

// Object key inside the EXISTING Drops bucket. This is a different dataset, but
// sharing the bucket (and its public domain) means no new binding, env var or
// DNS record — one less thing in the ownership handoff. Hence the `wiki/` prefix.
export const WIKI_MANIFEST_KEY = "wiki/manifest.json";

// The bucket binding is shared with Drops; aliased for readable call sites.
export { DROPS_BUCKET_BINDING as WIKI_BUCKET_BINDING } from "@/discord/env";

// Public URL the page reads the manifest from. `dropsCdnBase` is a build-time
// value with a baked-in default (see discord/env.ts), so this is safe to gate
// prerendered UI on — unlike a runtime wrangler secret.
export const wikiManifestUrl = `${dropsCdnBase}/${WIKI_MANIFEST_KEY}`;

// Whether the Combat Achievements page can render — i.e. we know where the
// manifest is served from. Public + build-time, like `isDropsConfigured`.
export const isWikiConfigured = dropsCdnBase.length > 0;
