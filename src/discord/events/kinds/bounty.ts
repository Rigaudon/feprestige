// Event kind: "bounty" — each post names one random raid and N distinct random
// bosses for members to go after.
//
// The boss pool comes from Wise Old Man, like the Hiscores board: the keys under
// a member snapshot's `bosses` bucket, so a boss WOM adds later joins the pool on
// its own. The group id is the one editors set in Sanity Site Settings, and the
// bulk-hiscores read shares the Hiscores page's 1h Data Cache entry, so most ticks
// cost no WOM request. If WOM is unreachable we fall back to the static boss hints
// in wom/metrics.ts rather than skipping the post.

import { METRIC_PROPS, metricName } from "@/wom/metrics";
import { getGroupBulkHiscores } from "@/wom/queries";
import { getWomPageSettings } from "@/wom/settings";

import type { PostBuilder } from "../types";

export interface Raid {
  name: string;
  /** WOM boss keys for this raid and its variants — kept out of the boss pool. */
  womKeys: string[];
}

export const RAIDS: Raid[] = [
  {
    name: "Chambers of Xeric",
    womKeys: ["chambers_of_xeric", "chambers_of_xeric_challenge_mode"],
  },
  {
    name: "Theatre of Blood",
    womKeys: ["theatre_of_blood", "theatre_of_blood_hard_mode"],
  },
  {
    name: "Tombs of Amascut",
    womKeys: ["tombs_of_amascut", "tombs_of_amascut_expert"],
  },
  { name: "The Fractured Archive", womKeys: ["the_fractured_archive"] },
];

export interface BountyOptions {
  /** Raids to draw from. Default: RAIDS. */
  raids?: Raid[];
  /** How many distinct bosses per post. Default 3. */
  bossCount?: number;
  /** Extra WOM boss keys to exclude (e.g. "wintertodt"). Raid keys always are. */
  excludeBosses?: string[];
}

/** WOM boss keys: live from the clan's hiscores, else the static hint table. */
async function womBossKeys(): Promise<string[]> {
  const { groupId } = await getWomPageSettings("hiscores");
  if (groupId) {
    const entries = await getGroupBulkHiscores(groupId);
    const bosses = entries.find((e) => e.data?.data?.bosses)?.data.data.bosses;
    if (bosses && Object.keys(bosses).length > 0) return Object.keys(bosses);
  }
  return Object.entries(METRIC_PROPS)
    .filter(([, p]) => p.type === "boss")
    .map(([key]) => key);
}

/** `n` distinct random picks (Fisher–Yates on a copy). */
function sample<T>(items: T[], n: number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function bounty(opts: BountyOptions = {}): PostBuilder {
  const raids = opts.raids ?? RAIDS;
  const bossCount = opts.bossCount ?? 3;

  return async () => {
    const excluded = new Set([
      ...RAIDS.flatMap((r) => r.womKeys),
      ...(opts.excludeBosses ?? []),
    ]);
    const pool = (await womBossKeys()).filter((k) => !excluded.has(k));
    if (raids.length === 0 || pool.length < bossCount) {
      throw new Error(
        `bounty: not enough to draw from (${raids.length} raids, ${pool.length} bosses)`,
      );
    }

    const [raid] = sample(raids, 1);
    const bosses = sample(pool, bossCount).map(metricName);
    return {
      content: [
        "Active Bounty:",
        `Raid: ${raid.name}`,
        `Bosses: ${bosses.join(", ")}`,
      ].join("\n"),
    };
  };
}
