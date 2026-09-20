import type { Metadata } from "next";

import { getSiteIdentity, type SiteIdentity } from "@/lib/site/public-configuration";

/** Preview mode: the whole public site is kept out of search indexes. */
export const publicRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    noarchive: true,
    nosnippet: true,
  },
};

/** Live mode: normal indexing. */
export const liveRobots: Metadata["robots"] = { index: true, follow: true };

export function robotsFor(identity: SiteIdentity): Metadata["robots"] {
  return identity.siteMode === "live" ? liveRobots : publicRobots;
}

type PublicMetadataInput = Readonly<{
  title: string;
  description: string;
  canonical?: string | null | undefined;
}>;

/**
 * Per-page public metadata built on the PUBLISHED site configuration: site
 * name, robots by site mode, canonical base and the default share image slot.
 */
export async function createPublicMetadata({
  title,
  description,
  canonical,
}: PublicMetadataInput): Promise<Metadata> {
  const identity = await getSiteIdentity();
  const shareImage =
    identity.brand["default_share"] || identity.brand["default_og"]
      ? [
          {
            url: identity.brand["default_share"]
              ? "/api/media/brand/default_share"
              : "/api/media/brand/default_og",
          },
        ]
      : undefined;
  return {
    title,
    description,
    robots: robotsFor(identity),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      siteName: identity.seo.siteName,
      ...(shareImage ? { images: shareImage } : {}),
    },
    twitter: {
      card: shareImage ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}
