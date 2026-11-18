// Scheduled bot post: on a Cloudflare Cron Trigger, decide what (if anything) to
// say and post it to a configured Discord channel via the REST API.
//
// This is outbound-only — no Gateway connection, no interactions endpoint — so it
// runs on the free Workers tier with nothing always-on. The bot just needs the
// "Send Messages" (and "View Channel") permission in the target channel.
//
// Configuration is in code by design (changing it = commit + deploy):
//   - WHEN: the cron expression in wrangler.jsonc `triggers.crons`, mirrored as
//     POST_CRON in custom-worker.ts (keep the two in sync).
//   - WHERE: POST_CHANNEL_ID below (overridable via DISCORD_POST_CHANNEL_ID).
//   - WHAT: `buildPost()` below. Return null to skip a tick.

import { discordFetch } from "./client";

// Target channel id (a public, non-secret identifier — same convention as
// DROPS_CHANNEL_ID). Currently the clan's bot-test channel. Set to "" to disable:
// the job then no-ops rather than posting somewhere unexpected.
export const POST_CHANNEL_ID =
  process.env.DISCORD_POST_CHANNEL_ID || "1572689016845766656";

/** A message to send. Extend with `embeds` etc. as post types grow. */
export interface ScheduledPost {
  content: string;
}

/**
 * The "what to post" logic. Placeholder for now; swap in real content (WOM
 * gainers, drops recap, CA milestones, …). Return null to post nothing this
 * tick, e.g. when there's nothing new to report.
 */
export async function buildPost(now: Date): Promise<ScheduledPost | null> {
  const unix = Math.floor(now.getTime() / 1000);
  return {
    // <t:…:F> renders in each reader's local time zone.
    content: `👋 Hello world from the FE Prestige bot — scheduled post at <t:${unix}:F>.`,
  };
}

export type ScheduledPostResult =
  | { posted: true; channelId: string; messageId: string }
  | { posted: false; reason: string };

/** Build the post and send it. Throws if Discord rejects the request. */
export async function runScheduledPost(
  now = new Date(),
  opts: { dryRun?: boolean } = {},
): Promise<ScheduledPostResult> {
  if (!POST_CHANNEL_ID) {
    return { posted: false, reason: "POST_CHANNEL_ID not configured" };
  }

  const post = await buildPost(now);
  if (!post) return { posted: false, reason: "nothing to post" };
  if (opts.dryRun) {
    return { posted: false, reason: `dry run: ${post.content}` };
  }

  const msg = await discordFetch<{ id: string }>(
    `/channels/${POST_CHANNEL_ID}/messages`,
    {
      body: {
        content: post.content,
        // Never ping anyone from an automated post, whatever the content says.
        allowed_mentions: { parse: [] },
      },
    },
  );
  return { posted: true, channelId: POST_CHANNEL_ID, messageId: msg.id };
}
