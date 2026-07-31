import type { Metadata, Viewport } from "next";

// Server component for the Studio route: provides the route segment config and
// Studio-specific <head> metadata/viewport. These are inlined (rather than
// re-exported from "next-sanity/studio") so this server module never references
// the Studio client component — that keeps the large `sanity` library out of the
// server/Worker bundle. Values mirror next-sanity's defaults.
export const dynamic = "force-static";

export const metadata: Metadata = {
  referrer: "same-origin",
  robots: "noindex",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
