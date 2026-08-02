// Channel message fetching + image extraction for the Drops ingest.

import { discordFetch } from "./client";
import { DROPS_CHANNEL_ID } from "./env";
import type {
  DiscordAttachment,
  DiscordMessage,
  DiscordUser,
} from "./types";

const MESSAGES_PER_PAGE = 100; // Discord's max per request.

// One extracted image plus the caption/date to store with it.
export interface ExtractedImage {
  attachment: DiscordAttachment;
  caption: string;
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

// Replace `<@id>` / `<@!id>` mention tokens with a readable "@name" using the
// message's own `mentions` list, so the stored caption doesn't leak raw ids.
// Unresolved ids are left as-is (the client renderer shows a neutral chip).
function resolveMentions(text: string, mentions?: DiscordUser[]): string {
  if (!text || !mentions?.length) return text;
  const names = new Map(
    mentions.map((u) => [u.id, u.global_name || u.username]),
  );
  return text.replace(/<@!?(\d+)>/g, (full, id) => {
    const name = names.get(id);
    return name ? `@${name}` : full;
  });
}

/**
 * Every image a message contributes — both directly-attached images AND images
 * carried inside forwarded `message_snapshots` (the primary case for this
 * channel). Each image is paired with its caption and date.
 *
 * Caption preference for forwards: the mod's own added text, else the forwarded
 * message's text.
 */
export function extractImages(msg: DiscordMessage): ExtractedImage[] {
  const out: ExtractedImage[] = [];

  const topCaption = resolveMentions(msg.content ?? "", msg.mentions);
  for (const a of msg.attachments ?? []) {
    if (isImage(a)) {
      out.push({ attachment: a, caption: topCaption, date: msg.timestamp });
    }
  }

  for (const snap of msg.message_snapshots ?? []) {
    const sm = snap.message;
    // Prefer the mod's own added text, else the forwarded message's text.
    const raw = msg.content?.trim() || sm.content?.trim() || "";
    const caption = resolveMentions(raw, msg.content?.trim() ? msg.mentions : sm.mentions);
    const date = sm.timestamp || msg.timestamp;
    for (const a of sm.attachments ?? []) {
      if (isImage(a)) out.push({ attachment: a, caption, date });
    }
  }

  return out;
}
