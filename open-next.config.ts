import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

// OpenNext (ISR/SSG) cache configuration.
//
// - incrementalCache (R2): persistent store for prerendered pages. Without it the
//   cache is in-memory only — empty on every cold worker isolate — so pages are
//   perpetual MISSes and get re-rendered (re-fetching WOM) on every request. That
//   made WOM pages 5–6s TTFB and could wedge the worker. With R2, pages are stored
//   once and served from cache; the heavy WOM fetch only runs during background
//   revalidation (stale-while-revalidate). Requires the NEXT_INC_CACHE_R2_BUCKET
//   binding (see wrangler.jsonc).
//
// - tagCache (D1): makes on-demand revalidation actually work. revalidateTag()
//   from the /api/revalidate webhook records the invalidation here; on the next
//   read OpenNext sees the tag was revalidated and regenerates. WITHOUT a tagCache
//   revalidateTag is a silent no-op on Cloudflare, so a publish would only surface
//   via the 1h time-based revalidate in sanity/client.ts. Requires the
//   NEXT_TAG_CACHE_D1 binding; the deploy provisions its schema.
//
// - queue "direct": runs background ISR revalidation via the worker's own service
//   binding (WORKER_SELF_REFERENCE) — no Durable Object / external queue.
//
// Note: the previous withRegionalCache(..., "long-lived") wrapper was dropped. It
// fronts R2 with the per-datacenter Cache API but pins each page for its full
// revalidate window (1h), which would keep serving stale content after a publish
// unless paired with an Enterprise cache-tag purge. Plain R2 keeps tag
// revalidation authoritative and propagating in seconds; R2 read latency is
// negligible and the WOM re-render (the real cost) is still cached.
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: "direct",
});
