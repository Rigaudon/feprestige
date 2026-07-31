// Typed WOM query helpers over `womFetch`. Each returns a safe empty fallback so
// pages render an empty state when the group id is unset or the API is down.

import { womFetch } from "./client";
import { METRIC_PROPS, type Metric, type MetricType } from "./metrics";
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

const CATEGORY_BY_TYPE: Record<MetricType, keyof SnapshotData> = {
  skill: "skills",
  boss: "bosses",
  activity: "activities",
  computed: "computed",
};

function metricEntry(
  data: SnapshotData,
  metric: Metric,
): SnapshotMetricEntry | undefined {
  const type = METRIC_PROPS[metric]?.type;
  if (!type) return undefined;
  return data[CATEGORY_BY_TYPE[type]]?.[metric];
}

// The primary sortable value for a metric within a snapshot (exp / kills / score
// / value). Returns -1 (WOM's "unranked" sentinel) when absent.
export function snapshotValue(data: SnapshotData, metric: Metric): number {
  const entry = metricEntry(data, metric);
  if (!entry) return -1;
  switch (METRIC_PROPS[metric].type) {
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

export function snapshotRank(data: SnapshotData, metric: Metric): number {
  return metricEntry(data, metric)?.rank ?? -1;
}

// Skill level (only meaningful for skill metrics).
export function snapshotLevel(
  data: SnapshotData,
  metric: Metric,
): number | undefined {
  return metricEntry(data, metric)?.level;
}
