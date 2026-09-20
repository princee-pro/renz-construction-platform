import type { MetadataRoute } from "next";

import { getSiteIdentity } from "@/lib/site/public-configuration";

export const dynamic = "force-dynamic";

/**
 * Preview mode disallows everything. Live mode allows the public routes and
 * still keeps staff, token-scoped documents and APIs out of every index.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const identity = await getSiteIdentity();
  if (identity.siteMode !== "live") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/i/", "/po/", "/api/"] },
    ...(identity.canonicalBaseUrl ? { sitemap: `${identity.canonicalBaseUrl}/sitemap.xml` } : {}),
  };
}
