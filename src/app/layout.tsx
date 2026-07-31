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

  return {
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description: settings?.tagline || "Welcome to FE Prestige.",
    icons: { icon, apple: icon },
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
      className={`${geistSans.variable} ${geistMono.variable} ${chakraPetch.variable} h-full antialiased`}
    >
      <body className="min-h-full text-neutral-100">{children}</body>
    </html>
  );
}
