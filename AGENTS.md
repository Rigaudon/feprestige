<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: FE Prestige — clan site

A welcome/landing site with informational tabs for a video-game clan. It is being
built **on behalf of non-technical people** who will own and edit the content, then
take over maintenance after handoff. Two constraints shaped every decision:

- **Handoff-safe:** no custom auth or database to operate; every account (domain,
  host, CMS) ends up owned by the clan. Editing is done by non-developers.
- **Cost-minimized:** free hosting tier; the only guaranteed cost is the domain.

## How it fits together (architecture)

Content lives in **Sanity** (a hosted CMS), *not* in this repo or the web host. This
Next.js app is a **reader** of that content; the embedded Studio at `/admin` is a
**writer**.

```
Sanity Cloud (Content Lake: JSON docs + image CDN + auth)
   ▲ writes (editor login)        ▲ reads (GROQ)        │ webhook on Publish
   │                              │                     ▼
Studio at /admin                Next.js on Cloudflare (build-time fetch → static HTML;
(React app, runs in the           /api/revalidate refreshes cache on publish)
 editor's browser)                     │ plain HTTP, no login
                                       ▼
                                  Visitor's browser (static pages; never touches Sanity)
```

- **Public pages are statically generated** (SSG) — content is fetched server-side at
  build time and baked into HTML. Visitors' browsers never contact Sanity.
- **The Studio** is a client-only React app served from `/admin`; it talks directly to
  Sanity and is gated by each editor's own Google/GitHub/email login (no auth code here).
- **Updates reach the site** either automatically (1h `revalidate`) or near-instantly via
  a signed Sanity webhook → `/api/revalidate` → `revalidateTag`.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack) + Tailwind CSS v4 (CSS config, no
  `tailwind.config.js`).
- Sanity v6 + `next-sanity` v13 (GROQ queries, Portable Text, `@sanity/image-url`).
- Deploy: Cloudflare Workers via `@opennextjs/cloudflare` (+ `wrangler`).

## Key facts

- Sanity **project id `k00wzpm0`**, dataset **`production`** (public), API version
  `2025-01-01`. Public dataset ⇒ **no API token anywhere**; reads are anonymous, writes
  require an editor login.
- Env vars live in `.env.local` (gitignored; `.env.example` is the template). Only
  `NEXT_PUBLIC_*` values reach the browser (project id / dataset / api version — all
  public). `SANITY_REVALIDATE_SECRET` is server-only (used solely in the webhook route).

## Content model (`src/sanity/schemaTypes/`)

- **`siteSettings`** (singleton): clan name, tagline, logo, primary CTA, social links, footer.
- **`page`** (the tabs): `title`, `slug`, `isHome`, `showInNav`, `navOrder`, `heroImage`,
  `body` (Portable Text). Nav is derived from pages where `showInNav == true`; exactly one
  page has `isHome == true` and renders at `/`.
- **`member`** (optional roster): schema exists; roster tab not yet wired up.

## Where things are

```
src/app/(site)/       public site: layout (nav/footer), home page, [slug] tabs, drops/
src/app/(studio)/admin/[[...tool]]/   embedded Studio (client-only, ssr:false)
src/app/api/revalidate/route.ts       signed Sanity webhook → revalidateTag
src/app/api/discord/sync/route.ts     secret-gated Discord→R2 ingest (backfill/incremental/recaption)
src/components/       Nav, Footer, Hero, PortableText, Studio; drops/ (carousel, DiscordText); wom/
src/sanity/           client.ts env.ts image.ts queries.ts types.ts + schemaTypes/
src/discord/          Drops ingest: env client messages sync types (re-hosts images to R2)
src/wom/              Wise Old Man integration (roster/hiscores/gains)
sanity.config.ts sanity.cli.ts        Studio/CLI config (root)
next.config.ts open-next.config.ts wrangler.jsonc
```

## Drops (drop of the week) — `src/discord/`

A curated image feed mirrored from a Discord channel (moderators post/forward member loot
drops). Unlike Sanity content, it's a separate ingest → storage → read pipeline:

- **Ingest → R2:** `POST /api/discord/sync` (bearer `DISCORD_SYNC_SECRET`) pulls channel
  messages with the bot token, extracts images from **both** direct attachments **and
  forwarded `message_snapshots`**, dedups by attachment id, and re-hosts them to the
  `feprestige-drops` R2 bucket — Discord CDN urls are signed and **expire (~24h)**, so we
  must re-host. A `manifest.json` in the bucket holds the drop records + backfill/incremental
  cursors. Modes: `?mode=backfill` (drain history, batched — re-run until `done:true`),
  `?mode=incremental` (new drops), `?mode=recaption` (rewrite captions in place).
