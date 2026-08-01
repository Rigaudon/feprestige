import Link from "next/link";

import { Hero } from "@/components/Hero";
import { PortableText } from "@/components/PortableText";
import { sanityFetch } from "@/sanity/client";
import { homePageQuery } from "@/sanity/queries";
import type { PageDoc } from "@/sanity/types";

export default async function HomePage() {
  const page = await sanityFetch<PageDoc | null>({
    query: homePageQuery,
    tags: ["page"],
    fallback: null,
  });

  // Friendly empty state shown before any home page exists in the Studio.
  if (!page) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-strong">
          FE Prestige
        </p>
        <h1 className="font-display text-4xl font-bold uppercase tracking-tight text-fg">
          Welcome
        </h1>
        <p className="mt-4 text-fg-muted">
          No home page yet. Open the{" "}
          <Link href="/admin" className="text-accent-strong underline">
            Studio
          </Link>{" "}
          and create a Page with “Use as home page” enabled.
        </p>
      </div>
    );
  }

  return (
    <>
      <Hero
        title={page.title}
        subtitle={page.subtitle}
        image={page.heroImage}
      />
      {page.body?.length ? (
        <article className="mx-auto max-w-5xl px-4 py-12">
          <PortableText value={page.body} />
        </article>
      ) : null}
    </>
  );
}
