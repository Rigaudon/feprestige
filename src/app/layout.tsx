import type { Metadata } from "next";
import { Chakra_Petch, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { sanityFetch } from "@/sanity/client";
import { urlFor } from "@/sanity/image";
import { settingsQuery } from "@/sanity/queries";
import type { Settings } from "@/sanity/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Angular "tech" display face for headings and nav labels — the gaming accent.
const chakraPetch = Chakra_Petch({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Title/description come from Sanity Site Settings so editors control them.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<Settings | null>({
    query: settingsQuery,
    fallback: null,
  });
  const title = settings?.title || "FE Prestige";
  const description = settings?.tagline || "Welcome to FE Prestige.";

  // Canonical site URL. Discord/Slack/etc. require ABSOLUTE og:image URLs, so
  // metadataBase resolves any relative ones. Overridable via env; defaults to
  // the production domain (mirrors the baked-in default pattern in env.ts).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feprestige.com";

  // Favicon follows the Sanity logo (Site Settings) so editors control it with
  // the same upload that drives the sidebar. Falls back to the violet monogram
  // in public/icon.svg when no logo is set.
  const icon = settings?.logo
    ? [
        {
          url: urlFor(settings.logo).width(96).height(96).fit("crop").format("png").url(),
          type: "image/png",
        },
      ]
    : [{ url: "/icon.svg", type: "image/svg+xml" }];

  // Open Graph image = the social link preview. A dedicated "Social preview
  // image" (ogImage) wins, cropped to the 1200×630 banner Discord renders large.
  // Otherwise fall back to the logo, scaled to fit (no crop) — it shows as a
  // small thumbnail. Discord ignores the favicon, so without one of these the
  // shared link stays a bare URL with no image.
  const banner = settings?.ogImage;
  const ogImages = banner
    ? [
        {
          url: urlFor(banner).width(1200).height(630).fit("crop").format("png").url(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ]
    : settings?.logo
      ? [{ url: urlFor(settings.logo).width(1200).fit("max").format("png").url(), alt: title }]
      : [];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description,
    icons: { icon, apple: icon },
    openGraph: {
      type: "website",
      siteName: title,
      title,
      description,
      url: siteUrl,
      images: ogImages,
    },
    twitter: {
      // A wide banner gets the large-image card; a square logo looks better in
      // the compact card.
      card: banner ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages.map((image) => image.url),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
    >
      <body className="min-h-full text-fg">
        {/* Set the theme before first paint to avoid a flash: use the saved
            choice, else match the OS light/dark preference. Runs as the first
            thing in <body>; kept in sync afterwards by ThemePicker. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var ok=["dark","light","emerald","crimson","ocean"];if(!t||ok.indexOf(t)===-1){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
