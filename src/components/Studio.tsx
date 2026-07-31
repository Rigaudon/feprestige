"use client";

import { NextStudio } from "next-sanity/studio";

import config from "../../sanity.config";

// Isolated client-only Studio. Imported via a dynamic({ ssr: false }) call in the
// route page so the large `sanity` Studio library is excluded from the server
// bundle (keeping the Cloudflare Worker under the free-tier size limit).
export default function Studio() {
  return <NextStudio config={config} />;
}
