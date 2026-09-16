# Events — team vs team competition system (design)

> **Status: design only. Nothing here is built yet.** This documents the agreed
> architecture and, more importantly, *why* each call was made, so the reasoning
> survives into the handoff. Items marked **[verify]** are load-bearing assumptions
> that should be confirmed with a throwaway prototype before they're built on.

The first event is a **clan bingo**: teams claim tiles, tiles are satisfied by in-game
drops/achievements reported by a RuneLite plugin, and everyone watches a live board.
The system is built to be **reused for later events**, so the split between "engine"
and "per-event config" is the central design concern — see
[Engine vs per-event](#engine-vs-per-event).

## Why a separate app (not part of this Next.js site)

This site is a static Sanity reader: content is fetched at build time and baked into
HTML, visitors never touch a backend, and the only mutable state is an R2 manifest.
The events system is the opposite of that in every dimension — **stateful, authenticated,
write-contended, and realtime**. Sharing a worker would mean:

- The 3 MiB compressed worker limit is already ~1.2 MiB of mostly-Studio bundle. Every
  byte of events code competes with it (see `AGENTS.md` → Conventions).
- A bug in a live event could break the clan's landing page, because one deploy ships both.
- The events app wants no ISR, no incremental cache, and direct control of a streaming
  response — all of which OpenNext exists to manage for you.

So: **a second Cloudflare Worker**, same zone, same origin, deployed independently.

### Not Next.js either

The events app is one highly dynamic page, a handful of auth routes, an ingest endpoint,
and an admin panel. OpenNext would add a static-rendering pipeline we'd spend effort
disabling and a layer between us and the Durable Object on the streaming path.

**Hono + a Vite-built client bundle served from the assets binding.** Tiny worker, direct
DO routing, nothing to switch off. The cost is a second stack in the handoff; that's
acceptable because events get **archived rather than maintained** — no one edits a
finished bingo board.

## Architecture

```
RuneLite + Dink (each player's game client)
   │ POST (structured JSON, one permanent per-player URL)
   ▼
Events Worker  /events/ingest/<player-token>
   │ D1: token → discord user → their ACTIVE event registrations
   ▼
Event Durable Object  (one per event, addressed by event id)
   ├─ append to LOG            ← single-threaded ⇒ claim races are impossible
   ├─ evaluate rules → effects
   ├─ update materialized state
   └─ broadcast ──SSE──► ~100 viewers
        ▲                                    │
        │ POST (adjustments, manual claims)  │
   Admin panel ──────────────────────────────┘
   (gated on a Discord role)
        │
        ▼  event ends
   R2: log + final state as JSON → DO goes idle (stops costing anything)
        │
        ▼
   Archived boards render as static reads (same shape as the drops manifest.json)
```

Public site (`feprestige.com`) and events app (`feprestige.com/events/*`) share a domain
and nothing else.

## Core decisions

### 1. Append-only event log; derive everything else

The source of truth is a log of normalized occurrences plus admin actions. Board state,
tile claims, and scores are a **fold** over that log, never independently mutable fields.

This is the single most important decision, and it's justified by reuse — three things
happen in *every* event of this kind:

- **A rule turns out to be wrong mid-event** ("that pet should have counted"). Fix the
  rule, re-fold, board is retroactively correct. Without a log you're doing manual state
  surgery under time pressure with 80 people watching.
- **Someone registers late** having already earned a qualifying drop. Replay attributes
  it. No special case.
- **Archiving is free** — the log *is* the archive.

The fold stays cheap (low thousands of entries over a multi-day event). Keep a
materialized snapshot in DO SQLite and rebuild on demand.

Admin actions go into the **same log** as game events. That's what makes scoring honest:

```
score = Σ(value of claimed tiles) + Σ(adjustments)
```

with every term traceable to a log entry. **Never give admins a settable `team.points`
integer** — a recount could then disagree with reality, and "why did Team Blue jump 5
points" becomes unanswerable during a live event.

### 2. Ingest tokens are per-player and permanent, not per-event

Each player gets one opaque URL on first Discord sign-in:

```
https://feprestige.com/events/ingest/<opaque-player-token>
```

Pasted into Dink **once, ever**. It works for this bingo and every future event with zero
further player action — which is the actual goal ("people shouldn't have to update their
webhook URL").

It also collapses the attribution problem. Webhook-posted Discord messages carry **no
Discord user identity** (`author.id` is the webhook, `author.username` is a
plugin-configurable string), so a channel-reading design needs an RSN→Discord mapping to
know whose drop it is. With a token, **the token is the identity**. WOM-validated RSN
becomes a display nicety, not plumbing.

On POST: resolve token → user → look up that user's *active* registrations → fan out to
each event's DO. Usually one DO, frequently zero (no event running ⇒ cheap no-op).
Tokens are rotatable from the site.

> Spoofing is explicitly **out of scope** — participants are trusted to play with
> integrity, and the admin panel can correct anything. The token is in the URL path only
> so an open POST endpoint isn't sitting on the internet for scanners. Admin override,
> not cryptography, is the integrity mechanism here.

### 3. Direct webhook, not Discord channel polling

The rejected alternative: have the bot read the existing screenshots channel (the drops
pipeline in `src/discord/` already does exactly this and proves the mechanism works).

It was rejected because **Dink's structured data does not survive Discord.** Dink sends a
typed `extra` object — item name/id, quantity, price, source, event type — and Discord
**discards unknown fields**. Reading the message back via REST yields only `content`,
`embeds`, `attachments`, `author`, so tile matching degrades to regex over a
user-configurable message template, one config drift away from silent breakage.

Since participants must configure Dink to join anyway, "also paste this second URL into
Dink's webhook list" is the same user action they're already taking, and it buys:

- Structured JSON — no parsing, no template drift
- **Push, not poll** — sub-second; deletes the DO alarm loop and message cursor entirely
- No bot token, no channel read permissions, no dependency on a channel that could be
  renamed or re-permissioned mid-event
- The existing screenshots channel is **completely untouched** and keeps working as it
  does today

Channel polling stays available as a **fallback** if signup friction proves real. Don't
build it for v1.

**Dink, not Discord Loot Logger.** The loot logger is loot-only; Dink also covers levels,
collection log slots, pets, quests, combat achievements, clues, and KC — the spread a
bingo card needs. Dink also has per-notification screenshot toggles, which satisfies
"text, not screenshots".

### 4. Text only — no screenshot re-hosting

Drops re-hosts images to R2 because Discord CDN URLs are signed and expire (~24h). The
events system **does not need this**: the notification text/JSON is the input, so ingest
is parse → match → append → broadcast. No image storage, no expiry handling.

Deliberate consequence: **no proof images on the live or archived board.** If that's
wanted later, re-hosting comes back, because an event outlives Discord's URL expiry.

### 5. Normalize at the edge

Convert Dink's payload into a canonical shape immediately. Rules are data-driven
predicates over the canonical shape and **never** touch Dink's wire format.

```ts
type GameEvent = {
  player: string;            // discord id, resolved from the ingest token
  rsn: string | null;        // display only
  type: "LOOT" | "LEVEL" | "COLLECTION" | "PET" | "QUEST"
      | "COMBAT_ACHIEVEMENT" | "CLUE" | "KC" | "DEATH";
  subject: string;           // item / skill / boss name
  quantity: number;
  value: number | null;      // gp
  source: string | null;     // e.g. the boss that dropped it
  occurredAt: string;        // ISO
  raw: unknown;              // original payload — kept so replay survives adapter changes
};
```

Two payoffs: a Dink schema change touches one adapter, and a second source (WOM gains for
XP-based tiles is the obvious one) is a new adapter rather than a new rule engine.

Keep `raw`. When the adapter is fixed mid-event, re-folding is only correct if the
original payloads are still there.

### 6. D1 for durable, Durable Object for live

For a *single* event, DO SQLite alone would do. Reuse across events is what brings D1
back, and the line is clean:

| | |
|---|---|
| **D1** — survives events | players (discord id, RSN, ingest token), event registry, teams, registrations, archive index |
| **Event DO** — one per event, live only | the log, materialized board state, open SSE connections |

One DO per event board. 50–100 viewers plus a few hundred claims over several days is
nowhere near DO limits. Because a DO is single-threaded, **contended tile claims serialize
for free** — "first claim wins" is correct with no transactions, no version columns, no
optimistic concurrency. This is the main reason the DO is the write path rather than a
fan-out layer bolted onto a D1-authoritative design.

### 7. SSE, not WebSockets

Claims are rare; views are constant. SSE is one-directional (matching that shape), is
plain HTTP, has reconnect built into `EventSource`, and survives every intermediary.
Claims go up over ordinary `POST` — the classic "SSE down, POST up" pattern.

The usual objection is that **DO WebSocket Hibernation has no SSE equivalent**, so an open
stream keeps the DO resident and billed for wall-clock time. At this scale that's
irrelevant — see [Cost](#cost). Hibernation would save cents in exchange for the upgrade
dance, reconnect handling, and hibernation-API constraints.

Two implementation notes:

- **Heartbeat** with a `: ping\n\n` comment every ~25s or intermediaries drop the stream.
- **Tag each message with its log sequence number.** `EventSource` replays
  `Last-Event-ID` on reconnect, so the server resumes from that sequence instead of
  resyncing the whole board. Over a multi-day event, sleeping laptops and backgrounded
  phones make this matter more than it sounds.

## Storage sketch

Indicative, not final — the tile/rule shape firms up once a real card exists.

**D1 (`feprestige-events`)**

```sql
player        (discord_id PK, discord_username, rsn, ingest_token UNIQUE, created_at, rotated_at)
event         (id PK, slug UNIQUE, name, format, status, starts_at, ends_at, config_json)
team          (id PK, event_id, name, color)
registration  (event_id, discord_id, team_id, joined_at, PRIMARY KEY (event_id, discord_id))
archive       (event_id PK, r2_key, summary_json, archived_at)
```

`status` is `draft | live | ended | archived`. Index `registration(discord_id)` — it's the
hot path on every ingest. Index `player(ingest_token)` likewise.

**Event DO (SQLite)**

```sql
log           (seq INTEGER PRIMARY KEY AUTOINCREMENT, ts, kind, actor, payload_json)
                -- kind: 'game' | 'admin'; the ONLY authoritative table
tile_claim    (tile_id PK, team_id, player, log_seq)     -- materialized; rebuilt by fold
adjustment    (id PK, team_id, delta, reason, admin, log_seq)  -- materialized
```

`tile_claim` and `adjustment` are fold *output*. Anything that writes them directly
without appending to `log` is a bug.

## Auth

Discord OAuth2 authorization code flow, `identify` scope only. **Don't request
`guilds.members.read`** — the clan bot is already in the guild, so roles come from
`GET /guilds/{id}/members/{user}` server-side with the bot token, no extra user consent.

Session is a signed JWT in an httpOnly cookie (Web Crypto HMAC — no library, no user
table, no password reset, no account recovery).

This fits the handoff constraint well: **authorization derives from Discord roles the
clan already manages.** Leaders grant event-admin by assigning a Discord role, a thing
they know how to do, instead of us building user management.

Worth naming the tension honestly: `AGENTS.md` says "no custom auth." This *is* custom
auth. It's the least-custom version available — no credentials stored, revocation happens
in Discord — but it is real operational surface the clan inherits, and the Discord app
credentials belong in the handoff checklist from day one.

**Same origin matters.** `/events/*` on `feprestige.com` means the session cookie just
works and there is no CORS. A subdomain would force `Domain=.feprestige.com` cookies and
a preflight on every claim.

## Admin panel

Discord-role gated. Two capabilities, both of which append to the log:

- **Point adjustments** — `{team, delta, reason}`, append-only ledger.
- **Manual tile claim / unclaim** — not optional. Auto-matching *will* miss things:
  someone forgets to add the URL, gets a drop before registering, or an item name doesn't
  match the tile's aliases. A manual tile override fixes those correctly; papering over
  them with a point adjustment leaves the board visibly wrong.

Because adjustments carry a reason and flow through the log, the SSE feed gets a genuinely
useful affordance — *"Admin granted Team Blue +5 — manual verification"* — instead of a
score silently changing while people are watching.

## Archive

On event end, dump log + final state to R2 as JSON and mark the event `archived`. The DO
goes idle and stops costing anything. Past boards render as static reads from that blob —
the same pattern as the drops `manifest.json` (see `AGENTS.md` → Drops).

## Routing & deploy

- Workers Route on the zone: `feprestige.com/events/*` → events worker.
- The main worker holds `{pattern: "feprestige.com", custom_domain: true}` in
  `wrangler.jsonc`, which is effectively `/*`. Route specificity *should* send `/events/*`
  to the events worker. **[verify]** — prototype this with a hello-world worker **before
  writing any app code**; the interaction between a custom-domain route and a
  more-specific path route on a different worker is much easier to test than to reason
  about, and everything else assumes same-origin.
- Independent `wrangler deploy`; the site's deploy pipeline is untouched.
- Build/deploy runs from the Windows box for the same proxy reason as the site
  (see `DEPLOYMENT.md`).

## Engine vs per-event

**Engine (built once):** Discord auth + session, player identity + ingest tokens, teams
and registration, the Dink adapter and normalization, the append-only log, rule
evaluation, score derivation, SSE fan-out, admin panel, archive.

**Per-event (a row + a config blob):** board/tile definitions, rule set, point values,
team list, start/end dates.

Bingo #2 is a new row. A *different format* — boss race, SOTW, leaderboard — reuses
identity, ingest, logging, scoring, SSE, admin, and archive, and needs only new rule
predicates and a new renderer.

**Resist generalizing the renderer before the second format exists.** Build bingo's grid
concretely; extract the shared shell when a real second format shows what's actually
shared. The rule predicates are the part worth keeping data-driven from day one, because
they change *within* a single event.

## Cost

One DO held resident for a 3-day event: `0.125 GB × 259,200 s ≈ 32,400 GB-s`, at
$12.50/million GB-s ≈ **$0.40**. Requests and SQLite row I/O at this volume are rounding
error. The real cost is the **$5/mo Workers Paid base**, and the event can be run on the
paid plan only for the month it happens.

**[verify]** the current DO pricing and free-plan limits before relying on the above —
free-plan DOs are SQLite-backed only, and the numbers should be re-checked against
Cloudflare's current published rates.

## Open questions

1. **Tile match semantics.** "Abyssal whip" is one item name, but "any godsword", "any
   boss pet", "500 Zulrah KC", and "a 99" need alias lists, category matches, and
   thresholds respectively. Sketch a real card before fixing the rule schema — the card
   says how much matching machinery is justified.
2. **Where the app lives** — new repo, or a subdirectory of this one with its own
   `wrangler.jsonc`. Separate repo is cleaner for the handoff; a subdirectory is easier to
   keep in sync.
3. **Slash commands.** A Discord interactions endpoint (`/claim`, admin approvals from
   Discord) is a plausible v2. It needs Ed25519 signature verification **[verify** Workers
   Web Crypto Ed25519 support at our compatibility date**]** and a 3-second ACK — respond
   type 5 (deferred), finish in `waitUntil`, then PATCH the follow-up. Not load-bearing;
   the site's own auth covers claiming on day one.
4. **Proof images** — currently out (see decision 4). If they come back, so does R2
   re-hosting.
