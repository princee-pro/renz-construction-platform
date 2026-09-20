import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/about";
const FALLBACK = {
  eyebrow: "About",
  title: "About RENZ",
  description: "The About page is being prepared.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const render = await loadPublishedPage(PATH);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * About (CR1): a content page the owner composes; team and credentials appear only when published.
 */
export default async function AboutPage() {
  const render = await loadPublishedPage(PATH);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
