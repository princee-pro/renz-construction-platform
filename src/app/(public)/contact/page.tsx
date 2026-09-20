import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/contact";
const FALLBACK = {
  eyebrow: "Contact",
  title: "Contact RENZ",
  description: "Contact details are being prepared.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const render = await loadPublishedPage(PATH);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Contact (CR1): owner-editable copy around the system-protected C8 contact form and typed contact settings.
 */
export default async function ContactPage() {
  const render = await loadPublishedPage(PATH);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
