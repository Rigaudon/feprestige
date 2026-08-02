// Channel message fetching + image extraction for the Drops ingest.

import { discordFetch } from "./client";
import { DROPS_CHANNEL_ID } from "./env";
import type { DiscordAttachment, DiscordMessage } from "./types";

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

  for (const a of msg.attachments ?? []) {
    if (isImage(a)) {
      out.push({ attachment: a, caption: msg.content ?? "", date: msg.timestamp });
    }
  }

  for (const snap of msg.message_snapshots ?? []) {
    const sm = snap.message;
    const caption = msg.content?.trim() || sm.content?.trim() || "";
    const date = sm.timestamp || msg.timestamp;
    for (const a of sm.attachments ?? []) {
      if (isImage(a)) out.push({ attachment: a, caption, date });
    }
  }

  return out;
}
