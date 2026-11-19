// Event kind: "bounty" — each post names one random raid and N distinct random
// bosses for members to go after.
//
// The boss pool comes from Wise Old Man, like the Hiscores board: the keys under
// a member snapshot's `bosses` bucket, so a boss WOM adds later joins the pool on
// its own. The group id is the one editors set in Sanity Site Settings, and the
// bulk-hiscores read shares the Hiscores page's 1h Data Cache entry, so most ticks
// cost no WOM request. If WOM is unreachable we fall back to the static boss hints
// in wom/metrics.ts rather than skipping the post.
//
// No back-to-back repeats: before rolling, we read the channel's recent history,
// find the latest bot-authored "Active Bounty:" post, and exclude its raid and
// bosses. The channel itself is the state — no storage to keep in sync, and it
// stays correct across deploys or if a post is deleted. Needs the bot to have
// Read Message History in the channel; if that read fails the tick errors
// rather than risk posting a repeat.

import { discordFetch } from "@/discord/client";
import type { DiscordMessage } from "@/discord/types";
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
    // womFetch throws at runtime when WOM is down; the static table is fine here.
    const entries = await getGroupBulkHiscores(groupId).catch(() => []);
    const bosses = entries.find((e) => e.data?.data?.bosses)?.data.data.bosses;
    if (bosses && Object.keys(bosses).length > 0) return Object.keys(bosses);
  }
  return Object.entries(METRIC_PROPS)
    .filter(([, p]) => p.type === "boss")
    .map(([key]) => key);
}

const HEADER = "Active Bounty:";

/** How far back to look for the previous bounty: pages of 100 (Discord's max). */
const HISTORY_PAGES = 5;

/** Newest bot-authored bounty post in the channel, searching back a few pages. */
async function findLastBounty(channelId: string) {
  let before: string | undefined;
  for (let page = 0; page < HISTORY_PAGES; page++) {
    const messages = await discordFetch<DiscordMessage[]>(
      `/channels/${channelId}/messages?limit=100${before ? `&before=${before}` : ""}`,
    );
    // Newest first. Only trust bot posts so a member quoting the format can't
    // steer the roll.
    const hit = messages.find(
      (m) => m.author?.bot && m.content.startsWith(HEADER),
    );
    if (hit) return hit;
    if (messages.length < 100) return undefined; // reached the channel's start
    before = messages[messages.length - 1].id;
  }
  return undefined;
}

/** Raid + boss names from this channel's most recent bounty post, if any. */
async function previousBounty(
  channelId: string,
): Promise<{ raid?: string; bosses: string[] }> {
  const last = await findLastBounty(channelId);
  if (!last) return { bosses: [] };
  const field = (label: string) =>
    last.content
      .split("\n")
      .find((l) => l.startsWith(`${label}: `))
      ?.slice(label.length + 2)
      .trim();
  return {
    raid: field("Raid"),
    bosses: (field("Bosses") ?? "")
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean),
  };
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

  return async ({ event }) => {
    const prev = await previousBounty(event.channelId);

    const excluded = new Set([
      ...RAIDS.flatMap((r) => r.womKeys),
      ...(opts.excludeBosses ?? []),
    ]);
    const prevBosses = new Set(prev.bosses);
    // Compared by display name, since that's what the previous post contains.
    const pool = (await womBossKeys())
      .filter((k) => !excluded.has(k))
      .map(metricName)
      .filter((name) => !prevBosses.has(name));
    const raidPool = raids.filter((r) => r.name !== prev.raid);
    if (raidPool.length === 0 || pool.length < bossCount) {
      throw new Error(
        `bounty: not enough to draw from (${raidPool.length} raids, ${pool.length} bosses)`,
      );
    }

    const [raid] = sample(raidPool, 1);
    const bosses = sample(pool, bossCount);
    return {
      content: [
        HEADER,
        `Raid: ${raid.name}`,
        `Bosses: ${bosses.join(", ")}`,
      ].join("\n"),
    };
  };
}
