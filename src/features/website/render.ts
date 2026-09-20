import "server-only";

import type { Metadata } from "next";

import type { RenderContext, RouteData } from "@/components/site/sections/types";
import { buildIntakeFormContext } from "@/features/intake/intake-page";
import type { PageSnapshot } from "@/features/website/contracts";
import {
  getPublicWebsiteMedia,
  getPublicWebsitePage,
  loadWebsiteGlobalsPreview,
  loadWebsiteMediaForPreview,
  loadWebsitePreview,
  snapshotMediaIds,
} from "@/features/website/data";
import { buildPublicPageContext } from "@/features/website/public-context";
import { interpolate } from "@/features/website/tokens";
import { createPublicMetadata } from "@/lib/seo/public-metadata";

type SearchParams = Readonly<Record<string, string | string[] | undefined>>;

const intakeSections = new Set([
  "contact_form",
  "start_project_wizard",
  "service_enquiry_form",
  "material_enquiry_form",
]);

function needsIntake(snapshot: PageSnapshot): boolean {
  return snapshot.sections.some((section) => intakeSections.has(section.type) && !section.hidden);
}

function first(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[a-z0-9-]{1,80}$/u.test(candidate) ? candidate : null;
}

async function routeData(snapshot: PageSnapshot, searchParams: SearchParams): Promise<RouteData> {
  const intake = needsIntake(snapshot) ? (await buildIntakeFormContext()).context : null;
  return { searchParams, intake };
}

export type WebsitePageRender = Readonly<{ snapshot: PageSnapshot; context: RenderContext }>;

/** The published page at a path, with everything its sections need. */
export async function loadPublishedPage(
  path: string,
  searchParams: SearchParams = {},
): Promise<WebsitePageRender | null> {
  const snapshot = await getPublicWebsitePage(path);
  if (!snapshot) return null;
  const serviceSlug = first(searchParams["service"]) ?? first(searchParams["need"]);
  const [base, media, route] = await Promise.all([
    buildPublicPageContext({ serviceSlug }),
    getPublicWebsiteMedia(snapshotMediaIds(snapshot)),
    routeData(snapshot, searchParams),
  ]);
  return { snapshot, context: { ...base, media, route, pageKey: snapshot.page.page_key } };
}

/** Staff draft preview: the draft snapshot against draft globals and draft media. */
export async function loadDraftPage(pageId: string): Promise<WebsitePageRender | null> {
  const snapshot = await loadWebsitePreview(pageId);
  if (!snapshot) return null;
  const globals = await loadWebsiteGlobalsPreview();
  const [base, media, route] = await Promise.all([
    buildPublicPageContext({ globals, draftPreview: true }),
    loadWebsiteMediaForPreview(snapshotMediaIds(snapshot)),
    routeData(snapshot, {}),
  ]);
  return { snapshot, context: { ...base, media, route, pageKey: snapshot.page.page_key } };
}

/** Page metadata from the snapshot's SEO fields with site defaults (CR1 §64). */
export async function websitePageMetadata(
  render: WebsitePageRender | null,
  fallback: Readonly<{ title: string; description: string }>,
): Promise<Metadata> {
  if (!render) return createPublicMetadata(fallback);
  const { snapshot, context } = render;
  const seo = snapshot.page.seo ?? {};
  const title = interpolate(seo.title ?? snapshot.page.title, context.tokens);
  const description = interpolate(
    seo.description ?? context.identity.seo.metaDescription ?? fallback.description,
    context.tokens,
  );
  const metadata = await createPublicMetadata({ title, description });
  const ogMedia = seo.og_media_id ? context.media.get(seo.og_media_id) : null;
  if (ogMedia) {
    metadata.openGraph = {
      ...(metadata.openGraph ?? {}),
      images: [{ url: `/api/media/website/${ogMedia.id}`, alt: ogMedia.altText ?? title }],
    };
  }
  if (seo.noindex || context.draftPreview) {
    metadata.robots = { index: false, follow: !context.draftPreview };
  }
  return metadata;
}

/** A stored revision rendered as a preview (CR1 §29: Preview Revision). */
export async function loadRevisionPage(
  revision: Readonly<{ snapshot: PageSnapshot; revision_no: number }>,
): Promise<WebsitePageRender | null> {
  const snapshot: PageSnapshot = {
    ...revision.snapshot,
    revision: { no: revision.revision_no, published_at: null, preview: true },
  };
  const globals = await loadWebsiteGlobalsPreview();
  const [base, media, route] = await Promise.all([
    buildPublicPageContext({ globals, draftPreview: true }),
    loadWebsiteMediaForPreview(snapshotMediaIds(snapshot)),
    routeData(snapshot, {}),
  ]);
  return { snapshot, context: { ...base, media, route, pageKey: snapshot.page.page_key } };
}
