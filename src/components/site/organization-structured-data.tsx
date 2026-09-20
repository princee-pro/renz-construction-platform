import type { SiteIdentity } from "@/lib/site/public-configuration";

/**
 * Organization schema generated ONLY from published, visible public facts:
 * name, URL, email, WhatsApp contact point, published location and social
 * profiles. No founding year, employee count, awards, registration numbers,
 * ratings or reviews are ever emitted. Admin never supplies raw JSON-LD.
 */
export function OrganizationStructuredData({ identity }: Readonly<{ identity: SiteIdentity }>) {
  if (!identity.configured) return null;
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: identity.seo.organizationName,
    email: identity.email,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: identity.email,
        url: identity.whatsappUrl,
        availableLanguage: ["en"],
      },
    ],
  };
  if (identity.seo.organizationUrl) schema["url"] = identity.seo.organizationUrl;
  if (identity.brand["primary_logo"] && identity.canonicalBaseUrl) {
    schema["logo"] = `${identity.canonicalBaseUrl}/api/media/brand/primary_logo`;
  }
  if (identity.social.length > 0) schema["sameAs"] = identity.social.map((link) => link.url);
  if (identity.location) {
    const address: Record<string, string> = { "@type": "PostalAddress" };
    if (identity.location.street) address["streetAddress"] = identity.location.street;
    if (identity.location.city) address["addressLocality"] = identity.location.city;
    if (identity.location.region) address["addressRegion"] = identity.location.region;
    if (identity.location.postal_code) address["postalCode"] = identity.location.postal_code;
    if (identity.location.country) address["addressCountry"] = identity.location.country;
    schema["address"] = address;
  }
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</gu, "\u003c") }}
      type="application/ld+json"
    />
  );
}
