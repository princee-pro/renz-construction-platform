import type { Metadata } from "next";

import { LegalPageView } from "@/components/site/legal-page";
import { getPublishedPageByPath } from "@/features/public-content/data";
import { createPublicMetadata } from "@/lib/seo/public-metadata";
import { getPublishedLegalPage } from "@/lib/site/legal-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [legal, page] = await Promise.all([
    getPublishedLegalPage("terms"),
    getPublishedPageByPath("/terms"),
  ]);
  return createPublicMetadata({
    title: legal?.title ?? page?.seoTitle ?? "Terms",
    description: page?.seoDescription ?? "Terms of use for this website.",
    canonical: page?.canonicalOverride,
  });
}

export default async function TermsPage() {
  const [legal, page] = await Promise.all([
    getPublishedLegalPage("terms"),
    getPublishedPageByPath("/terms"),
  ]);
  return (
    <LegalPageView
      emptyDescription="Reviewed terms will replace this explicit empty state before any release or indexing decision."
      emptyTitle="The terms of use have not been published yet."
      eyebrow="Terms"
      fallbackSummary="Published by the RENZ owner from the Legal Center."
      fallbackTitle="Terms of use"
      legal={legal}
      page={page}
    />
  );
}
