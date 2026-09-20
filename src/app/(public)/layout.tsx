import type { ReactNode } from "react";

import { GridOverlay } from "@/components/site/grid-overlay";
import { MotionPreference } from "@/components/site/motion-preference";
import { BrandOpener } from "@/components/site/brand-opener";
import { FloatingWhatsApp } from "@/components/site/floating-whatsapp";
import { PublicFooter } from "@/components/site/public-footer";
import { PublicHeader } from "@/components/site/public-header";
import { getPublicServiceCategories } from "@/features/services/service-source";
import { OrganizationStructuredData } from "@/components/site/organization-structured-data";
import { AnalyticsConsent } from "@/features/website-analytics/components/analytics-consent";
import { WebsiteAnalytics } from "@/features/website-analytics/components/website-analytics";
import { getWebsiteGlobals } from "@/features/website/data";
import { buildPublicPageContext } from "@/features/website/public-context";
import { interpolate } from "@/features/website/tokens";
import { isClientPreviewEnabled } from "@/lib/env/client-preview";
import { getSiteIdentity } from "@/lib/site/public-configuration";

export const dynamic = "force-dynamic";

type PublicLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function PublicLayout({ children }: PublicLayoutProps) {
  const previewEnabled = isClientPreviewEnabled();
  const [services, identity, globals, context] = await Promise.all([
    getPublicServiceCategories(),
    getSiteIdentity(),
    getWebsiteGlobals(),
    buildPublicPageContext(),
  ]);
  const whatsappMessage = interpolate(globals.copy.whatsapp_message, context.tokens);

  return (
    <div className="public-site" data-preview={previewEnabled ? "true" : undefined} id="site-top">
      <MotionPreference />
      <GridOverlay />
      {previewEnabled ? <BrandOpener /> : null}
      <OrganizationStructuredData identity={identity} />
      {identity.announcement ? (
        <p className="public-announcement" role="status">
          {identity.announcement}
        </p>
      ) : null}
      <PublicHeader
        copy={{
          whatsappLabel: globals.copy.whatsapp_cta_label,
          menuTagline: globals.copy.menu_tagline,
          allServicesLabel: globals.copy.all_services_label,
          staffLoginLabel: globals.copy.staff_signin_label,
          whatsappMessage,
        }}
        identity={identity}
        projectServiceLinks={context.projectServiceLinks}
        projects={context.projects}
        services={services}
      />
      {children}
      <PublicFooter
        copy={{
          whatsappMessage,
          kicker: globals.footer.kicker ? interpolate(globals.footer.kicker, context.tokens) : null,
        }}
        globals={globals}
        identity={identity}
        previewEnabled={previewEnabled}
        services={services}
      />
      <FloatingWhatsApp
        digits={identity.whatsappDigits}
        label={globals.copy.floating_whatsapp_label}
        message={whatsappMessage}
        shortName={identity.shortName}
      />
      {/* C9: first-party aggregate beacon (cookieless) and, only when a
          third-party provider is published, the consent layer + adapter. */}
      <WebsiteAnalytics enabled={identity.analytics.firstParty} />
      {identity.analytics.provider && identity.analytics.siteId ? (
        <AnalyticsConsent
          analytics={{
            provider: identity.analytics.provider,
            siteId: identity.analytics.siteId,
            consentRequired: identity.analytics.consentRequired,
          }}
        />
      ) : null}
    </div>
  );
}
