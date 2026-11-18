// Typed WOM query helpers over `womFetch`. Each returns a safe empty fallback so
// pages render an empty state when the group id is unset or the API is down.

import { womFetch } from "./client";
import type { MetricType } from "./metrics";
import type {
  BulkGainsEntry,
  BulkHiscoresEntry,
  GroupDetails,
  Period,
  SnapshotData,
  SnapshotMetricEntry,
} from "./types";

// Roster: group details incl. memberships (player + role).
export function getGroupDetails(groupId: number) {
  return womFetch<GroupDetails | null>({
    path: `/groups/${groupId}`,
    tags: ["wom-group"],
    fallback: null,
  });
}

// Hiscores: every member's latest snapshot in a single request.
export function getGroupBulkHiscores(groupId: number) {
  return womFetch<BulkHiscoresEntry[]>({
    path: `/groups/${groupId}/bulk-hiscores`,
    tags: ["wom-hiscores"],
    fallback: [],
  });
}

// Gains: every member's gains across all metrics for a period.
export function getBulkGroupGains(groupId: number, period: Period) {
  return womFetch<BulkGainsEntry[]>({
    path: `/groups/${groupId}/bulk-gained`,
    params: { period },
    tags: [`wom-gains-${period}`],
    fallback: [],
  });
}

// --- snapshot value helpers -------------------------------------------------

// Which snapshot bucket holds each metric type. WOM files every metric under one
// of these, so the bucket a key sits in *is* its type — no lookup table needed.
export const CATEGORY_BY_TYPE: Record<MetricType, keyof SnapshotData> = {
  skill: "skills",
  boss: "bosses",
  activity: "activities",
  computed: "computed",
};

// The primary sortable value of a snapshot entry (exp / kills / score / value).
// Returns -1 (WOM's "unranked" sentinel) when absent.
export function entryValue(
  entry: SnapshotMetricEntry | undefined,
  type: MetricType,
): number {
  if (!entry) return -1;
  switch (type) {
    case "skill":
      return entry.experience ?? -1;
    case "boss":
      return entry.kills ?? -1;
    case "activity":
      return entry.score ?? -1;
    case "computed":
      return entry.value ?? -1;
  }
}
