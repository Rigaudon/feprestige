import { CursorGlow } from "@/components/CursorGlow";
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

  // Live Wise Old Man tabs, shown only when a group id is set and the owner
  // hasn't hidden them. These are code routes (not Sanity pages), so they're
  // appended to the Sanity-driven nav.
  const womEnabled =
    Boolean(settings?.womGroupId) && settings?.showWomTabs !== false;
  const womNav = womEnabled
    ? [
        { title: "Roster", href: "/roster" },
        { title: "Hiscores", href: "/hiscores" },
        { title: "Gains", href: "/gains" },
      ]
    : [];

  return (
    <div className="min-h-screen lg:pl-64">
      <CursorGlow />
      <Sidebar settings={settings} navItems={navItems} extraNav={womNav} />
      <main className="relative z-10 min-h-screen">{children}</main>
    </div>
  );
}
