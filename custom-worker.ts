// Custom Worker entrypoint. Wraps the OpenNext-generated fetch handler and adds a
// Cloudflare Cron Trigger (`scheduled`) that drives the Discord "drops" incremental
// sync. This is now the RELIABLE PRIMARY schedule: GitHub Actions cron
// (.github/workflows/drops-sync.yml) is best-effort and was leaving scheduled runs
// queued for hours, so drops stopped updating. Cloudflare fires this on the worker
// itself, on time. The GitHub workflow is kept as a hardened fallback.
//
// Why a wrapper: `.open-next/worker.js` is regenerated on every deploy and only
// exports a `fetch` handler, so `scheduled` can't live there. Importing it and
// re-exporting is the OpenNext-sanctioned pattern
// (https://opennext.js.org/cloudflare/howtos/custom-worker). wrangler.jsonc `main`
// points here; wrangler's esbuild bundles this file (no type-check), resolving the
// build-output imports below — which is why it's excluded from tsconfig/eslint.

// @ts-expect-error - resolved by wrangler build from the generated OpenNext output
import { default as handler } from "./.open-next/worker.js";

// Re-export the OpenNext Durable Objects so their bindings still resolve now that
// this file (not worker.js) is `main`. Harmless if unbound; required if ever bound.
// @ts-expect-error - resolved by wrangler build from the generated OpenNext output
export {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

interface Env {
  DISCORD_SYNC_SECRET?: string;
}

// Minimal ExecutionContext shape (we avoid @cloudflare/workers-types; see
// src/discord/sync.ts for the same "local minimal types" convention).
interface ExecutionCtx {
  waitUntil(promise: Promise<unknown>): void;
}

// Cloudflare tells us which trigger fired via `controller.cron`, matching the
// expression in wrangler.jsonc verbatim.
interface ScheduledController {
  cron?: string;
}

// Keep in sync with wrangler.jsonc `triggers.crons`. Only the wiki schedule is
// matched explicitly: if Cloudflare ever hands back a string we don't recognise
// we fall through to the drops sync, so an unexpected value degrades to the
// existing (and more time-sensitive) job rather than silently dropping it.
const WIKI_CRON = "7,27,47 * * * *";

const JOBS = {
  drops: {
    label: "Drops",
    url: "https://feprestige.com/api/discord/sync?mode=incremental",
  },
  wiki: {
    label: "Wiki CA",
    url: "https://feprestige.com/api/wiki/sync",
  },
} as const;

export default {
  // Delegate all HTTP traffic to the unmodified OpenNext handler. `fetch` uses no
  // `this`, so passing the method reference directly is safe (per the OpenNext howto).
  fetch: handler.fetch,

  // Cloudflare Cron Triggers. Invokes the secret-gated sync routes IN-PROCESS (a
  // direct handler call, not an outbound fetch) so they run the exact same code
  // path as the manual/GitHub trigger with no extra network hop. The runtime
  // secret DISCORD_SYNC_SECRET must be set on the worker
  // (`npx wrangler secret put DISCORD_SYNC_SECRET`); both jobs share it.
  //
  // Two schedules, dispatched on the cron expression that fired:
  //   */15 * * * *    -> Discord drops incremental sync
  //   7,27,47 * * * * -> OSRS wiki combat-achievements batch
  // They're deliberately on separate ticks: the 50-subrequest cap is per
  // invocation, so running both in one would make them compete for it.
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionCtx,
  ) {
    const job = controller?.cron === WIKI_CRON ? JOBS.wiki : JOBS.drops;

    const secret = env.DISCORD_SYNC_SECRET;
    if (!secret) {
      console.error(
        `${job.label} cron: DISCORD_SYNC_SECRET unset; skipping sync`,
      );
      return;
    }

    const req = new Request(job.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    // Reuse the OpenNext fetch handler; it sets up the Cloudflare request context
    // the route needs (getCloudflareContext, revalidateTag).
    const run = handler
      .fetch(req, env, ctx)
      .then(async (res: Response) => {
        console.log(
          `${job.label} cron (${controller?.cron}): sync -> HTTP ${res.status} ${await res.text()}`,
        );
      })
      .catch((err: unknown) => {
        console.error(`${job.label} cron: sync failed`, err);
      });
    ctx.waitUntil(run);
  },
};
