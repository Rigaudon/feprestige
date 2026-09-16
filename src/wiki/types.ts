// Shape of the manifest we keep in R2 for the Combat Achievements tab.
// Field names are short because this file is fetched by the page on every
// revalidation; at a 300-member roster it lands around 60 KB.

import type { CaTierTable } from "./ca";

export interface CaEntry {
  n: string; // WOM display name (the manifest is keyed by its lowercase form)
  b: string; // base64 bitmap of completed task ids — see ca.ts encodeCompleted
  t: number[]; // completed tasks per tier, indexed like CA_TIERS
  d: number; // completed tasks overall
  p: number; // CA points
  u: string; // ISO — when these numbers last CHANGED
  c: string; // ISO — when we last checked
}

export interface WikiManifest {
  syncedAt: string | null; // end of the most recent batch
  cycleStartedAt: string | null; // start of the current pass over the roster
  cursor: number; // index into `members`; 0 means "start a new cycle"
  members: string[]; // WOM display names, refreshed at cycle start
  // The live task table, inlined so the page needs exactly one HTTP read and
  // can never render counts against a mismatched table.
  ca: { tiers: CaTierTable; fetchedAt: string } | null;
  players: Record<string, CaEntry>; // keyed by lowercased display name
}

export const EMPTY_WIKI_MANIFEST: WikiManifest = {
  syncedAt: null,
  cycleStartedAt: null,
  cursor: 0,
  members: [],
  ca: null,
  players: {},
};

/**
 * Why a player's `u` (last changed) is the only staleness signal we have: the
 * sync API stamps its response with the REQUEST time, not the time the player
 * last synced from RuneLite, so a member who stopped playing two years ago is
 * indistinguishable from one who synced this morning — except that their
 * numbers never move.
 */
