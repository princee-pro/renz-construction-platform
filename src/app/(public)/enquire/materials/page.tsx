import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/enquire/materials";
const FALLBACK = {
  eyebrow: "Material enquiry",
  title: "Ask about materials",
  description: "The enquiry form is being prepared.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const render = await loadPublishedPage(PATH);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Material enquiry (C8 / CR1): the form is system-controlled; the surrounding copy is owner-editable.
 */
export default async function MaterialEnquiryPage() {
  const render = await loadPublishedPage(PATH);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
