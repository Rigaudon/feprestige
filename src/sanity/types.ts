import type { SanityImageSource } from "@sanity/image-url";
import type { PortableTextBlock } from "next-sanity";

// Hand-written types matching the projections in sanity/queries.ts. These give
// components real type safety without needing generated types. If you later run
// `npx sanity typegen`, you can swap these for the generated ones.

export interface ImageWithAlt {
  asset?: { _ref: string; _type: "reference" };
  alt?: string;
  hotspot?: unknown;
  crop?: unknown;
}

export interface Settings {
  title?: string;
  tagline?: string;
  logo?: SanityImageSource;
  primaryCta?: { label?: string; url?: string };
  socialLinks?: { platform?: string; url?: string }[];
  footerText?: string;
  womGroupId?: number;
  showWomTabs?: boolean;
}

export interface NavItem {
  title?: string;
  slug?: string;
  isHome?: boolean;
}

export interface PageDoc {
  _id: string;
  title?: string;
  subtitle?: string;
  slug?: string;
  isHome?: boolean;
  heroImage?: ImageWithAlt;
  body?: PortableTextBlock[];
}
