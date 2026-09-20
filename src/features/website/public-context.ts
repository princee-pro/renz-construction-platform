import "server-only";

import { cache } from "react";

import type { ServiceCategory } from "@/features/services/content";
import { getPublicServiceCategories } from "@/features/services/service-source";
import {
  getAllPublishedProjectServiceLinks,
  getPublishedCredentials,
  getPublishedPosts,
  getPublishedProjectCards,
  getPublishedTeam,
  getPublishedTestimonials,
  type ProjectCardData,
} from "@/features/public-content/data";
import type {
  PublicCredential,
  PublicPost,
  PublicProjectServiceLink,
  PublicTeamMember,
  PublicTestimonial,
} from "@/features/public-content/contracts";
import { getWebsiteGlobals } from "@/features/website/data";
import type { WebsiteGlobals } from "@/features/website/contracts";
import { tokenTable, type TokenContext } from "@/features/website/tokens";
import { isClientPreviewEnabled } from "@/lib/env/client-preview";
import { getSiteIdentity, type SiteIdentity } from "@/lib/site/public-configuration";

/**
 * Everything a page snapshot needs to render: the published domains the
 * sections draw from, the global copy, the business identity and the token
 * table. Built once per request and shared by every section.
 */
export type PublicPageContext = Readonly<{
  identity: SiteIdentity;
  previewEnabled: boolean;
  services: readonly ServiceCategory[];
  projects: readonly ProjectCardData[];
  projectServiceLinks: readonly PublicProjectServiceLink[];
  posts: readonly PublicPost[];
  testimonials: readonly PublicTestimonial[];
  team: readonly PublicTeamMember[];
  credentials: readonly PublicCredential[];
  globals: WebsiteGlobals;
  tokens: Readonly<Record<string, string>>;
  /** Preselected service for enquiry pages (token {{service.name}}). */
  service: ServiceCategory | null;
  /** Staff draft preview (never true for anonymous visitors). */
  draftPreview: boolean;
}>;

function region(identity: SiteIdentity): string | null {
  const value = [identity.location?.city, identity.location?.country].filter(Boolean).join(", ");
  return value || identity.serviceArea || null;
}

export function buildTokenContext(context: Omit<PublicPageContext, "tokens">): TokenContext {
  return {
    services: {
      count: context.services.length,
      names: context.services.map((service) => service.name),
    },
    projects: {
      count: context.projects.length,
      conceptCount: context.projects.filter((project) => project.evidenceClass !== "real_project")
        .length,
      realCount: context.projects.filter((project) => project.evidenceClass === "real_project")
        .length,
    },
    insights: {
      count: context.posts.length,
      topics: [
        ...new Set(
          context.posts
            .map((post) => post.topic)
            .filter((topic): topic is string => Boolean(topic)),
        ),
      ],
    },
    process: { count: context.globals.processSteps.length },
    business: {
      displayName: context.identity.displayName,
      shortName: context.identity.shortName,
      region: region(context.identity),
      serviceArea: context.identity.serviceArea,
    },
    contact: { email: context.identity.email },
    service: context.service ? { name: context.service.name } : null,
  };
}

const loadShared = cache(async () => {
  const [
    identity,
    services,
    projects,
    projectServiceLinks,
    posts,
    testimonials,
    team,
    credentials,
    globals,
  ] = await Promise.all([
    getSiteIdentity(),
    getPublicServiceCategories(),
    getPublishedProjectCards(),
    getAllPublishedProjectServiceLinks(),
    getPublishedPosts(),
    getPublishedTestimonials(),
    getPublishedTeam(),
    getPublishedCredentials(),
    getWebsiteGlobals(),
  ]);
  return {
    identity,
    services,
    projects,
    projectServiceLinks,
    posts,
    testimonials,
    team,
    credentials,
    globals,
  };
});

export async function buildPublicPageContext(
  options: Readonly<{
    serviceSlug?: string | null;
    globals?: WebsiteGlobals;
    draftPreview?: boolean;
  }> = {},
): Promise<PublicPageContext> {
  const shared = await loadShared();
  const service = options.serviceSlug
    ? (shared.services.find((entry) => entry.slug === options.serviceSlug) ?? null)
    : null;
  const base = {
    ...shared,
    globals: options.globals ?? shared.globals,
    previewEnabled: isClientPreviewEnabled(),
    service,
    draftPreview: options.draftPreview === true,
  };
  return { ...base, tokens: tokenTable(buildTokenContext(base)) };
}
