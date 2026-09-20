import Link from "next/link";

import { MeasuredTrackNav } from "@/components/site/nav/measured-track";
import type { NavService } from "@/components/site/nav/nav-types";
import { PreviewRenzIdentity } from "@/components/site/preview-renz-identity";
import { serviceField } from "@/components/site/service-fields";
import type { ServiceCategory } from "@/features/services/content";
import type { ProjectCardData } from "@/features/public-content/data";
import type { PublicProjectServiceLink } from "@/features/public-content/contracts";
import type { SiteIdentity } from "@/lib/site/public-configuration";
import { whatsappLink } from "@/lib/site/whatsapp";

type PublicHeaderProps = Readonly<{
  services: readonly ServiceCategory[];
  projects: readonly ProjectCardData[];
  projectServiceLinks: readonly PublicProjectServiceLink[];
  identity: SiteIdentity;
  copy: Readonly<{
    whatsappLabel: string;
    menuTagline: string;
    whatsappMessage: string;
    allServicesLabel: string;
    staffLoginLabel: string;
  }>;
}>;

function provenanceLabel(value: string | null): string | null {
  if (!value || value === "production" || value === "client_original") return null;
  return "Concept visual";
}

/** The navigation's view of the published services: index, wording, field, one related study. */
export function navServices(
  services: readonly ServiceCategory[],
  projects: readonly ProjectCardData[],
  links: readonly PublicProjectServiceLink[],
): readonly NavService[] {
  return services.map((service, index) => {
    const related = links
      .filter((link) => link.serviceId === service.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) => projects.find((project) => project.id === link.projectId))
      .find((project): project is ProjectCardData => Boolean(project?.media));
    const fallback = related ?? projects.find((project) => project.media) ?? null;
    return {
      slug: service.slug,
      index: service.index,
      name: service.name,
      positioning: service.positioning,
      subServices: service.subServices,
      receive: service.deliverables
        ? service.deliverables.split(/\r?\n/u)[0]?.trim() || null
        : null,
      field: serviceField(service.slug, index),
      related: fallback?.media
        ? {
            title: fallback.title,
            href: `/projects/${fallback.slug}`,
            src: `/api/media/project/${fallback.media.projectMediaId}`,
            alt: fallback.media.alt,
            provenance: provenanceLabel(fallback.media.provenanceClass),
          }
        : null,
    };
  });
}

/**
 * Public header (D1.6): the RENZ Measured Track. The server prepares the
 * owner-managed navigation, the published services and one related study
 * per service; the client component owns the scrolled state, the moving
 * plate, the mega panel and the mobile navigator.
 */
export function PublicHeader({
  services,
  projects,
  projectServiceLinks,
  identity,
  copy,
}: PublicHeaderProps) {
  const brand = (
    <Link aria-label={`${identity.shortName} home`} className="public-wordmark" href="/">
      <PreviewRenzIdentity decorative size={40} tone="dark" wordmark />
    </Link>
  );
  // Inside the navigator the mark is decorative: "Home" is the first route.
  const menuBrand = <PreviewRenzIdentity decorative size={40} tone="dark" wordmark />;
  return (
    <MeasuredTrackNav
      brand={brand}
      menuBrand={menuBrand}
      contact={{
        email: identity.email,
        whatsappUrl: whatsappLink(identity.whatsappDigits, copy.whatsappMessage),
        shortName: identity.shortName,
      }}
      copy={{
        whatsappLabel: copy.whatsappLabel,
        menuTagline: copy.menuTagline,
        allServicesLabel: copy.allServicesLabel,
        staffLoginLabel: copy.staffLoginLabel,
      }}
      cta={identity.cta}
      navigation={identity.navigation}
      previewLabel={identity.siteMode === "preview"}
      services={navServices(services, projects, projectServiceLinks)}
    />
  );
}
