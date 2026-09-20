import type { Metadata } from "next";

import { LegalPageView } from "@/components/site/legal-page";
import { getPublishedPageByPath } from "@/features/public-content/data";
import { createPublicMetadata } from "@/lib/seo/public-metadata";
import { getPublishedLegalPage } from "@/lib/site/legal-pages";
import { getSiteIdentity } from "@/lib/site/public-configuration";
import { AnalyticsPreferenceControl } from "@/features/website-analytics/components/analytics-consent";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [legal, page] = await Promise.all([
    getPublishedLegalPage("cookies"),
    getPublishedPageByPath("/cookies"),
  ]);
  return createPublicMetadata({
    title: legal?.title ?? page?.seoTitle ?? "Cookies",
    description: page?.seoDescription ?? "Cookie and analytics notice for this website.",
    canonical: page?.canonicalOverride,
  });
}

export default async function CookiesPage() {
  const [legal, page, identity] = await Promise.all([
    getPublishedLegalPage("cookies"),
    getPublishedPageByPath("/cookies"),
    getSiteIdentity(),
  ]);
  const analytics =
    identity.analytics.provider && identity.analytics.siteId
      ? {
          provider: identity.analytics.provider,
          siteId: identity.analytics.siteId,
          consentRequired: identity.analytics.consentRequired,
        }
      : null;
  return (
    <>
      <LegalPageView
        emptyDescription="The public website sets no analytics cookies today. A published notice will appear here before any analytics run."
        emptyTitle="The cookie notice has not been published yet."
        eyebrow="Cookies"
        fallbackSummary="Published by the RENZ owner from the Legal Center."
        fallbackTitle="Cookie notice"
        legal={legal}
        page={page}
      />
      <section className="public-section public-section-white" aria-label="Analytics preference">
        <div className="public-container public-article-layout">
          <AnalyticsPreferenceControl analytics={analytics} />
        </div>
      </section>
    </>
  );
}
