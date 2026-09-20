import type { ComponentType } from "react";

import {
  ContactStripSection,
  CtaSection,
  DividerSection,
  EditorialIntroSection,
  FaqSection,
  FeatureGridSection,
  FullMediaSection,
  GallerySection,
  HeroSection,
  MarqueeSection,
  MastheadSection,
  MaterialDetailSection,
  QuoteSection,
  RichTextSection,
  TestimonialSection,
  TextMediaSection,
  WhatsAppCtaSection,
} from "@/components/site/sections/content-sections";
import {
  InsightFeedSection,
  InsightsIndexSection,
  ProcessSection,
  ProjectShowcaseSection,
  ProjectsIndexSection,
  ServiceShowcaseSection,
  ServicesNavigatorSection,
  TeamCredentialsSection,
} from "@/components/site/sections/domain-sections";
import {
  ContactChannelsSection,
  ContactFormSection,
  IntakeSuccessSection,
  MaterialEnquiryFormSection,
  ServiceEnquiryFormSection,
  StartProjectWizardSection,
} from "@/components/site/sections/intake-sections";
import type { RenderContext, SectionRenderProps } from "@/components/site/sections/types";
import type { PageSnapshot, SnapshotSection } from "@/features/website/contracts";
import { interpolateConfig } from "@/features/website/tokens";

/**
 * STATIC renderer map (CR1 §22). A section type in the snapshot selects a
 * component from this table; the database never names a component, and an
 * unknown type renders nothing.
 */
const renderers: Readonly<Record<string, ComponentType<SectionRenderProps>>> = {
  hero: HeroSection,
  masthead: MastheadSection,
  editorial_intro: EditorialIntroSection,
  rich_text: RichTextSection,
  text_media: TextMediaSection,
  full_media: FullMediaSection,
  material_detail: MaterialDetailSection,
  feature_grid: FeatureGridSection,
  marquee: MarqueeSection,
  gallery: GallerySection,
  faq: FaqSection,
  cta: CtaSection,
  contact_strip: ContactStripSection,
  whatsapp_cta: WhatsAppCtaSection,
  quote: QuoteSection,
  testimonial: TestimonialSection,
  divider: DividerSection,
  service_showcase: ServiceShowcaseSection,
  project_showcase: ProjectShowcaseSection,
  process: ProcessSection,
  insight_feed: InsightFeedSection,
  services_navigator: ServicesNavigatorSection,
  projects_index: ProjectsIndexSection,
  insights_index: InsightsIndexSection,
  team_credentials: TeamCredentialsSection,
  contact_channels: ContactChannelsSection,
  contact_form: ContactFormSection,
  start_project_wizard: StartProjectWizardSection,
  service_enquiry_form: ServiceEnquiryFormSection,
  material_enquiry_form: MaterialEnquiryFormSection,
  intake_success: IntakeSuccessSection,
};

export function pageClassName(snapshot: PageSnapshot): string {
  const key = snapshot.page.page_key.replace(/[^a-z0-9-]/gu, "");
  return `public-main ${key}-page website-page`;
}

/** Renders a published (or previewed) snapshot with the real public component system. */
export function WebsitePage({
  snapshot,
  context,
}: Readonly<{ snapshot: PageSnapshot; context: RenderContext }>) {
  return (
    <main className={pageClassName(snapshot)} data-page={snapshot.page.page_key} id="main-content">
      {snapshot.sections.map((section) => (
        <WebsiteSection context={context} key={section.id} section={section} />
      ))}
    </main>
  );
}

export function WebsiteSection({
  section,
  context,
}: Readonly<{ section: SnapshotSection; context: RenderContext }>) {
  if (section.hidden) return null;
  const Renderer = renderers[section.type];
  if (!Renderer) return null;
  const interpolated: SnapshotSection = {
    ...section,
    config: interpolateConfig(section.config, context.tokens),
  };
  return <Renderer context={context} section={interpolated} />;
}
