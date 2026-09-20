import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { WebsiteRoute } from "@/components/site/website-route";
import { resolveRouteAlias } from "@/features/website/data";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";
import { isAdmittedCustomSlug } from "@/features/website/routes";

export const dynamic = "force-dynamic";

/**
 * Owner-created custom pages (CR1 §11–13): ONE controlled renderer. The
 * slug must be a valid, unreserved single segment; only a PUBLISHED custom
 * page renders; a renamed page redirects from its old address. Nothing
 * here generates routes from database strings.
 */
export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isAdmittedCustomSlug(slug)) return {};
  const render = await loadPublishedPage(`/${slug}`);
  return websitePageMetadata(render, { title: "Page", description: "" });
}

export default async function CustomPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  if (!isAdmittedCustomSlug(slug)) notFound();
  const render = await loadPublishedPage(`/${slug}`);
  if (!render) {
    const alias = await resolveRouteAlias(`/${slug}`);
    if (alias) permanentRedirect(alias);
    notFound();
  }
  if (render.snapshot.page.page_type !== "custom" && render.snapshot.page.page_type !== "content") {
    notFound();
  }
  return (
    <WebsiteRoute
      fallback={{ eyebrow: "Page", title: "Page unavailable", description: "" }}
      render={render}
    />
  );
}
