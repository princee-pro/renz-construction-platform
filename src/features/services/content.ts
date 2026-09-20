/**
 * The public service shape every public component renders (CR1).
 *
 * Before CR1 this module held the five static categories and was a second
 * source of truth beside the Admin services register. The static text now
 * lives in `seed-categories.ts` (used once by `scripts/website-seed-content.mjs`
 * to migrate the approved copy into the register); the public site reads
 * published services only, through `service-source.ts`.
 */

export type ServiceFaq = Readonly<{
  question: string;
  answer: string;
}>;

export type ServiceCategory = Readonly<{
  /** Published service id (relationship key for projects and insights). */
  id: string;
  index: string;
  slug: string;
  name: string;
  positioning: string;
  overview: readonly string[];
  subServices: readonly string[];
  useCases: readonly string[];
  process: readonly string[];
  coordination: string;
  faqs: readonly ServiceFaq[];
  deliverables: string | null;
  exclusions: string | null;
  clientInputs: string | null;
  deliveryWording: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroAssetId: string | null;
}>;

export function getServiceBySlug(
  services: readonly ServiceCategory[],
  slug: string,
): ServiceCategory | null {
  return services.find((service) => service.slug === slug) ?? null;
}
