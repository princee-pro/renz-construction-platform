import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { InsightArticle } from "@/components/site/insight-article";
import { getPublishedPostBySlug, getPublishedPosts } from "@/features/public-content/data";
import { getPublicServiceCategories } from "@/features/services/service-source";
import { getWebsiteGlobals, resolveRouteAlias } from "@/features/website/data";
import { createPublicMetadata } from "@/lib/seo/public-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/insights/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return createPublicMetadata({ title: "Insight not found", description: "" });
  return createPublicMetadata({
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
  });
}

/**
 * Published insight (CR1): the owner-managed article with its topic, the
 * chosen related service, the global professional-advice note and the next
 * published article. A renamed insight redirects from its old address.
 */
export default async function InsightDetailPage({ params }: PageProps<"/insights/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) {
    const alias = await resolveRouteAlias(`/insights/${slug}`);
    if (alias) permanentRedirect(alias);
    notFound();
  }
  const [published, services, globals] = await Promise.all([
    getPublishedPosts(),
    getPublicServiceCategories(),
    getWebsiteGlobals(),
  ]);
  const relatedService = post.relatedServiceId
    ? (services.find((service) => service.id === post.relatedServiceId) ?? null)
    : null;
  const index = published.findIndex((entry) => entry.slug === post.slug);
  const next = published.length > 1 ? (published[(index + 1) % published.length] ?? null) : null;
  return (
    <InsightArticle
      view={{
        title: post.title,
        excerpt: post.excerpt,
        bodyBlocks: post.bodyBlocks,
        topic: post.topic,
        publicationDate: post.publicationDate,
        relatedService: relatedService
          ? { slug: relatedService.slug, name: relatedService.name }
          : null,
        note: globals.copy.insight_note || null,
        next: next && next.slug !== post.slug ? { slug: next.slug, title: next.title } : null,
      }}
    />
  );
}
