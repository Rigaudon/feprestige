import { createClient, type QueryParams } from "next-sanity";

import { apiVersion, dataset, isSanityConfigured, projectId } from "./env";

// A global tag applied to every query so the revalidation webhook can refresh
// the whole site with a single revalidateTag('sanity') on any publish.
export const SANITY_TAG = "sanity";

export const client = createClient({
  // "placeholder" keeps createClient from throwing before the project is
  // connected; sanityFetch short-circuits (isSanityConfigured) so it's never used.
  projectId: projectId || "placeholder",
  dataset,
  apiVersion,
  // useCdn:false so build-time and on-demand revalidation always fetch fresh
  // content from the API. Next.js's Data Cache (below) handles caching/serving.
  useCdn: false,
});

/**
 * Fetch content from Sanity with sensible caching + tagging for Next.js.
 *
 * - Before the project is connected (no projectId), returns `fallback` so the
 *   site still builds and renders.
 * - Otherwise opts the request into the Data Cache, tagged so the webhook at
 *   /api/revalidate can invalidate it on publish. A 1h time-based revalidate
 *   acts as a safety net if a webhook is ever missed.
 */
export async function sanityFetch<T>({
  query,
  params = {},
  tags = [],
  fallback,
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
  fallback: T;
}): Promise<T> {
  if (!isSanityConfigured) return fallback;

  return client.fetch<T>(query, params, {
    next: { tags: [SANITY_TAG, ...tags], revalidate: 3600 },
  });
}
