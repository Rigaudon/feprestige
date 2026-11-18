// Runs scheduled Discord events (see registry.ts). Called once a minute by the
// Cloudflare cron (custom-worker.ts → /api/discord/events) with the tick's
// scheduled time; posts for every event whose window contains that minute and
// whose crontab matches it.
//
// Outbound-only — no Gateway, nothing always-on — so it fits the free Workers
// tier. Events are isolated: a bad crontab or a failing post in one event is
// reported in the result and doesn't stop the others.

import { discordFetch } from "../client";
import { cronMatches } from "./cron";
import { EVENTS } from "./registry";
import type { ScheduledEvent, ScheduledPost } from "./types";

export type EventResult =
  | { id: string; status: "posted"; messageId: string }
  | { id: string; status: "dry-run"; content: string }
  | { id: string; status: "skipped"; reason: string }
  | { id: string; status: "error"; error: string };

function inWindow(e: ScheduledEvent, at: Date): boolean {
  const start = Date.parse(e.start);
  const end = Date.parse(e.end);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error(`Invalid start/end ("${e.start}", "${e.end}")`);
  }
  return start <= at.getTime() && at.getTime() < end;
}

async function send(channelId: string, post: ScheduledPost): Promise<string> {
  const msg = await discordFetch<{ id: string }>(
    `/channels/${channelId}/messages`,
    {
      body: {
        content: post.content,
        // Never ping anyone from an automated post, whatever the content says.
        allowed_mentions: { parse: [] },
      },
    },
  );
  return msg.id;
}

async function runOne(
  e: ScheduledEvent,
  at: Date,
  opts: { dryRun: boolean; force: boolean },
): Promise<EventResult> {
  try {
    if (!opts.force) {
      if (!inWindow(e, at)) return { id: e.id, status: "skipped", reason: "outside window" };
      if (!cronMatches(e.cron, at, e.timeZone)) {
        return { id: e.id, status: "skipped", reason: "not scheduled this minute" };
      }
    }
    const post = await e.post({ now: at, event: e });
    if (!post) return { id: e.id, status: "skipped", reason: "nothing to post" };
    if (opts.dryRun) return { id: e.id, status: "dry-run", content: post.content };
    return { id: e.id, status: "posted", messageId: await send(e.channelId, post) };
  } catch (err) {
    return { id: e.id, status: "error", error: String(err) };
  }
}

/**
 * Run every due event for the minute containing `at`.
 * - `only`: restrict to one event id.
 * - `force`: ignore window + crontab (requires `only`) — for manual testing.
 * - `dryRun`: build posts but don't send.
 */
export async function runDueEvents(
  at: Date,
  opts: { dryRun?: boolean; only?: string; force?: boolean } = {},
): Promise<EventResult[]> {
  // Match on the whole minute: cron ticks can land a few ms/s past the boundary.
  const minute = new Date(Math.floor(at.getTime() / 60_000) * 60_000);
  const force = Boolean(opts.force && opts.only);
  const events = opts.only ? EVENTS.filter((e) => e.id === opts.only) : EVENTS;
  if (opts.only && events.length === 0) {
    return [{ id: opts.only, status: "error", error: "no such event" }];
  }
  // Sequential: a handful of events at most, and it keeps Discord rate limits simple.
  const results: EventResult[] = [];
  for (const e of events) {
    results.push(await runOne(e, minute, { dryRun: Boolean(opts.dryRun), force }));
  }
  return results;
}
