// Server-only helper: resolve the clan's WOM group ID and the editor-controlled
// tab headers from Sanity siteSettings in a single fetch. The nav reads
// `showWomTabs` separately to decide visibility; the pages need the group ID
// (they render an empty state without one) and their header text.

import { sanityFetch } from "@/sanity/client";
import { settingsQuery } from "@/sanity/queries";
import type { Settings, WomTabHeader } from "@/sanity/types";

export type WomTab = "roster" | "hiscores" | "gains";

export interface WomPageSettings {
  groupId: number | null;
  header: WomTabHeader;
}

// One Sanity read per page, returning the group ID plus the (optional) custom
// header for the given tab. Blank header fields come back undefined, so pages
// fall back to their built-in defaults.
export async function getWomPageSettings(tab: WomTab): Promise<WomPageSettings> {
  const settings = await sanityFetch<Settings | null>({
    query: settingsQuery,
    fallback: null,
  });
  return {
    groupId: settings?.womGroupId ?? null,
    header: settings?.womContent?.[tab] ?? {},
  };
}
