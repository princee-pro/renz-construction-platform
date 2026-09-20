import "server-only";

import { cache } from "react";

import {
  approvedRouteHref,
  approvedRouteLabels,
  approvedRoutes,
  navigationRouteLabel,
  publicConfigurationSchema,
  type PublicConfiguration,
} from "@/features/settings/settings-contract";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { AUTHORIZED_CONTACT } from "@/lib/site/contact-details";

/**
 * The single published site configuration read for the public site: one
 * compact anonymous RPC per request, memoized across every component of that
 * request (header, footer, metadata, contact). No persistent cache sits in
 * front of it, so an Admin publish is visible on the next request without a
 * deployment. Any failure yields the static authorized fallback so the public
 * site never crashes on a settings outage.
 */
const loadPublicConfiguration = cache(async (): Promise<PublicConfiguration> => {
  const client = createPublicSupabaseClient();
  if (!client) return {};
  const { data, error } = await client.rpc("public_site_configuration");
  if (error || data === null) return {};
  const parsed = publicConfigurationSchema.safeParse(data);
  return parsed.success ? parsed.data : {};
});

export type SiteIdentity = Readonly<{
  configured: boolean;
  displayName: string;
  shortName: string;
  tagline: string | null;
  description: string | null;
  email: string;
  whatsappDigits: string;
  whatsappUrl: string;
  /** Only when the owner explicitly enabled calling on a public number. */
  telHref: string | null;
  footerStatement: string | null;
  contactIntro: string | null;
  companySummary: string | null;
  /** Published owner-authored company narrative (C7 business profile); null until written. */
  mission: string | null;
  approach: string | null;
  credentialsText: string | null;
  serviceArea: string | null;
  announcement: string | null;
  location: PublicConfiguration["location"] | null;
  hours: NonNullable<PublicConfiguration["hours"]> | null;
  social: NonNullable<PublicConfiguration["social"]>;
  navigation: readonly Readonly<{ href: string; label: string }>[];
  cta: Readonly<{ label: string; href: string }>;
  secondaryCta: Readonly<{ label: string; href: string }> | null;
  siteMode: "preview" | "live";
  canonicalBaseUrl: string | null;
  seo: Readonly<{
    siteName: string;
    titleTemplate: string;
    metaDescription: string | null;
    organizationName: string;
    organizationUrl: string | null;
  }>;
  brand: Readonly<Record<string, boolean>>;
  legal: PublicConfiguration["legal"];
  /** C8 public intake flags (typed intake_settings, published with the projection). */
  intake: Readonly<{
    enabled: boolean;
    uploadPolicy: "disabled" | "images_only" | "images_and_pdf";
  }>;
  /** C9 website analytics mode (published values only; provider secrets never travel). */
  analytics: Readonly<{
    firstParty: boolean;
    provider: "plausible" | "umami" | "ga4" | "other" | null;
    siteId: string | null;
    consentRequired: boolean;
  }>;
  publishedAt: string | null;
}>;

export { whatsappLink } from "@/lib/site/whatsapp";

function analyticsMode(config: PublicConfiguration): SiteIdentity["analytics"] {
  const website = config.website ?? {};
  const provider = website.analytics_provider;
  const known =
    provider === "plausible" || provider === "umami" || provider === "ga4" || provider === "other"
      ? provider
      : null;
  const thirdParty = website.analytics_enabled === true && known !== null;
  return {
    firstParty: website.first_party_analytics_enabled === true,
    provider: thirdParty ? known : null,
    siteId: thirdParty ? (website.analytics_site_id ?? null) : null,
    consentRequired: thirdParty && website.consent_required === true,
  };
}

function intakeFlags(config: PublicConfiguration): SiteIdentity["intake"] {
  return {
    enabled: config.intake?.enabled !== false,
    uploadPolicy: config.intake?.upload_policy ?? "images_only",
  };
}

/** Normalizes the published projection (or the fallback) into what components render. */
export function siteIdentityFrom(config: PublicConfiguration): SiteIdentity {
  const business = config.business;
  const contact = config.contact;
  const website = config.website ?? {};
  const seo = config.seo ?? {};
  const email = contact?.primary_email ?? business?.primary_email ?? AUTHORIZED_CONTACT.email;
  const whatsappDigits = contact?.whatsapp_digits ?? AUTHORIZED_CONTACT.whatsappDigits;
  const tel =
    contact?.channels?.find(
      (channel) => channel.calling_enabled && channel.href?.startsWith("tel:"),
    )?.href ?? null;
  const navigation = (config.navigation ?? [])
    .filter((item) => item.visible)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      href: approvedRouteHref(item.route_key),
      label: item.label ?? navigationRouteLabel(item.route_key),
    }));
  const ctaRoute = website.homepage_cta_route ?? "start-a-project";
  const secondaryRoute = website.secondary_cta_route;
  const displayName = business?.display_name ?? "RENZ Construction Services Ltd";
  return {
    configured: Boolean(business),
    displayName,
    shortName: business?.short_name ?? "RENZ",
    tagline: business?.tagline ?? null,
    description: business?.description ?? null,
    email,
    whatsappDigits,
    whatsappUrl: `https://wa.me/${whatsappDigits}`,
    telHref: tel,
    footerStatement: website.footer_statement ?? null,
    contactIntro: website.contact_intro ?? null,
    companySummary: website.company_summary ?? null,
    mission: business?.mission ?? null,
    approach: business?.approach ?? null,
    credentialsText: business?.credentials ?? null,
    serviceArea: website.service_area_wording ?? business?.service_area ?? null,
    announcement: website.announcement ?? null,
    location: config.location ?? null,
    hours: config.hours ?? null,
    social: config.social ?? [],
    navigation:
      navigation.length > 0
        ? navigation
        : approvedRoutes.map((route) => ({
            href: approvedRouteHref(route),
            label: approvedRouteLabels[route],
          })),
    cta: {
      label: website.homepage_cta_label ?? "Start a Project",
      href: approvedRouteHref(ctaRoute),
    },
    secondaryCta:
      secondaryRoute && website.secondary_cta_label
        ? { label: website.secondary_cta_label, href: approvedRouteHref(secondaryRoute) }
        : null,
    siteMode: config.site_mode ?? "preview",
    canonicalBaseUrl: website.canonical_base_url ?? null,
    seo: {
      siteName: seo.site_name ?? "RENZ",
      titleTemplate: seo.title_template ?? "%s | RENZ",
      metaDescription: seo.meta_description ?? null,
      organizationName: seo.organization_name ?? displayName,
      organizationUrl: seo.organization_url ?? website.canonical_base_url ?? null,
    },
    brand: config.brand ?? {},
    legal: config.legal,
    intake: intakeFlags(config),
    analytics: analyticsMode(config),
    publishedAt: config.published_at ?? null,
  };
}

export async function getSiteIdentity(): Promise<SiteIdentity> {
  try {
    return siteIdentityFrom(await loadPublicConfiguration());
  } catch {
    return siteIdentityFrom({});
  }
}
