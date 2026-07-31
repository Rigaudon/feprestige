import { defineQuery } from "next-sanity";

// Shared projection for rendering a full page.
const pageFields = /* groq */ `
  _id,
  title,
  subtitle,
  "slug": slug.current,
  isHome,
  heroImage,
  body
`;

// Site-wide settings (singleton).
export const settingsQuery = defineQuery(`*[_type == "siteSettings"][0]{
  title,
  tagline,
  logo,
  ogImage,
  primaryCta,
  socialLinks,
  footerText,
  womGroupId,
  showWomTabs,
  womContent {
    roster { eyebrow, title, subtitle },
    hiscores { eyebrow, title, subtitle },
    gains { eyebrow, title, subtitle }
  }
}`);

// Nav items: pages flagged to show, ordered. Home is linked separately as "/".
export const navQuery = defineQuery(`*[_type == "page" && showInNav == true]
  | order(navOrder asc, title asc){
    title,
    "slug": slug.current,
    isHome
  }`);

// The page flagged as home, rendered at the site root.
export const homePageQuery = defineQuery(`*[_type == "page" && isHome == true][0]{
  ${pageFields}
}`);

// A single page by slug (used for /[slug]).
export const pageBySlugQuery = defineQuery(
  `*[_type == "page" && slug.current == $slug][0]{ ${pageFields} }`,
);

// Slugs for generateStaticParams — all pages except the home page (home is "/").
export const pageSlugsQuery = defineQuery(
  `*[_type == "page" && defined(slug.current) && isHome != true].slug.current`,
);
