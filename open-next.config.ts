import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal configuration: uses in-memory defaults (no R2/D1 to provision), which
// suits a static-first content site. Content updates flow through a full
// rebuild-on-publish (Sanity webhook -> Cloudflare deploy hook); see README.
//
// If you later want on-demand ISR (revalidateTag from /api/revalidate) to persist
// across the deployment, add an R2 incremental cache + tag cache override here
// and the matching bindings in wrangler.jsonc.
export default defineCloudflareConfig({});
