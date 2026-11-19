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

// `next build` sets NEXT_PHASE. Only then is an empty fallback acceptable (the
// build must succeed even when WOM is unreachable, e.g. behind the dev Mac's
// proxy); at runtime the next ISR revalidation replaces it.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

// Statuses worth one retry: rate limiting and transient upstream failures.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch JSON from the WOM API with Next.js Data Cache tagging + 1h revalidate.
 *
 * Failure handling depends on where we are:
 *
 * - **Build:** returns `fallback` on any error so the site always builds (also
 *   covers the local corporate-proxy fetch failure; it works on Cloudflare).
 * - **Runtime (ISR revalidation):** retries once, then THROWS. This matters: a
 *   page rendered from `fallback` looks like a successful render, so ISR would
 *   store the empty "couldn't reach WOM" page in the R2 cache and serve it for
 *   the full revalidate window (and beyond, until the next visit). A thrown error
 *   instead fails the revalidation, so OpenNext keeps serving the last good page
 *   and simply retries on a later request. Non-200 responses are never written
 *   to the Data Cache either, so nothing bad is persisted.
 *
 * Unauthenticated WOM is limited to 20 req/60s *per IP*, and Cloudflare Workers
 * egress from IPs shared with other tenants, so 429s happen even though we only
 * make a handful of requests. Setting the WOM_API_KEY worker secret lifts that.
 *
 * Callers that genuinely want a soft fallback at runtime (e.g. the bounty
 * event's boss list) should catch.
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
  // Optional, server-only runtime secret. Not required for reads, but raises the
  // per-IP rate limit, which shared Cloudflare egress IPs otherwise exhaust.
  if (process.env.WOM_API_KEY) headers["x-api-key"] = process.env.WOM_API_KEY;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);
    try {
      const res = await fetch(url, {
        headers,
        next: { tags: [WOM_TAG, ...tags], revalidate: 3600 },
      });
      if (res.ok) return (await res.json()) as T;
      lastError = new Error(`WOM ${path} responded ${res.status}`);
      if (!RETRYABLE.has(res.status)) break;
    } catch (err) {
      lastError = err;
    }
  }

  if (IS_BUILD) {
    console.warn(`[wom] ${path} failed at build, using fallback:`, lastError);
    return fallback;
  }
  console.error(`[wom] ${path} failed:`, lastError);
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
