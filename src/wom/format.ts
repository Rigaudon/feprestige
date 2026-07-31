// Small presentation helpers shared by the roster / hiscores / gains UIs.

import { METRIC_PROPS, type Metric } from "./metrics";

// Compact number formatting, e.g. 12_345_678 -> "12.3m", 45_600 -> "45.6k".
export function formatNumber(value: number, compact = true): string {
  if (value < 0) return "—"; // WOM uses -1 for unranked
  if (!compact || value < 1000) return value.toLocaleString("en-US");
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

// Prettify a WOM group role slug, e.g. "deputy_owner" -> "Deputy Owner".
export function formatRole(role: string | null | undefined): string {
  if (!role) return "Member";
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// EHP/EHB and other computed values are hours — show one decimal.
export function formatMetricValue(metric: Metric, value: number): string {
  if (value < 0) return "—";
  if (METRIC_PROPS[metric]?.type === "computed") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  return formatNumber(value);
}

export function womPlayerUrl(username: string): string {
  return `https://wiseoldman.net/players/${encodeURIComponent(username)}`;
}

export function womGroupUrl(groupId: number): string {
  return `https://wiseoldman.net/groups/${groupId}`;
}
