import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";

// Persistent incremental (ISR/SSG) cache backed by an R2 bucket.
//
// Why: without this, the incremental cache is in-memory only — empty on every
// cold worker isolate — so prerendered pages are perpetual cache MISSes and get
// re-rendered (re-fetching WOM) on every request. That made the WOM pages take
// 5–6s TTFB and could wedge the single worker (the Gains tab took the whole site
// down). With R2, prerendered pages are stored once and served from cache; the
// heavy WOM fetch only runs during background revalidation (stale-while-
// revalidate), never on the visitor's request.
//
// - withRegionalCache: fronts R2 with the per-datacenter Cache API so repeated
//   reads in a region avoid an R2 round-trip. "long-lived" reuses ISR/SSG
//   entries for up to 30 min per region.
// - queue "direct": performs background ISR revalidation via the worker's own
//   service binding (WORKER_SELF_REFERENCE in wrangler.jsonc) — no Durable
//   Object / external queue to provision.
//
// Requires an R2 bucket bound as NEXT_INC_CACHE_R2_BUCKET (see wrangler.jsonc).
// Note: on-demand revalidateTag (the /api/revalidate webhook) needs a tagCache
// to purge the persisted cache; without one it's a no-op and the 1h time-based
// revalidate handles freshness. Add a D1/DO tagCache later if instant publish is
// wanted.
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  queue: "direct",
});
