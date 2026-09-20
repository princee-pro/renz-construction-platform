import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/insights";
const FALLBACK = {
  eyebrow: "Insights",
  title: "Insights",
  description: "Insights are being prepared.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const render = await loadPublishedPage(PATH);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Insights index (CR1): copy from the owner-managed page; articles are placed automatically (pinned, featured, newest).
 */
export default async function InsightsPage() {
  const render = await loadPublishedPage(PATH);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
