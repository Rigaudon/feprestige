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
src/app/(site)/       public site: layout (nav/footer), home page, [slug] tabs
src/app/(studio)/admin/[[...tool]]/   embedded Studio (client-only, ssr:false)
src/app/api/revalidate/route.ts       signed Sanity webhook → revalidateTag
src/components/       Nav, Footer, Hero, PortableText, Studio
src/sanity/           client.ts env.ts image.ts queries.ts types.ts + schemaTypes/
sanity.config.ts sanity.cli.ts        Studio/CLI config (root)
next.config.ts open-next.config.ts wrangler.jsonc
```

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
