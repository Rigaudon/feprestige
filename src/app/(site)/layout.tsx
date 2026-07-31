import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { sanityFetch } from "@/sanity/client";
import { navQuery, settingsQuery } from "@/sanity/queries";
import type { NavItem, Settings } from "@/sanity/types";

// Layout for the public site: nav + content + footer, all driven by Sanity.
// The Studio at /admin lives in a separate route group and does not use this.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, navItems] = await Promise.all([
    sanityFetch<Settings | null>({ query: settingsQuery, fallback: null }),
    sanityFetch<NavItem[]>({ query: navQuery, fallback: [] }),
  ]);

  return (
    <>
      <Nav settings={settings} navItems={navItems} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
