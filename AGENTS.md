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
src/app/api/wiki/sync/route.ts        secret-gated OSRS wiki→R2 combat-achievements ingest
src/app/api/discord/events/route.ts   secret-gated scheduled Discord event posts (cron-driven)
src/components/       Nav, Footer, Hero, PortableText, Studio; drops/ (carousel, DiscordText); wom/; wiki/
src/sanity/           client.ts env.ts image.ts queries.ts types.ts + schemaTypes/
src/discord/          Drops ingest: env client messages sync types (re-hosts images to R2)
src/wom/              Wise Old Man integration (roster/hiscores/gains)
src/wiki/             OSRS wiki integration (combat achievements): env ca client sync types
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
- **Auto-update:** a **Cloudflare Cron Trigger** (`wrangler.jsonc` `triggers.crons`, every
  15 min) fires `custom-worker.ts`'s `scheduled` handler, which calls `?mode=incremental`
  in-process — this is the reliable **primary** schedule. A GitHub Actions cron
  (`.github/workflows/drops-sync.yml`, hourly) is a **fallback** hitting the same route over
  HTTP (needs repo secret `DISCORD_SYNC_SECRET`). We moved off GitHub-cron-as-primary because
  its `schedule:` is best-effort and was leaving runs queued for hours (drops stopped
  updating). The page's `after()` also schedules a throttled incremental sync on revalidation,
  but that only fires on a visit that lands on a revalidation, so it's a best-effort supplement.
- **Custom worker entrypoint:** to add the cron `scheduled` handler we wrap the
  OpenNext-generated `.open-next/worker.js` (which only exports `fetch` and is rebuilt every
  deploy) in `custom-worker.ts` and point `wrangler.jsonc` `main` at it (the OpenNext-sanctioned
  pattern). It re-exports the OpenNext Durable Objects and is excluded from tsconfig/eslint
  (imports build-only output; wrangler's esbuild bundles it). `DISCORD_SYNC_SECRET` must be set
  as a worker secret for the cron to authenticate to the route.
- **Env:** `NEXT_PUBLIC_DROPS_CDN_BASE` (public, **build-time**; defaults to
  `https://drops.feprestige.com` baked into `env.ts` so a build that doesn't load the
  gitignored `.env.local` — fresh checkout, Cloudflare git-integration build — can't silently
  drop the tab/images), `DISCORD_BOT_TOKEN` + `DISCORD_SYNC_SECRET` (**runtime** secrets),
  `DISCORD_DROPS_CHANNEL_ID` (optional; defaults to the clan channel). R2 binding
  `DROPS_BUCKET` in `wrangler.jsonc`.
- **Mentions:** `<@id>` tokens resolve to `@name` from the message payload, falling back to
  `GET /users/{id}` for forwarded snapshots (which omit the `mentions` array). Resolved names
  are cached in the manifest's `users` map (fetched once, ever). Only ids that no longer
  resolve (e.g. deleted users) degrade to a neutral chip. Run `?mode=recaption` once after a
  deploy to fix drops ingested before this existed.

## Scheduled Discord events — `src/discord/events/`

Short-lived (≈ a week) campaigns that post to a channel on their own schedule with their own
logic. Outbound-only REST posting (free tier; no Gateway, nothing always-on).

- **Kind vs instance.** A *kind* (`kinds/*.ts`) is reusable logic: a factory taking options and
  returning a `PostBuilder` (`(ctx) => Promise<ScheduledPost | null>`; `null` skips the tick).
  An *instance* is an entry in `registry.ts`: `id`, `channelId`, `start`/`end` (ISO with offset;
  active while start <= tick < end), `cron` (5-field, numeric only), optional `timeZone` (IANA,
  default UTC), and `post: someKind({...})`. To add an event: write/reuse a kind, add a registry
  entry, commit, push, deploy. `kinds/hello-world.ts` is the template.
- **One base tick.** Cloudflare crons are fixed at deploy and the free plan allows only a few,
  so events don't get their own triggers. `* * * * *` (`wrangler.jsonc` + `EVENTS_CRON` in
  `custom-worker.ts`, keep in sync) calls `/api/discord/events?at=<scheduledTime>` every minute;
  `run.ts` posts for each event whose window contains that minute and whose crontab matches it
  (`cron.ts`, Vixie DOM/DOW semantics). Matching uses the tick's *scheduled* minute, so a late
  invocation still matches. A missed tick is just skipped (no catch-up, no dedupe state).
- **Isolation.** Each event is try/caught; a bad crontab or failed post shows up as
  `status: "error"` in the route's JSON and doesn't block the others. Posts use
  `allowed_mentions: {parse: []}` so they never ping. The bot needs View Channel + Send
  Messages in each target channel.
- **Kinds so far:** `hello-world` (template, unused) and `bounty` — one random raid from
  `RAIDS` (CoX/ToB/ToA/Fractured Archive) + 3 distinct random bosses. The boss pool is the
  `bosses` keys of the clan's WOM bulk-hiscores (group id from Sanity, shared 1h cache with the
  Hiscores page; static `METRIC_PROPS` fallback), minus every raid/variant key. **No
  back-to-back repeats:** it reads the channel history (up to 5×100 msgs) for the newest
  *bot-authored* `Active Bounty:` post and excludes its raid + bosses — the channel is the state,
  no storage. Needs Read Message History; if that read fails the tick errors instead of risking
  a repeat.
- **Manual:** `POST /api/discord/events` (bearer `DISCORD_SYNC_SECRET`) with `?dryRun=1`,
  `?at=<ISO|ms>`, or `?event=<id>&force=1` (post one event now, ignoring window/cron).
