import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
      // Re-hosted Discord "drops" images — served from the bucket's r2.dev URL
      // now, or a custom subdomain (e.g. drops.feprestige.com) later. The
      // wildcard on our own domain means switching NEXT_PUBLIC_DROPS_CDN_BASE
      // needs no code change (see src/discord/env.ts).
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "**.feprestige.com",
      },
    ],
  },
};

export default nextConfig;

// Enables Cloudflare bindings during `next dev` (local development).
initOpenNextCloudflareForDev();
