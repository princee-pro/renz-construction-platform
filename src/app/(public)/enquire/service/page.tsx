import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/enquire/service";
const FALLBACK = {
  eyebrow: "Service enquiry",
  title: "Enquire about a service",
  description: "The enquiry form is being prepared.",
} as const;

export async function generateMetadata({
  searchParams,
}: PageProps<"/enquire/service">): Promise<Metadata> {
  const render = await loadPublishedPage(PATH, await searchParams);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Service enquiry (C8 §16 / CR1): `?service=<slug>` preselects an approved service key only; surrounding copy is owner-editable.
 */
export default async function ServiceEnquiryPage({ searchParams }: PageProps<"/enquire/service">) {
  const render = await loadPublishedPage(PATH, await searchParams);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
