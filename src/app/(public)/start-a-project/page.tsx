import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/start-a-project";
const FALLBACK = {
  eyebrow: "Start a Project",
  title: "Start a Project",
  description: "The intake is being prepared.",
} as const;

export async function generateMetadata({
  searchParams,
}: PageProps<"/start-a-project">): Promise<Metadata> {
  const render = await loadPublishedPage(PATH, await searchParams);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Start a Project (CR1): owner-editable surrounding copy; the seven-step C8 wizard, its tokens, validation, uploads and lead mapping are system-controlled.
 */
export default async function StartAProjectPage({ searchParams }: PageProps<"/start-a-project">) {
  const render = await loadPublishedPage(PATH, await searchParams);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
