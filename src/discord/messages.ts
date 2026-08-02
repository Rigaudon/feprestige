// Channel message fetching + image extraction for the Drops ingest.

import { discordFetch } from "./client";
import { DROPS_CHANNEL_ID } from "./env";
import type {
  DiscordAttachment,
  DiscordMessage,
  DiscordUser,
} from "./types";

const MESSAGES_PER_PAGE = 100; // Discord's max per request.

// One extracted image plus the (raw) caption, the mentions that apply to it, and
// the date. Caption is left raw here; mentions are resolved to names later via
// `resolveCaption` (async, since it may hit GET /users/{id}).
export interface ExtractedImage {
  attachment: DiscordAttachment;
  caption: string;
  mentions?: DiscordUser[];
  date: string;
}

/**
 * Fetch a page of channel messages. `before`/`after` are message ids (snowflakes).
 * Discord returns newest-first in both cases.
 */
export async function fetchMessages(opts: {
  before?: string;
  after?: string;
  limit?: number;
}): Promise<DiscordMessage[]> {
  const params = new URLSearchParams({
    limit: String(opts.limit ?? MESSAGES_PER_PAGE),
  });
  if (opts.before) params.set("before", opts.before);
  if (opts.after) params.set("after", opts.after);
  return discordFetch<DiscordMessage[]>(
    `/channels/${DROPS_CHANNEL_ID}/messages?${params.toString()}`,
  );
}

function isImage(a: DiscordAttachment): boolean {
  if (a.content_type?.startsWith("image/")) return true;
  // Fallback for older attachments that predate content_type.
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(a.filename);
}

// Resolve a single user id to a display name via the API. Callers cache results.
export async function fetchUser(id: string): Promise<DiscordUser> {
  return discordFetch<DiscordUser>(`/users/${id}`);
}

/**
 * Resolve `<@id>` / `<@!id>` mention tokens in a caption to a readable "@name".
 *
 * Prefers names already present in the message payload (`localMentions`); for ids
 * that aren't there — the common case for forwarded snapshots, whose `mentions`
 * array Discord omits — it looks them up via GET /users/{id}. `userCache`
 * (id -> name) dedups lookups across the whole run and is persisted in the
 * manifest so any given name is fetched at most once, ever. Ids that still can't
 * be resolved are left raw (the client renderer shows a neutral chip).
 */
export async function resolveCaption(
  text: string,
  localMentions: DiscordUser[] | undefined,
  userCache: Map<string, string>,
): Promise<string> {
  if (!text || !text.includes("<@")) return text;

  for (const u of localMentions ?? []) {
    userCache.set(u.id, u.global_name || u.username);
  }

  const ids = new Set([...text.matchAll(/<@!?(\d+)>/g)].map((m) => m[1]));
  for (const id of ids) {
    if (userCache.has(id)) continue;
    try {
      const u = await fetchUser(id);
      userCache.set(id, u.global_name || u.username);
    } catch {
      // Leave unresolved; a later run or the client chip handles it.
    }
  }

  return text.replace(/<@!?(\d+)>/g, (full, id) => {
    const name = userCache.get(id);
    return name ? `@${name}` : full;
  });
}

/**
 * Every image a message contributes — both directly-attached images AND images
 * carried inside forwarded `message_snapshots` (the primary case for this
 * channel). Each image is paired with its RAW caption + the mentions that apply
 * (resolve later with `resolveCaption`) and its date.
 *
 * Caption preference for forwards: the mod's own added text, else the forwarded
 * message's text (with the matching mentions list).
 */
export function extractImages(msg: DiscordMessage): ExtractedImage[] {
  const out: ExtractedImage[] = [];

  const topCaption = msg.content ?? "";
  for (const a of msg.attachments ?? []) {
    if (isImage(a)) {
      out.push({
        attachment: a,
        caption: topCaption,
        mentions: msg.mentions,
        date: msg.timestamp,
      });
    }
  }

  for (const snap of msg.message_snapshots ?? []) {
    const sm = snap.message;
    const modText = msg.content?.trim();
    const caption = modText || sm.content?.trim() || "";
    const mentions = modText ? msg.mentions : sm.mentions;
    const date = sm.timestamp || msg.timestamp;
    for (const a of sm.attachments ?? []) {
      if (isImage(a)) out.push({ attachment: a, caption, mentions, date });
    }
  }

  return out;
}
