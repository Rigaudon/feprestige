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

export default {
  // Delegate all HTTP traffic to the unmodified OpenNext handler. `fetch` uses no
  // `this`, so passing the method reference directly is safe (per the OpenNext howto).
  fetch: handler.fetch,

  // Cloudflare Cron Trigger. Invokes the existing secret-gated sync route
  // IN-PROCESS (a direct handler call, not an outbound fetch) so it runs the exact
  // same code path as the manual/GitHub trigger with no extra network hop. The
  // runtime secret DISCORD_SYNC_SECRET must be set on the worker
  // (`npx wrangler secret put DISCORD_SYNC_SECRET`).
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionCtx) {
    const secret = env.DISCORD_SYNC_SECRET;
    if (!secret) {
      console.error("Drops cron: DISCORD_SYNC_SECRET unset; skipping sync");
      return;
    }
    const req = new Request(
      "https://feprestige.com/api/discord/sync?mode=incremental",
      { method: "POST", headers: { Authorization: `Bearer ${secret}` } },
    );
    // Reuse the OpenNext fetch handler; it sets up the Cloudflare request context
    // the route needs (getCloudflareContext, revalidateTag).
    const run = handler
      .fetch(req, env, ctx)
      .then(async (res: Response) => {
        console.log(`Drops cron: sync -> HTTP ${res.status} ${await res.text()}`);
      })
      .catch((err: unknown) => {
        console.error("Drops cron: sync failed", err);
      });
    ctx.waitUntil(run);
  },
};
