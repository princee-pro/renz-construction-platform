import Link from "next/link";

import { ArrowMark } from "@/components/site/arrow-mark";
import { PreviewRenzIdentity } from "@/components/site/preview-renz-identity";
import { WhatsAppGlyph } from "@/components/site/whatsapp-glyph";
import type { ServiceCategory } from "@/features/services/content";
import type { WebsiteGlobals } from "@/features/website/contracts";
import { isRenderableHref } from "@/lib/content/rich-text";
import { mailtoHref } from "@/lib/site/contact-details";
import { whatsappLink, type SiteIdentity } from "@/lib/site/public-configuration";

type PublicFooterProps = Readonly<{
  previewEnabled: boolean;
  services: readonly ServiceCategory[];
  identity: SiteIdentity;
  globals: WebsiteGlobals;
  /** Interpolated WhatsApp message and kicker. */
  copy: Readonly<{ whatsappMessage: string; kicker: string | null }>;
}>;

function footerCtaHref(
  globals: WebsiteGlobals,
  identity: SiteIdentity,
): Readonly<{ href: string; label: string }> {
  const cta = globals.footer.cta;
  if (!cta) return identity.cta;
  switch (cta.destination_type) {
    case "contact":
      return { href: "/contact", label: cta.label };
    case "service_enquiry":
      return { href: "/enquire/service", label: cta.label };
    case "internal":
      return cta.destination && isRenderableHref(cta.destination)
        ? { href: cta.destination, label: cta.label }
        : identity.cta;
    default:
      return { href: identity.cta.href, label: cta.label };
  }
}

/**
 * Classic RENZ footer (D1.7 §53–60): four columns — brand statement and the
 * Start-a-Project action, the published services, the company routes, the
 * contact channels — then one utility row with the legal links, Staff Login
 * and back to top. Everything visible is owner-managed (Website → Footer /
 * Globals); the renderer keeps the design. No fabricated content, no
 * telephone action for the messaging-only WhatsApp number.
 */
export function PublicFooter({ services, identity, globals, copy }: PublicFooterProps) {
  const year = new Date().getFullYear();
  const options = globals.footer;
  const companyLinks = identity.navigation.filter(
    (link) => link.href !== "/services" && link.href !== "/start-a-project",
  );
  const legalLinks = options.show_legal
    ? [
        ...(identity.legal?.["privacy"]?.published ? [["Privacy", "/privacy"] as const] : []),
        ...(identity.legal?.["terms"]?.published ? [["Terms", "/terms"] as const] : []),
        ...(identity.legal?.["cookies"]?.published ? [["Cookies", "/cookies"] as const] : []),
      ]
    : [];
  const locationLine =
    options.show_location && identity.location
      ? [identity.location.street, identity.location.city, identity.location.country]
          .filter(Boolean)
          .join(", ")
      : null;
  const openDays = options.show_hours ? (identity.hours ?? []).filter((day) => day.is_open) : [];
  const cta = footerCtaHref(globals, identity);
  // The owner's Footer options are the source; the C7 website setting is a legacy fallback.
  const statement = options.statement || identity.footerStatement || null;

  return (
    <footer className="site-footer tone-ink" aria-labelledby="site-footer-heading">
      <div className="container site-footer-inner">
        <div className="site-footer-brand">
          <PreviewRenzIdentity decorative size={40} tone="dark" wordmark />
          <h2 className="site-footer-headline" id="site-footer-heading">
            {options.headline}
          </h2>
          {statement ? <p className="site-footer-lede">{statement}</p> : null}
          <Link
            className="btn btn-primary btn-compact"
            data-analytics-cta="start_project"
            href={cta.href}
          >
            <span>{cta.label}</span>
            <ArrowMark />
          </Link>
        </div>

        {options.show_services && services.length > 0 ? (
          <nav aria-label="Services index" className="site-footer-column">
            <p className="datum-label">{options.services_label}</p>
            <ul>
              {services.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`}>{service.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {options.show_company ? (
          <nav aria-label="Company index" className="site-footer-column">
            <p className="datum-label">{options.company_label}</p>
            <ul>
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
              <li>
                <Link href={identity.cta.href}>{identity.cta.label}</Link>
              </li>
            </ul>
          </nav>
        ) : null}

        {globals.footerGroups.map((group) => {
          const links = group.links.filter((link) => isRenderableHref(link.href));
          if (links.length === 0) return null;
          return (
            <nav
              aria-label={`${group.title} index`}
              className="site-footer-column"
              key={group.title}
            >
              <p className="datum-label">{group.title}</p>
              <ul>
                {links.map((link) => (
                  <li key={`${group.title}-${link.href}`}>
                    {link.href.startsWith("/") ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href={link.href} rel="noreferrer" target="_blank">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          );
        })}

        {options.show_contact ? (
          <div className="site-footer-column site-footer-contact">
            <p className="datum-label">{options.contact_label}</p>
            <a
              className="site-footer-email"
              data-analytics-cta="email"
              href={mailtoHref(identity.email)}
            >
              {identity.email}
            </a>
            <a
              className="site-footer-whatsapp"
              data-analytics-cta="whatsapp"
              href={whatsappLink(identity.whatsappDigits, copy.whatsappMessage)}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppGlyph />
              <span>{globals.copy.whatsapp_cta_label}</span>
            </a>
            <p className="site-footer-note">{globals.copy.whatsapp_note}</p>
            {locationLine ? <p>{locationLine}</p> : null}
            {openDays.length > 0 ? (
              <p className="site-footer-hours">
                Open {openDays.length} days a week · {openDays[0]?.opens_at}–
                {openDays[0]?.closes_at}
              </p>
            ) : null}
            {options.show_social && identity.social.length > 0 ? (
              <ul className="site-footer-social" aria-label="Social profiles">
                {identity.social.map((profile) => (
                  <li key={profile.url}>
                    <a href={profile.url} rel="noreferrer" target="_blank">
                      {profile.label ?? profile.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="container site-footer-legal">
        <p>
          © {year} {identity.displayName}
          {identity.siteMode === "preview" ? " · Preview" : ""}
        </p>
        <ul>
          {legalLinks.map(([label, href]) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
          {options.show_staff_signin ? (
            <li className="site-footer-staff">
              <Link href="/admin/sign-in">{globals.copy.staff_signin_label}</Link>
              <span aria-hidden="true">{globals.copy.staff_signin_note}</span>
            </li>
          ) : null}
          {options.show_back_to_top ? (
            <li>
              <a className="site-footer-top" href="#site-top">
                {globals.copy.back_to_top_label} <span aria-hidden="true">↑</span>
              </a>
            </li>
          ) : null}
        </ul>
      </div>
    </footer>
  );
}
