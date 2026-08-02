// Server-side clients for Discord ingest.
//
// - `discordFetch` calls the Discord REST API with the bot token. It THROWS on
//   failure so the sync route can report/stop (a failed ingest should be loud).
// - `readManifestCached` reads the public manifest for the page and is
//   build-resilient (returns an empty manifest on any error), mirroring wom's
//   `womFetch` so the site builds/renders even without the CDN base set or behind
//   the local corporate proxy.

import { DROPS_TAG, MANIFEST_KEY, dropsCdnBase } from "./env";
import { EMPTY_MANIFEST, type Manifest } from "./types";

const DISCORD_API = "https://discord.com/api/v10";

// Courtesy identifier, like the WOM user agent — not a secret.
const USER_AGENT = "FE Prestige clan site (github.com/feprestige)";

/**
 * Authenticated Discord REST GET. Server-only. Retries a couple of times on 429
 * using the server-provided retry delay, then throws on any non-2xx.
 */
export async function discordFetch<T>(path: string): Promise<T> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN is not set");

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${DISCORD_API}${path}`, {
      headers: { Authorization: `Bot ${token}`, "User-Agent": USER_AGENT },
      cache: "no-store",
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") ?? "1");
      // Cap the wait so a single invocation can't hang for long.
      await new Promise((r) => setTimeout(r, Math.min(retryAfter, 5) * 1000));
      continue;
    }
    if (!res.ok) {
      throw new Error(
        `Discord API ${res.status} for ${path}: ${await res.text()}`,
      );
    }
    return (await res.json()) as T;
  }
  throw new Error(`Discord API repeatedly rate-limited for ${path}`);
}

/**
 * Build-resilient manifest read for the Drops page. Uses the Next.js Data Cache
 * (tagged + 1h revalidate) exactly like `womFetch`, and falls back to an empty
 * manifest so the page always renders.
 */
export async function readManifestCached(): Promise<Manifest> {
  if (!dropsCdnBase) return EMPTY_MANIFEST;
  try {
    const res = await fetch(`${dropsCdnBase}/${MANIFEST_KEY}`, {
      next: { tags: [DROPS_TAG], revalidate: 3600 },
    });
    if (!res.ok) return EMPTY_MANIFEST;
    return (await res.json()) as Manifest;
  } catch {
    return EMPTY_MANIFEST;
  }
}
