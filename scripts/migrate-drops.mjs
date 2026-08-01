// One-off migration: convert the Clan Drops page body (a long run of text-block +
// image pairs) into a single `carousel` block. Each image's caption is taken from the
// text line immediately preceding it (blank stays blank). Images are stored
// OLDEST-FIRST so the site's carousel (which reverses for display) shows newest first
// and future uploads appended at the bottom land at the front.
//
// Run once, then you can delete this file:
//   SANITY_WRITE_TOKEN=sk... node scripts/migrate-drops.mjs
//
// The token needs Editor permission. Revoke it in manage.sanity.io afterward — the
// site itself never uses a token (public dataset, anonymous reads).

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

import { createClient } from "@sanity/client";

// Node's global fetch (undici) ignores HTTP(S)_PROXY. On networks that require a
// proxy (e.g. the corporate box this was written on), route @sanity/client's fetches
// through it. No-op when no proxy is configured, so this stays portable.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) {
  const { setGlobalDispatcher, ProxyAgent } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(proxy));
}

const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error(
    "Missing SANITY_WRITE_TOKEN. Run:\n  SANITY_WRITE_TOKEN=sk... node scripts/migrate-drops.mjs",
  );
  process.exit(1);
}

const client = createClient({
  projectId: "k00wzpm0",
  dataset: "production",
  apiVersion: "2025-01-01",
  token,
  useCdn: false,
});

const key = () => randomUUID().replace(/-/g, "").slice(0, 12);

const blockText = (block) =>
  (block?.children ?? [])
    .map((span) => span?.text ?? "")
    .join("")
    .trim();

async function main() {
  const page = await client.fetch(
    `*[_type == "page" && slug.current == "loot"][0]{ _id, body }`,
  );
  if (!page?._id) throw new Error("Clan Drops page (slug 'loot') not found.");

  const body = page.body ?? [];

  // Safety backup of the exact current body before we touch anything.
  writeFileSync(
    new URL("./loot-body-backup.json", import.meta.url),
    JSON.stringify({ _id: page._id, body }, null, 2),
  );

  // Walk the body, pairing each image with the most recent preceding caption line.
  const images = [];
  let pendingCaption = "";
  for (const item of body) {
    if (item?._type === "block") {
      pendingCaption = blockText(item);
    } else if (item?._type === "image" && item?.asset?._ref) {
      const image = {
        _key: key(),
        _type: "image",
        asset: { _type: "reference", _ref: item.asset._ref },
      };
      if (item.hotspot) image.hotspot = item.hotspot;
      if (item.crop) image.crop = item.crop;
      if (pendingCaption) image.caption = pendingCaption;
      images.push(image);
      pendingCaption = "";
    }
  }

  // Stored oldest-first (the component reverses for display).
  images.reverse();

  const carousel = {
    _key: key(),
    _type: "carousel",
    autoplay: true,
    images,
  };

  await client.patch(page._id).set({ body: [carousel] }).commit();

  const captioned = images.filter((i) => i.caption).length;
  console.log(
    `Migrated ${images.length} images into a carousel on ${page._id} ` +
      `(${captioned} with captions, ${images.length - captioned} blank). ` +
      `Backup written to scripts/loot-body-backup.json.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
