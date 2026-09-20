import type { Metadata } from "next";

import { LegalPageView } from "@/components/site/legal-page";
import { getPublishedPageByPath } from "@/features/public-content/data";
import { createPublicMetadata } from "@/lib/seo/public-metadata";
import { getPublishedLegalPage } from "@/lib/site/legal-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [legal, page] = await Promise.all([
    getPublishedLegalPage("privacy"),
    getPublishedPageByPath("/privacy"),
  ]);
  return createPublicMetadata({
    title: legal?.title ?? page?.seoTitle ?? "Privacy",
    description: page?.seoDescription ?? "How RENZ handles information on this website.",
    canonical: page?.canonicalOverride,
  });
}

export default async function PrivacyPage() {
  const [legal, page] = await Promise.all([
    getPublishedLegalPage("privacy"),
    getPublishedPageByPath("/privacy"),
  ]);
  return (
    <LegalPageView
      emptyDescription="No provisional legal statement is substituted for reviewed policy. The public site collects no analytics; a published notice will describe exactly what runs."
      emptyTitle="The privacy notice has not been published yet."
      eyebrow="Privacy"
      fallbackSummary="Published by the RENZ owner from the Legal Center."
      fallbackTitle="Privacy notice"
      legal={legal}
      page={page}
    />
  );
}
