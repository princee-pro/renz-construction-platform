/**
 * Authorized RENZ public contact details.
 *
 * These values were supplied and explicitly authorized by the client (see
 * docs/CLIENT_PRODUCT_EXPANSION_2026-09-05.md). They act as a static
 * fallback wherever `published_site_settings` has not yet been seeded with
 * the equivalent `contact.public` rows, so the values render now without
 * bypassing the settings-driven architecture Admin will eventually own —
 * once seeded, DB values take precedence over this fallback.
 *
 * IMPORTANT (client correction, C3.5): the WhatsApp number is WhatsApp
 * texting only. It must never be presented as a phone/call channel — no
 * "Phone" label, no "Call" action, no `tel:` link anywhere on the site.
 */

const WHATSAPP_DIGITS = "447412853143";

export const AUTHORIZED_CONTACT = Object.freeze({
  email: "renzconstruuction@gmail.com",
  whatsappDigits: WHATSAPP_DIGITS,
  whatsappUrl: `https://wa.me/${WHATSAPP_DIGITS}`,
});

export function mailtoHref(email: string = AUTHORIZED_CONTACT.email): string {
  return `mailto:${email}`;
}

export function whatsappHref(message: string, digits: string = WHATSAPP_DIGITS): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
