# FE Prestige — Clan Site

A welcome/landing site with informational tabs for a video-game clan. Content is
managed by non-technical editors in **Sanity** (an embedded CMS at `/admin`); the
public site is a static-first **Next.js** app deployed free to **Cloudflare**.

- **Framework:** Next.js 16 (App Router) + Tailwind CSS v4
- **CMS:** Sanity (Studio embedded at `/admin`, content in Sanity's hosted Content Lake)
- **Host:** Cloudflare Workers via `@opennextjs/cloudflare`
- **Editors log in** at `/admin` using their Google/GitHub/email — no passwords or
  auth code in this project. Visitors never log in; pages are static HTML.

---

## Quick start (local development)

Requirements: Node 20+ and npm.

```bash
npm install
cp .env.example .env.local      # then fill in the values (see below)
npm run dev                     # http://localhost:3333  (site) and /admin (Studio)
```

The site renders even before Sanity is connected — you'll see a friendly empty
state until content exists.

### Environment variables (`.env.local`)

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Your Sanity project id (public). Required to load content. |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production`. |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Pinned API date, e.g. `2025-01-01`. |
| `SANITY_REVALIDATE_SECRET` | Random string; only needed for the optional publish webhook. |

---

## Connecting Sanity (one-time)

1. **Create a project.** Sign in at [sanity.io/manage](https://www.sanity.io/manage),
   create a new project, and add a `production` dataset. Copy the **Project ID** into
   `NEXT_PUBLIC_SANITY_PROJECT_ID`.
2. **Allow the site to talk to Sanity (CORS).** In the project's *API → CORS origins*,
   add `http://localhost:3333` (the app's default dev/start port, matching Sanity's own
   Studio default) and your production URL (allow credentials). Only the embedded Studio
   needs this — public pages never call Sanity from the browser.
3. `npm run dev` and open `/admin`. Log in and start creating content.

### Content model

- **Site Settings** (one document): clan name, tagline, logo, primary button
  (e.g. Discord invite), social links, footer text.
- **Page** (one per tab): title, slug, body (rich text + images), hero image.
  - Toggle **Show in navigation** and set **Navigation order** to control the tabs.
  - Flag exactly one page **Use as home page** — it renders at the site root (`/`).
- **Member** (optional roster): name, role, avatar. The schema is ready; wire up a
  roster tab with `membersQuery` in `src/sanity/queries.ts` when wanted.

Navigation, the home page, and all page content come entirely from Sanity, so
editors can add/rename/reorder tabs without any code changes.

---

## Deploying to Cloudflare (free tier)

The app deploys as a Cloudflare Worker. The build stays ~1.2 MiB gzipped, within
the free-tier 3 MiB limit.

**Option A — Git-connected (recommended for handoff):** In the Cloudflare dashboard,
*Workers & Pages → Create → Import a repository*. Set:

- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx wrangler deploy`
- **Environment variables:** add the same vars as `.env.local`.

Every push to `main` builds and deploys automatically.

**Option B — CLI:** `npm run deploy` (runs the OpenNext build and `wrangler deploy`).
Run `npx wrangler login` first.

Then add your custom domain to the Worker (*Settings → Domains & Routes*) and point
the registered domain's DNS at Cloudflare.

Preview a production build locally with `npm run preview`.

---

## How content updates reach the live site

The public pages are generated as static HTML. There are two ways to refresh them
after an editor hits **Publish** in Sanity:

1. **Automatic within ~1 hour (default, zero setup).** Content is re-fetched on a
   1-hour interval (`revalidate: 3600`), so edits appear on their own.
2. **Near-instant (optional).** For faster updates, trigger a redeploy on publish:
   - Simplest: redeploy from the Cloudflare dashboard (or `npm run deploy`) after editing.
   - Automatic: point a Sanity webhook at a Cloudflare deploy hook (rebuild on publish),
     **or** use the built-in webhook route below with a persistent cache.

### Optional: instant publish via the webhook route

`src/app/api/revalidate/route.ts` accepts a signed Sanity webhook and calls
`revalidateTag`. To use it on Cloudflare, on-demand revalidation needs a persistent
cache (an R2 incremental cache + tag cache) configured in `open-next.config.ts` — see
the [OpenNext caching docs](https://opennext.js.org/cloudflare/caching). Then, in
Sanity *API → Webhooks*, add a webhook to `https://your-domain/api/revalidate` with a
GROQ projection of `{ "_type": _type, "slug": slug.current }` and the same secret as
`SANITY_REVALIDATE_SECRET`.

---

## Handoff checklist

Transfer ownership so the clan is self-sufficient:

- [ ] **Domain** registered/owned under the clan's account, auto-renew on.
- [ ] **Cloudflare** account owned by the clan; the site deployed there with env vars set.
- [ ] **Sanity** project ownership transferred to the clan's admin (invite them as
      Administrator, then remove yourself). Add other editors as **Editor**.
- [ ] Editors know: go to `/admin`, log in, edit, click **Publish**.
- [ ] If the design/build ever needs changes, that's the one task requiring a developer;
      dependencies are pinned to keep rebuilds reproducible.

---

## Project layout

```
src/
  app/
    (site)/            # public site: layout (nav/footer), home, [slug] tabs
    (studio)/admin/    # embedded Sanity Studio (client-only, /admin)
    api/revalidate/    # optional publish webhook
  components/          # Nav, Footer, Hero, PortableText, Studio
  sanity/
    schemaTypes/       # siteSettings, page, member
    client.ts env.ts image.ts queries.ts types.ts
sanity.config.ts       # Studio config (schema + plugins)
open-next.config.ts    # Cloudflare adapter config
wrangler.jsonc         # Cloudflare Worker config
```

Optionally run `npm run typegen` (Sanity TypeGen) to generate exact content types.
