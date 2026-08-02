// Minimal subset of the Discord API shapes we read, plus our manifest types.
// Kept local and minimal (like wom/types.ts) so we don't depend on a Discord
// client package. See https://discord.com/developers/docs for authoritative shapes.

// A file attached to a message. `url` is a *signed, expiring* CDN link (~24h),
// which is why sync downloads it immediately and re-hosts to R2.
export interface DiscordAttachment {
  id: string; // snowflake — stable, unique; our dedup key
  filename: string;
  content_type?: string;
  size: number;
  url: string;
  width?: number | null;
  height?: number | null;
}

// Forwarded messages carry the original message's content in a snapshot rather
// than in the top-level fields. This is the primary case for the drops channel
// (mods forward member drops), so we must read attachments from here too.
// A mentioned user, as embedded in a message payload — lets us resolve `<@id>`
// tokens to a readable name without a second API call.
export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
}

export interface DiscordMessageSnapshot {
  message: {
    content?: string;
    timestamp?: string;
    attachments?: DiscordAttachment[];
    mentions?: DiscordUser[];
  };
}

export interface DiscordMessage {
  id: string; // snowflake — monotonically increasing, so sortable by time
  content: string;
  timestamp: string; // ISO
  attachments: DiscordAttachment[];
  mentions?: DiscordUser[];
  message_snapshots?: DiscordMessageSnapshot[];
}

// One re-hosted drop, as stored in the manifest and read by the page. Short-ish
// keys keep the serialized payload small when there are many drops.
export interface Drop {
  id: string; // discord attachment id (dedup key)
  key: string; // R2 object key (public URL = dropsCdnBase + "/" + key)
  caption: string; // message / forwarded-snapshot content (may be empty)
  date: string; // ISO timestamp of the source message
  w?: number; // width, to reserve layout space in <Image>
  h?: number; // height
}

export interface Manifest {
  // Newest message id ingested — the incremental cursor (fetch messages after it).
  newestId: string | null;
  // Oldest message id ingested — the backfill cursor (fetch messages before it).
  oldestId: string | null;
  // Whether we've walked the channel back to its beginning.
  backfillComplete: boolean;
  // ISO time of the last successful sync — throttles the lazy trigger.
  syncedAt: string | null;
  drops: Drop[];
}

export const EMPTY_MANIFEST: Manifest = {
  newestId: null,
  oldestId: null,
  backfillComplete: false,
  syncedAt: null,
  drops: [],
};