- **Read → page:** `/drops` reads the public `manifest.json` over HTTP (Next Data Cache, tag
  `discord-drops`, 1h revalidate — same pattern as `womFetch`), rendered newest-first by
  `DropsCarousel`. Images are served from the bucket's public **r2.dev** URL via
  `NEXT_PUBLIC_DROPS_CDN_BASE`; the manifest stores **keys only**, so moving to a custom
  subdomain later is a one-line env change with no re-ingest.
- **Captions:** `DiscordText` renders Discord markup (bold/italic/strike/code/spoiler,
  custom emoji as images, mentions/channels as chips). Underscore-italics are intentionally
  not parsed so item names like `twisted_bow` render literally.
- **Auto-update:** a GitHub Actions cron (`.github/workflows/drops-sync.yml`, every ~15 min)
  hits `?mode=incremental` — the reliable path (needs repo secret `DISCORD_SYNC_SECRET`). The
  page's `after()` also schedules a throttled incremental sync on revalidation, but that only
  fires on a visit that lands on a revalidation, so it's a best-effort supplement.
- **Env:** `NEXT_PUBLIC_DROPS_CDN_BASE` (public, **build-time**), `DISCORD_BOT_TOKEN` +
  `DISCORD_SYNC_SECRET` (**runtime** secrets), `DISCORD_DROPS_CHANNEL_ID` (optional; defaults
  to the clan channel). R2 binding `DROPS_BUCKET` in `wrangler.jsonc`.
- **Mentions:** `<@id>` tokens resolve to `@name` from the message payload, falling back to
  `GET /users/{id}` for forwarded snapshots (which omit the `mentions` array). Resolved names
  are cached in the manifest's `users` map (fetched once, ever). Only ids that no longer
  resolve (e.g. deleted users) degrade to a neutral chip. Run `?mode=recaption` once after a
  deploy to fix drops ingested before this existed.

## Conventions & gotchas (already solved — don't relearn the hard way)

- **Worker size limit is 3 MiB compressed (Cloudflare free tier).** The Studio must load
  **client-only** (`dynamic(..., { ssr: false })`) and the Studio route's server `layout.tsx`
  must **inline** `metadata`/`viewport` rather than re-export them from `next-sanity/studio`
  — otherwise the whole `sanity` lib gets dragged into the server bundle (was 4.9 MiB; now
  ~1.2 MiB). Keep it that way.
- **Next 16:** `params` is a Promise (`await params`); `revalidateTag(tag, profile)` takes
  two args (we use `"max"`).
- **Build resilience:** `sanityFetch` returns a `fallback` and `createClient` uses a
  `"placeholder"` projectId when `isSanityConfigured` is false, so the app builds/renders
  (empty state) even without Sanity connected.
- **Build-time vs runtime env (Cloudflare):** `.env.local` + `NEXT_PUBLIC_*` are available
  during `next build` (inlined); **wrangler secrets** (`DISCORD_BOT_TOKEN`,
  `DISCORD_SYNC_SECRET`, `SANITY_REVALIDATE_SECRET`) are **runtime-only** and *absent* at
  build. Never gate prerendered UI (nav, SSG pages) on a secret — it gets baked out. Bug hit
  once: the Drops nav tab was gated on `DISCORD_BOT_TOKEN` and vanished; it now gates on
  `NEXT_PUBLIC_DROPS_CDN_BASE` (build-time). Runtime code (route handlers, `after()` on
  revalidation) can still read secrets from `process.env`.
- **Stale fetch-cache bakes into a deploy:** `next build` reuses `.next/cache/fetch-cache`,
  so a rebuild can prerender **stale Sanity data** — a deleted page reappears, or a new
  page/tab is missing. If content looks wrong after a deploy, do a **clean build** (wipe
  `.next`, or `npm run build` fresh) then `npm run deploy`. See `DEPLOYMENT.md`.
- **`.env*` files are permission-blocked** from Read/Edit/Bash in this environment — ask
  the user to edit `.env.local`; don't try to read or write it.
- **Local build fetch fails behind the corporate proxy:** Node's `fetch`/undici ignores
  `HTTPS_PROXY`, so build-time Sanity fetches time out on this machine (`curl` works because
  it honors the proxy). This is a local-network wrinkle only — it works on Cloudflare. Fix
  locally by giving undici a proxy dispatcher if a real local build is needed.
- `@/*` maps to `./src/*` — the `sanity/` dir lives at `src/sanity`, not the repo root.

## Commands

- `npm run dev` — site + Studio at `/admin`
- `npm run build` / `npm run lint` — verify
- `npm run preview` / `npm run deploy` — OpenNext build → Cloudflare (preview / deploy)
- `npm run typegen` — optional Sanity TypeGen for exact content types

## Status

Scaffold complete and verified (build/lint clean, worker ~1.2 MiB). Project id is wired.
Not yet done: seed content in the Studio (Site Settings + a home page), add CORS origins in
Sanity for the prod URL, first deploy to Cloudflare, and the ownership-transfer handoff. See
`README.md` for the handoff checklist and deploy steps.
