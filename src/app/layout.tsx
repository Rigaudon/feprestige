import type { Metadata } from "next";
import { Chakra_Petch, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { sanityFetch } from "@/sanity/client";
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
  const title = settings?.title || "Clan Site";
  return {
    title: {
      default: title,
      template: `%s · ${title}`,
    },
    description: settings?.tagline || "Welcome to our clan.",
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
