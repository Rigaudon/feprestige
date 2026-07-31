// Hand-written subset of the Wise Old Man API response types — only the fields
// we render. Cribbed from the WOM docs / @wise-old-man/utils. Kept minimal and
// local so we don't depend on the full client package (worker-bundle budget).
// See https://docs.wiseoldman.net for the authoritative shapes.

import type { Metric } from "./metrics";

export type Period = "day" | "week" | "month" | "year";

// A player's account type/build/status are free-form-ish enums; we only display
// them, so strings are enough.
export interface Player {
  id: number;
  username: string;
  displayName: string;
  type: string; // "regular" | "ironman" | "hardcore" | "ultimate" | ...
  build: string; // "main" | "f2p" | "lvl3" | "1def" | ...
  country: string | null; // ISO-3166 alpha-2, e.g. "US"
  status: string; // "active" | "unranked" | "flagged" | ...
  exp: number;
  ehp: number;
  ehb: number;
  ttm: number;
  updatedAt: string | null;
}

// A group membership as returned by group-centric endpoints (includes player).
export interface GroupMembership {
  playerId: number;
  groupId: number;
  role: string | null; // WOM group role, e.g. "owner", "deputy_owner", "member"
  createdAt: string;
  player: Player;
}

export interface GroupSocialLinks {
  website?: string | null;
  discord?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  twitch?: string | null;
}

export interface GroupDetails {
  id: number;
  name: string;
  clanChat: string | null;
  description: string | null;
  homeworld: number | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  socialLinks?: GroupSocialLinks;
  memberships: GroupMembership[];
}

// One metric's entry inside a player's snapshot. The available fields depend on
// the metric type: skills have level+experience, bosses have kills, activities
// have score, computed metrics have value. All have rank.
export interface SnapshotMetricEntry {
  metric: Metric;
  rank: number;
  level?: number; // skills
  experience?: number; // skills
  kills?: number; // bosses
  score?: number; // activities
  value?: number; // computed
  ehp?: number; // skills
  ehb?: number; // bosses
}

export interface SnapshotData {
  skills: Record<string, SnapshotMetricEntry>;
  bosses: Record<string, SnapshotMetricEntry>;
  activities: Record<string, SnapshotMetricEntry>;
  computed: Record<string, SnapshotMetricEntry>;
}

export interface Snapshot {
  playerId: number;
  createdAt: string;
  data: SnapshotData;
}

// /groups/{id}/bulk-hiscores — every member's latest snapshot in one call.
export interface BulkHiscoresEntry {
  player: Player;
  data: Snapshot;
}

// One metric's gain over a period: { metric, start, end, gained }.
export interface MetricGain {
  metric: Metric;
  start: number;
  end: number;
  gained: number;
}

// /groups/{id}/bulk-gained — every member's gains across all metrics.
export interface BulkGainsEntry {
  player: Player;
  startDate: string;
  endDate: string;
  data: MetricGain[];
}
