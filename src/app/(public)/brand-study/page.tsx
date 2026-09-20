import { notFound } from "next/navigation";

import { Landing } from "@/components/site/landing/landing";
import { ProvisionalBrandStudy } from "@/components/site/provisional-brand-study";
import { isClientPreviewEnabled } from "@/lib/env/client-preview";
import { createPublicMetadata } from "@/lib/seo/public-metadata";

export const metadata = createPublicMetadata({
  title: "Provisional Brand Study",
  description: "A local noindex QA matrix for the provisional RENZ web derivative.",
});
export const dynamic = "force-dynamic";

export default function BrandStudyPage() {
  if (!isClientPreviewEnabled()) notFound();

  return (
    <main id="main-content" className="public-main">
      <Landing
        concept="calm"
        eyebrow="Provisional brand study"
        field="plan"
        summary="A review surface for small-size, lockup, reversed, and single-color behavior. Every form remains provisional."
        title="A mark measured before approval."
      />
      <div className="public-container">
        <ProvisionalBrandStudy />
      </div>
    </main>
  );
}
