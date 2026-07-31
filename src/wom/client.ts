// Thin read-only client for the Wise Old Man API, modeled on sanity/client.ts's
// `sanityFetch`. All calls run server-side at build / revalidate time — visitors
// get static HTML and never hit WOM. Reads are anonymous (no token required).

const WOM_BASE_URL = "https://api.wiseoldman.net/v2";

// A global cache tag so a future revalidation hook could refresh all WOM data at
// once; each query also passes its own tag.
export const WOM_TAG = "wom";

// WOM asks integrators to identify themselves via a user agent so they can make
// contact instead of IP-banning abusive traffic. This is a courtesy contact
// string, not a secret.
const USER_AGENT = "FE Prestige clan site (github.com/feprestige)";

/**
 * Fetch JSON from the WOM API with Next.js Data Cache tagging + 1h revalidate.
 *
 * Build-resilient like `sanityFetch`: returns `fallback` on any error (network,
 * non-2xx, parse) so the site always builds and renders an empty state — this
 * also covers the known local corporate-proxy fetch failure (undici ignores
 * HTTPS_PROXY); it works on Cloudflare.
 *
 * WOM's recommended refresh cadence is 1–6h, so the 1h `revalidate` matches the
 * site's existing Sanity caching and stays far under the 20-req/60s rate limit.
 */
export async function womFetch<T>({
  path,
  params = {},
  tags = [],
  fallback,
}: {
  path: string;
  params?: Record<string, string | number | undefined>;
  tags?: string[];
  fallback: T;
}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const qs = query.toString();
  const url = `${WOM_BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-user-agent": USER_AGENT,
  };
  // Optional, server-only. Not required for reads; only raises the rate limit.
  if (process.env.WOM_API_KEY) headers["x-api-key"] = process.env.WOM_API_KEY;

  try {
    const res = await fetch(url, {
      headers,
      next: { tags: [WOM_TAG, ...tags], revalidate: 3600 },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
