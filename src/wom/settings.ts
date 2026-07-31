// Server-only helper: resolve the clan's WOM group ID from Sanity siteSettings.
// The nav also reads `showWomTabs` to decide visibility; the pages themselves
// only need the group ID (they render an empty state without one).

import { sanityFetch } from "@/sanity/client";
import { settingsQuery } from "@/sanity/queries";
import type { Settings } from "@/sanity/types";

export async function getWomGroupId(): Promise<number | null> {
  const settings = await sanityFetch<Settings | null>({
    query: settingsQuery,
    fallback: null,
  });
  return settings?.womGroupId ?? null;
}
