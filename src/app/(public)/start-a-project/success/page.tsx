import type { Metadata } from "next";

import { WebsiteRoute } from "@/components/site/website-route";
import { loadPublishedPage, websitePageMetadata } from "@/features/website/render";

export const dynamic = "force-dynamic";

const PATH = "/start-a-project/success";
const FALLBACK = {
  eyebrow: "Start a Project",
  title: "Brief received",
  description: "Your brief has reached RENZ.",
} as const;

export async function generateMetadata({
  searchParams,
}: PageProps<"/start-a-project/success">): Promise<Metadata> {
  const render = await loadPublishedPage(PATH, await searchParams);
  return websitePageMetadata(render, { title: FALLBACK.title, description: FALLBACK.description });
}

/**
 * Submission success (C8 §105 / CR1): only the public reference travels in the URL; the confirmation copy is owner-editable.
 */
export default async function StartAProjectSuccessPage({
  searchParams,
}: PageProps<"/start-a-project/success">) {
  const render = await loadPublishedPage(PATH, await searchParams);
  return <WebsiteRoute fallback={FALLBACK} render={render} />;
}
