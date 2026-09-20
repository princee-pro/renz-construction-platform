import "server-only";

import { cache } from "react";

import type { ServiceCategory } from "@/features/services/content";
import { getPublishedServices } from "@/features/public-content/data";
import type { PublicService } from "@/features/public-content/contracts";

/**
 * Single domain boundary for "what services does the public site show":
 * the published Admin services register, in display order. There is no
 * static fallback any more (CR1 §4): if the owner publishes Service #6 it
 * appears everywhere; if they unpublish #3 the gap closes.
 *
 * Every public consumer (`/services`, `ServicesNavigator`, the nav mega
 * panel, the footer, the home services section, the intake cue) goes
 * through this function.
 */
export const getPublicServiceCategories = cache(async (): Promise<readonly ServiceCategory[]> => {
  const published = await getPublishedServices();
  return published.map((service, index) => mapPublishedServiceToCategory(service, index));
});

export async function getPublicServiceCategoryBySlug(
  slug: string,
): Promise<ServiceCategory | null> {
  const categories = await getPublicServiceCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

function splitLines(value: string | null): readonly string[] {
  if (!value) return [];
  return value
    .split(/\r?\n+/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function mapPublishedServiceToCategory(
  service: PublicService,
  index: number,
): ServiceCategory {
  const overview = service.bodyBlocks
    .filter(
      (block): block is Extract<typeof block, { type: "paragraph" }> => block.type === "paragraph",
    )
    .map((block) => block.text);
  return {
    id: service.id,
    index: String(index + 1).padStart(2, "0"),
    slug: service.slug,
    name: service.name,
    positioning: service.positioning ?? service.summary,
    overview:
      overview.length > 0 ? overview : [service.summary, ...(service.scope ? [service.scope] : [])],
    subServices:
      service.subServices.length > 0 ? service.subServices : splitLines(service.deliverables),
    useCases: service.useCases,
    process: service.processSteps,
    coordination: service.coordination ?? service.deliveryWording ?? "",
    faqs: service.faqs,
    deliverables: service.deliverables,
    exclusions: service.exclusions,
    clientInputs: service.clientInputs,
    deliveryWording: service.deliveryWording,
    seoTitle: service.seoTitle,
    seoDescription: service.seoDescription,
    heroAssetId: service.heroAssetId,
  };
}
