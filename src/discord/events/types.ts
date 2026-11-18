// Types for scheduled Discord "events": short-lived (≈ a week) campaigns that post
// to a channel on their own schedule with their own logic.
//
// Two layers, so logic is reusable across events:
//   - an event KIND (kinds/*.ts) is the reusable "what to post" logic, exported as
//     a factory taking kind-specific options and returning a `PostBuilder`;
//   - an event INSTANCE (registry.ts) configures one run of a kind: id, channel,
//     window, crontab, time zone.

/** A message to send. Extend with `embeds` etc. as kinds need them. */
export interface ScheduledPost {
  content: string;
}

/** What a kind's builder receives on each due tick. */
export interface EventContext {
  /** The tick time (the cron's scheduled minute, not wall-clock "now"). */
  now: Date;
  /** The instance being run — lets a kind read its own window/channel. */
  event: ScheduledEvent;
}

/** A kind's logic. Return null to post nothing this tick. */
export type PostBuilder = (ctx: EventContext) => Promise<ScheduledPost | null>;

export interface ScheduledEvent {
  /** Unique, stable id (kebab-case). Used in logs and `?event=` on the route. */
  id: string;
  /** Discord channel id to post in. The bot needs View Channel + Send Messages. */
  channelId: string;
  /**
   * Active window, ISO 8601 with an explicit offset (e.g. "2026-11-20T00:00:00Z"
   * or "2026-11-20T19:00:00-05:00"). Runs while start <= tick < end.
   */
  start: string;
  end: string;
  /**
   * Standard 5-field crontab (minute hour day-of-month month day-of-week),
   * numeric values only: `*`, lists `1,3`, ranges `1-5`, steps `*\/15`, `0-30/10`.
   * Evaluated against a one-minute base tick, so any minute is valid.
   */
  cron: string;
  /** IANA zone the crontab is read in (e.g. "America/New_York"). Default "UTC". */
  timeZone?: string;
  /** The kind's builder, e.g. `helloWorld({ ... })`. */
  post: PostBuilder;
}
