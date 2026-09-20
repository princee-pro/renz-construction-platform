import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/projects";
const FALLBACK = {
  eyebrow: "Projects",
  title: "Projects",
  description: "Projects are being prepared.",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const render = await loadPublishedPage(PATH);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Projects index (CR1): copy from the owner-managed page; projects are placed automatically from the published register.
 */
export default async function ProjectsPage() {
  const render = await loadPublishedPage(PATH);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
