import type { FieldVariant } from "@/components/site/fields";

/** One route in the owner-managed primary navigation (C7 navigation settings + custom pages). */
export type NavLink = Readonly<{ href: string; label: string }>;

/** A published service as the navigation needs it: index, wording, field and one related study. */
export type NavService = Readonly<{
  slug: string;
  index: string;
  name: string;
  positioning: string;
  subServices: readonly string[];
  receive: string | null;
  field: FieldVariant;
  related: Readonly<{
    title: string;
    href: string;
    src: string | null;
    alt: string;
    provenance: string | null;
  }> | null;
}>;

export type NavContact = Readonly<{
  email: string;
  whatsappUrl: string;
  shortName: string;
}>;

export type NavCopy = Readonly<{
  whatsappLabel: string;
  menuTagline: string;
  /** Owner wording for the mega panel's "all services" cue. */
  allServicesLabel: string;
}>;

export function isCurrentPath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
