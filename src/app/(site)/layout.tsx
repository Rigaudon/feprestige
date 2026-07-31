import { Sidebar } from "@/components/Sidebar";
import { sanityFetch } from "@/sanity/client";
import { navQuery, settingsQuery } from "@/sanity/queries";
import type { NavItem, Settings } from "@/sanity/types";

// Layout for the public site: fixed left sidebar + content, all driven by
// Sanity. The Studio at /admin lives in a separate route group and does not use
// this. (There is no footer — socials + CTA moved into the sidebar.)
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
    <div className="min-h-screen lg:pl-64">
      <Sidebar settings={settings} navItems={navItems} />
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
