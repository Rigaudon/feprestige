"use client";

import dynamic from "next/dynamic";

// Load the Studio client-side only (ssr: false). This keeps the entire `sanity`
// Studio library out of the server/Worker bundle — essential for staying under
// Cloudflare's free-tier Worker size limit. The route still ships as a static
// shell (see the sibling layout.tsx: dynamic = "force-static"); the Studio boots
// in the browser and is gated by Sanity's own login.
const Studio = dynamic(() => import("@/components/Studio"), { ssr: false });

export default function StudioPage() {
  return <Studio />;
}
