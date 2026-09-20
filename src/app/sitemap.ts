import type { MetadataRoute } from "next";

import { getPublicSitemapEntries } from "@/features/public-content/data";
import { getPublicWebsitePages } from "@/features/website/data";
import { getSiteIdentity } from "@/lib/site/public-configuration";

export const dynamic = "force-dynamic";

/**
 * Legitimate public routes only. Never /admin, /i/[token], /po/[token],
 * previews or staff routes. Empty in preview mode (the site is noindex).
 * CR1: owner-managed pages come from the published page register (noindex
 * pages and unpublished pages are omitted automatically).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const identity = await getSiteIdentity();
  if (identity.siteMode !== "live" || !identity.canonicalBaseUrl) return [];
  const base = identity.canonicalBaseUrl;
  const legal = identity.legal ?? {};
  const [pages, dynamicEntries] = await Promise.all([
    getPublicWebsitePages(),
    getPublicSitemapEntries(),
  ]);
  const entries: MetadataRoute.Sitemap = pages
    .filter((page) => !page.noindex && !page.path.startsWith("/_"))
    .map((page) => ({
      url: `${base}${page.path === "/" ? "" : page.path}`,
      changeFrequency: page.page_type === "system" ? "weekly" : "monthly",
      ...(page.published_at ? { lastModified: new Date(page.published_at) } : {}),
    }));
  for (const slug of ["privacy", "terms"] as const) {
    if (legal[slug]?.published) entries.push({ url: `${base}/${slug}`, changeFrequency: "yearly" });
  }
  for (const entry of dynamicEntries)
    entries.push({ url: `${base}${entry}`, changeFrequency: "monthly" });
  return entries;
}
