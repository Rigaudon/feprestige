import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Hero } from "@/components/Hero";
import { PortableText } from "@/components/PortableText";
import { sanityFetch } from "@/sanity/client";
import { pageBySlugQuery, pageSlugsQuery } from "@/sanity/queries";
import type { PageDoc } from "@/sanity/types";

// Prerender a static page for each non-home page at build time. New pages added
// later render on-demand (ISR) and are then cached.
export async function generateStaticParams() {
  const slugs = await sanityFetch<string[]>({
    query: pageSlugsQuery,
    fallback: [],
  });
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await sanityFetch<PageDoc | null>({
    query: pageBySlugQuery,
    params: { slug },
    tags: ["page"],
    fallback: null,
  });
  if (!page) return {};
  return { title: page.title, description: page.subtitle };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await sanityFetch<PageDoc | null>({
    query: pageBySlugQuery,
    params: { slug },
    tags: ["page"],
    fallback: null,
  });

  if (!page) notFound();

  return (
    <>
      <Hero title={page.title} subtitle={page.subtitle} image={page.heroImage} />
      {page.body?.length ? (
        <article className="mx-auto max-w-3xl px-4 py-12">
          <PortableText value={page.body} />
        </article>
      ) : null}
    </>
  );
}
