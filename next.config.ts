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
      // Re-hosted Discord "drops" images. Starts on the bucket's r2.dev URL;
      // add the custom subdomain here when migrating (see src/discord/env.ts).
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
};

export default nextConfig;

// Enables Cloudflare bindings during `next dev` (local development).
initOpenNextCloudflareForDev();