- Distinct from the planned bingo/team events system in `EVENTS.md` (separate worker); a future
  kind could read that system's state.

## Combat Achievements — `src/wiki/`

A clan CA leaderboard at `/combat-achievements`, sourced from the OSRS Wiki rather than WOM
(WOM has no CA data). Same ingest → R2 → read shape as Drops, for the same reason: it needs one
request **per member**, which can't happen in a page render.

- **Two upstreams, both anonymous.** (1) `sync.runescape.wiki/runelite/player/{name}/STANDARD` —
  the RuneLite **Wiki Sync** plugin backend, returning whatever that player last synced. It
  **403s without a `User-Agent`**, only accepts the `STANDARD` world type, and answers
  `400 NO_USER_DATA` for players who've never used the plugin (~45 of our 300 — normal, they're
  just hidden from the page). (2) the wiki's `action=bucket` API for the task table (below).
- **Rate limit is real and undocumented.** 300 requests at concurrency 6 got `429` on 177 of them;
  fully sequential got zero. The ingest is sequential with a 150 ms gap and one 429 retry. Don't
  "optimise" it into parallel fetches.
- **Nothing about CAs is hardcoded except the 1/2/3/4/5/6 points per tier.** Jagex adds and
  retunes CAs regularly, so the id→tier table is fetched live from the wiki's Bucket extension —
  `bucket("combat_achievement").select("id","tier").limit(5000).run()`, one request, ~18 KB, the
  same query the wiki's own `Module:Combat Achievements` runs. Task counts, per-tier point pools
  and the reward thresholds are all **derived** from it in `ca.ts`. A tier's threshold is the
  cumulative point pool of that tier and every lower tier (so Grandmaster = every CA point),
  matching the wiki's `Module:Globals/data`. Today that derives to 655 tasks / 2697 points, but
  those numbers appear nowhere in the code — don't reintroduce them.
- **Ingest:** `POST /api/wiki/sync` (bearer `DISCORD_SYNC_SECRET` — that's the site's single shared
  ingest secret despite the name). Walks the WOM roster `?batch=` members per run (default 20,
  keeping it to 23 of the free tier's 50 subrequests), persisting every 5 so a CPU-limit kill
  can't stall the cursor. At `cursor === 0` it refreshes the task table + roster and prunes
  ex-members. `?mode=rescore` re-derives everyone's counts from stored data with **no** player
  fetches — the cheap way to absorb a CA release immediately.
- **Manifest** lives at `wiki/manifest.json` in the **existing `feprestige-drops` bucket** (no new
  binding/env/DNS to hand off), read by the page over HTTP with tag `wiki-ca` + 1h revalidate. It
  inlines the task table, so the page can never render counts against a mismatched table. Each
  player stores a **base64 bitmap** of completed ids (~110 chars) alongside the derived counts,
  which is what makes `rescore` possible.
- **Staleness:** the sync API stamps responses with the *request* time, not the player's last sync,
  so a member who quit two years ago looks identical to one who synced today. The manifest's per
  player `u` (last time the numbers actually changed) is the only signal we have.
- **Cron:** `7,27,47 * * * *` in `wrangler.jsonc`, dispatched in `custom-worker.ts` by matching
  `controller.cron` against `WIKI_CRON` (keep the two in sync). Deliberately a different tick from
  the drops `*/15` job, because the 50-subrequest cap is per invocation. A full pass over ~300
  members takes ~4h, which is ample — the data only moves when a member reopens RuneLite.
- **Manual fill / fallback:** `.github/workflows/wiki-sync.yml` (Actions tab → Run workflow) drains
  the whole roster in one go by looping the route until it reports `wrapped: true`, with `mode` and
  `batch` inputs. Use it to fill the board immediately instead of waiting out the cron, or to drive
  the ingest from a network that can't reach `feprestige.com` (the dev Mac's corporate proxy 403s
  it). Its `schedule:` is a deliberately light backup — a few batches every 6h — so it can't run
  long enough to race the Cloudflare cron over the manifest.

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
  it honors the proxy). This is a local-network wrinkle only — it works on Cloudflare. On Node
  24+ the fix is just `NODE_USE_ENV_PROXY=1 npm run build` (built-in env-proxy support) — no
  undici dispatcher code needed. Verified working for a full build + `opennextjs-cloudflare build`.
- `@/*` maps to `./src/*` — the `sanity/` dir lives at `src/sanity`, not the repo root.

## Commands

- `npm run dev` — site + Studio at `/admin`
- `npm run build` / `npm run lint` — verify
- `npm run preview` / `npm run deploy` — OpenNext build → Cloudflare (preview / deploy).
  **Deploys must come from pushed `main`:** `predeploy` runs `scripts/check-deploy.mjs`, which
  aborts unless on `main`, the tree is clean (incl. untracked), and HEAD == freshly-fetched
  `origin/main`. So: commit → push → deploy. Emergency override: `SKIP_DEPLOY_CHECK=1`.
  From the Mac, prefix with `NODE_USE_ENV_PROXY=1` (corporate proxy).
- `npm run typegen` — optional Sanity TypeGen for exact content types

## Status

Planned (design only, not built): a **team vs team events system** (clan bingo first) —
a *separate* Cloudflare Worker at `feprestige.com/events/*`, Discord OAuth, Durable
Object per event, SSE live board, Dink webhook ingest. See `EVENTS.md`.

Scaffold complete and verified (build/lint clean, worker ~1.2 MiB). Project id is wired.
Not yet done: seed content in the Studio (Site Settings + a home page), add CORS origins in
Sanity for the prod URL, first deploy to Cloudflare, and the ownership-transfer handoff. See
`README.md` for the handoff checklist and deploy steps.
