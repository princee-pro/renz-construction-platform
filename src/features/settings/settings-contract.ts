import { z } from "zod";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";

// ---------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------

export const channelTypes = [
  "email",
  "whatsapp",
  "phone",
  "address",
  "maps",
  "website",
  "social",
] as const;
export type ChannelType = (typeof channelTypes)[number];
export const channelTypeLabels: Readonly<Record<ChannelType, string>> = {
  email: "Email",
  whatsapp: "WhatsApp (texting)",
  phone: "Phone",
  address: "Address",
  maps: "Map link",
  website: "Website",
  social: "Social",
};

export const socialPlatforms = [
  "instagram",
  "linkedin",
  "facebook",
  "youtube",
  "tiktok",
  "x",
  "other",
] as const;
export type SocialPlatform = (typeof socialPlatforms)[number];
export const socialPlatformLabels: Readonly<Record<SocialPlatform, string>> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  other: "Other",
};

export const approvedRoutes = [
  "services",
  "projects",
  "about",
  "insights",
  "contact",
  "start-a-project",
] as const;
export type ApprovedRoute = (typeof approvedRoutes)[number];
export const approvedRouteLabels: Readonly<Record<ApprovedRoute, string>> = {
  services: "Services",
  projects: "Projects",
  about: "About",
  insights: "Insights",
  contact: "Contact",
  "start-a-project": "Start a Project",
};
/** Navigation keys: the approved routes plus owner-created custom pages as `page:<slug>`. */
export const navigationRouteKey = z
  .string()
  .regex(
    /^(?:services|projects|about|insights|contact|start-a-project|page:[a-z0-9]+(?:-[a-z0-9]+)*)$/u,
  );

export function approvedRouteHref(route: string): string {
  return route.startsWith("page:") ? `/${route.slice(5)}` : `/${route}`;
}

/** A readable default label for a navigation key (custom pages are titleised from their slug). */
export function navigationRouteLabel(route: string): string {
  if (route.startsWith("page:")) {
    return route
      .slice(5)
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return approvedRouteLabels[route as ApprovedRoute] ?? route;
}

export const legalSlugs = ["privacy", "terms", "cookies"] as const;
export type LegalSlug = (typeof legalSlugs)[number];
export const legalSlugLabels: Readonly<Record<LegalSlug, string>> = {
  privacy: "Privacy Notice",
  terms: "Terms of Use",
  cookies: "Cookie Notice",
};

export const brandSlots = [
  "primary_logo",
  "reversed_logo",
  "favicon",
  "default_og",
  "default_share",
  "default_hero",
  "document_logo",
] as const;
export type BrandSlot = (typeof brandSlots)[number];
export const brandSlotLabels: Readonly<Record<BrandSlot, string>> = {
  primary_logo: "Primary logo",
  reversed_logo: "Reversed logo (dark backgrounds)",
  favicon: "Favicon",
  default_og: "Default Open Graph image",
  default_share: "Default share image",
  default_hero: "Default hero fallback",
  document_logo: "Invoice / purchase order logo",
};

export const weekdayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const readinessStates = ["ready", "warning", "blocked"] as const;
export type ReadinessState = (typeof readinessStates)[number];

// ---------------------------------------------------------------------
// Form contracts
// ---------------------------------------------------------------------

const version = z.number().int().positive();
const httpsUrl = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^https:\/\/[^\s]+$/u, message)
        .nullable(),
    );
const httpUrl = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^https?:\/\/[^\s]+$/u, message)
        .nullable(),
    );

export const businessProfileSchema = z
  .object({
    expectedVersion: version,
    displayName: requiredText(1, 200),
    shortName: requiredText(1, 60),
    primaryEmail: z.string().trim().email("Enter a valid email address."),
    legalName: optionalText(200),
    publicDescription: optionalText(2000),
    tagline: optionalText(200),
    websiteUrl: httpUrl("Use an http(s) URL."),
    timezone: z
      .string()
      .trim()
      .regex(/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/u, "Use an IANA timezone such as Africa/Kigali."),
    defaultLocale: z
      .string()
      .trim()
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/u, "Use a locale such as en or en-GB."),
    country: optionalText(80),
    region: optionalText(120),
    mission: optionalText(2000),
    approach: optionalText(2000),
    serviceArea: optionalText(400),
    credentials: optionalText(2000),
  })
  .strict();

export function businessProfileInput(formData: FormData) {
  return businessProfileSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    displayName: formText(formData, "displayName"),
    shortName: formText(formData, "shortName") || "RENZ",
    primaryEmail: formText(formData, "primaryEmail"),
    legalName: formText(formData, "legalName"),
    publicDescription: formText(formData, "publicDescription"),
    tagline: formText(formData, "tagline"),
    websiteUrl: formText(formData, "websiteUrl"),
    timezone: formText(formData, "timezone") || "Africa/Kigali",
    defaultLocale: formText(formData, "defaultLocale") || "en",
    country: formText(formData, "country"),
    region: formText(formData, "region"),
    mission: formText(formData, "mission"),
    approach: formText(formData, "approach"),
    serviceArea: formText(formData, "serviceArea"),
    credentials: formText(formData, "credentials"),
  });
}

export const contactChannelSchema = z
  .object({
    expectedVersion: version,
    channelId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().uuid().nullable()),
    channelType: z.enum(channelTypes),
    label: requiredText(1, 80),
    value: requiredText(1, 400),
    purpose: optionalText(200),
    isPublic: z.boolean(),
    callingEnabled: z.boolean(),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .strict()
  .refine((v) => !/^\s*javascript:/iu.test(v.value), {
    message: "Script URLs are not allowed.",
    path: ["value"],
  });

export function contactChannelInput(formData: FormData) {
  return contactChannelSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    channelId: formText(formData, "channelId"),
    channelType: formText(formData, "channelType"),
    label: formText(formData, "label"),
    value: formText(formData, "value"),
    purpose: formText(formData, "purpose"),
    isPublic: formText(formData, "isPublic") === "on",
    callingEnabled: formText(formData, "callingEnabled") === "on",
    active: formText(formData, "active") !== "off",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
}

const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().min(min).max(max).nullable());

export const businessLocationSchema = z
  .object({
    expectedVersion: version,
    publish: z.boolean(),
    publicName: optionalText(120),
    street: optionalText(200),
    city: optionalText(120),
    region: optionalText(120),
    country: optionalText(80),
    postalCode: optionalText(20),
    latitude: coordinate(-90, 90),
    longitude: coordinate(-180, 180),
    mapsUrl: httpsUrl("Map links must be https:// URLs."),
    directionsUrl: httpsUrl("Directions links must be https:// URLs."),
    serviceArea: optionalText(400),
  })
  .strict()
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    message: "Provide both latitude and longitude, or neither.",
    path: ["longitude"],
  });

export function businessLocationInput(formData: FormData) {
  return businessLocationSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    publish: formText(formData, "publish") === "on",
    publicName: formText(formData, "publicName"),
    street: formText(formData, "street"),
    city: formText(formData, "city"),
    region: formText(formData, "region"),
    country: formText(formData, "country"),
    postalCode: formText(formData, "postalCode"),
    latitude: formText(formData, "latitude"),
    longitude: formText(formData, "longitude"),
    mapsUrl: formText(formData, "mapsUrl"),
    directionsUrl: formText(formData, "directionsUrl"),
    serviceArea: formText(formData, "serviceArea"),
  });
}

const timeText = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/u, "Use HH:MM.");
export const businessHoursSchema = z
  .object({
    expectedVersion: version,
    hours: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            is_open: z.boolean(),
            opens_at: timeText.nullable(),
            closes_at: timeText.nullable(),
          })
          .refine((d) => !d.is_open || (d.opens_at !== null && d.closes_at !== null), {
            message: "Open days need opening and closing times.",
          })
          .refine((d) => !d.is_open || (d.opens_at ?? "") < (d.closes_at ?? ""), {
            message: "Closing time must be after opening time.",
          }),
      )
      .length(7),
  })
  .strict();

export function businessHoursInput(formData: FormData) {
  const hours = weekdayLabels.map((_, weekday) => {
    const isOpen = formText(formData, `open_${weekday}`) === "on";
    const opens = formText(formData, `opens_${weekday}`);
    const closes = formText(formData, `closes_${weekday}`);
    return {
      weekday,
      is_open: isOpen,
      opens_at: isOpen ? opens || null : null,
      closes_at: isOpen ? closes || null : null,
    };
  });
  return businessHoursSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    hours,
  });
}

export const socialLinkSchema = z
  .object({
    expectedVersion: version,
    linkId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().uuid().nullable()),
    platform: z.enum(socialPlatforms),
    url: z
      .string()
      .trim()
      .regex(/^https:\/\/[^\s]+$/u, "Use an https:// profile URL."),
    label: optionalText(60),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .strict();

export function socialLinkInput(formData: FormData) {
  return socialLinkSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    linkId: formText(formData, "linkId"),
    platform: formText(formData, "platform"),
    url: formText(formData, "url"),
    label: formText(formData, "label"),
    active: formText(formData, "active") !== "off",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
}

export const websiteSettingsSchema = z
  .object({
    expectedVersion: version,
    homepageCtaLabel: requiredText(1, 60),
    homepageCtaRoute: z.enum(approvedRoutes),
    secondaryCtaLabel: optionalText(60),
    secondaryCtaRoute: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.enum(approvedRoutes).nullable()),
    canonicalBaseUrl: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v.replace(/\/+$/u, "")))
      .pipe(
        z
          .string()
          .regex(/^https?:\/\/[^/\s]+$/u, "Use an origin like https://www.example.com (no path).")
          .nullable(),
      ),
    footerStatement: optionalText(300),
    contactIntro: optionalText(1000),
    serviceAreaWording: optionalText(300),
    companySummary: optionalText(2000),
    announcementText: optionalText(300),
    announcementActive: z.boolean(),
    analyticsEnabled: z.boolean(),
    analyticsProvider: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.enum(["none", "plausible", "umami", "ga4", "other"]).nullable()),
    consentRequired: z.boolean(),
    firstPartyAnalyticsEnabled: z.boolean(),
    analyticsSiteId: z
      .string()
      .trim()
      .max(200, "Keep the site id to 200 characters or fewer.")
      .refine(
        (value) => value === "" || /^[A-Za-z0-9._:/-]+$/u.test(value),
        "Only letters, digits, dots, colons, slashes, underscores and hyphens.",
      )
      .transform((value) => (value === "" ? null : value)),
    analyticsRetentionDays: z
      .number()
      .int("Enter whole days.")
      .min(30, "Retention must be at least 30 days.")
      .max(1100, "Retention must be 1100 days or fewer."),
  })
  .strict();

export function websiteSettingsInput(formData: FormData) {
  return websiteSettingsSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    homepageCtaLabel: formText(formData, "homepageCtaLabel"),
    homepageCtaRoute: formText(formData, "homepageCtaRoute"),
    secondaryCtaLabel: formText(formData, "secondaryCtaLabel"),
    secondaryCtaRoute: formText(formData, "secondaryCtaRoute"),
    canonicalBaseUrl: formText(formData, "canonicalBaseUrl"),
    footerStatement: formText(formData, "footerStatement"),
    contactIntro: formText(formData, "contactIntro"),
    serviceAreaWording: formText(formData, "serviceAreaWording"),
    companySummary: formText(formData, "companySummary"),
    announcementText: formText(formData, "announcementText"),
    announcementActive: formText(formData, "announcementActive") === "on",
    analyticsEnabled: formText(formData, "analyticsEnabled") === "on",
    analyticsProvider: formText(formData, "analyticsProvider"),
    consentRequired: formText(formData, "consentRequired") === "on",
    firstPartyAnalyticsEnabled: formText(formData, "firstPartyAnalyticsEnabled") === "on",
    analyticsSiteId: formText(formData, "analyticsSiteId"),
    analyticsRetentionDays:
      formText(formData, "analyticsRetentionDays").trim() === ""
        ? 400
        : formNumber(formData, "analyticsRetentionDays"),
  });
}

export const navigationSettingsSchema = z
  .object({
    expectedVersion: version,
    items: z.array(
      z.object({
        route_key: navigationRouteKey,
        label: z.string().trim().max(40).nullable(),
        visible: z.boolean(),
        sort_order: z.number().int().min(0).max(999),
      }),
    ),
  })
  .strict();

export function navigationSettingsInput(formData: FormData) {
  // Custom pages arrive as `page:<slug>` keys listed in a hidden field; only
  // the ones the owner ticked "in navigation" are submitted.
  const customKeys = formText(formData, "custom_pages")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^page:[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value))
    .filter((key) => formText(formData, `include_${key}`) === "on");
  return navigationSettingsSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    items: [...approvedRoutes, ...customKeys].map((route) => ({
      route_key: route,
      label: formText(formData, `label_${route}`) || null,
      visible: formText(formData, `visible_${route}`) === "on",
      sort_order: formNumber(formData, `sort_${route}`) ?? 0,
    })),
  });
}

const uuidOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().uuid("Select a valid media asset.").nullable());

export const brandMediaSchema = z
  .object({
    expectedVersion: version,
    primary_logo: uuidOrNull,
    reversed_logo: uuidOrNull,
    favicon: uuidOrNull,
    default_og: uuidOrNull,
    default_share: uuidOrNull,
    default_hero: uuidOrNull,
    document_logo: uuidOrNull,
  })
  .strict();

export function brandMediaInput(formData: FormData) {
  return brandMediaSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    primary_logo: formText(formData, "primary_logo"),
    reversed_logo: formText(formData, "reversed_logo"),
    favicon: formText(formData, "favicon"),
    default_og: formText(formData, "default_og"),
    default_share: formText(formData, "default_share"),
    default_hero: formText(formData, "default_hero"),
    document_logo: formText(formData, "document_logo"),
  });
}

export const seoSettingsSchema = z
  .object({
    expectedVersion: version,
    siteName: requiredText(1, 80),
    titleTemplate: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .refine((v) => v.includes("%s"), "The title template must contain %s."),
    metaDescription: optionalText(320),
    organizationName: optionalText(200),
    organizationUrl: httpUrl("Use an http(s) URL."),
  })
  .strict();

export function seoSettingsInput(formData: FormData) {
  return seoSettingsSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    siteName: formText(formData, "siteName"),
    titleTemplate: formText(formData, "titleTemplate"),
    metaDescription: formText(formData, "metaDescription"),
    organizationName: formText(formData, "organizationName"),
    organizationUrl: formText(formData, "organizationUrl"),
  });
}

export const siteModeSchema = z
  .object({ expectedVersion: version, nextMode: z.enum(["preview", "live"]) })
  .strict();
export function siteModeInput(formData: FormData) {
  return siteModeSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    nextMode: formText(formData, "nextMode"),
  });
}

export const legalDraftSchema = z
  .object({
    slug: z.enum(legalSlugs),
    expectedVersion: version,
    title: requiredText(1, 200),
    body: z.string().max(60000),
  })
  .strict();
export function legalDraftInput(formData: FormData) {
  return legalDraftSchema.safeParse({
    slug: formText(formData, "slug"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    title: formText(formData, "title"),
    body: formText(formData, "body"),
  });
}
export const legalPublishSchema = z
  .object({ slug: z.enum(legalSlugs), expectedVersion: version })
  .strict();
export function legalPublishInput(formData: FormData) {
  return legalPublishSchema.safeParse({
    slug: formText(formData, "slug"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

const percent = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,2})?$/u, "Enter a percentage between 0 and 100.")
  .refine((v) => Number.parseFloat(v) <= 100, "Enter a percentage between 0 and 100.");
const days = (max: number) => z.number().int().min(0).max(max);

export const documentDefaultsSchema = z
  .object({
    expectedVersion: version,
    defaultCurrency: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code.")),
    allowedCurrencies: z
      .array(z.string().regex(/^[A-Z]{3}$/u))
      .min(1, "Allow at least one currency.")
      .max(12),
    invoiceTaxLabel: requiredText(1, 40),
    invoiceTaxRate: percent,
    invoicePaymentTerms: optionalText(4000),
    invoiceDueDays: days(365),
    poTaxLabel: requiredText(1, 40),
    poTaxRate: percent,
    poTerms: optionalText(4000),
    poExpectedDeliveryDays: days(365),
  })
  .strict()
  .refine((v) => v.allowedCurrencies.includes(v.defaultCurrency), {
    message: "The default currency must be one of the allowed currencies.",
    path: ["defaultCurrency"],
  });

export function documentDefaultsInput(formData: FormData) {
  const allowed = formText(formData, "allowedCurrencies")
    .split(/[,\s]+/u)
    .map((v) => v.trim().toUpperCase())
    .filter((v) => v !== "");
  return documentDefaultsSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    defaultCurrency: formText(formData, "defaultCurrency"),
    allowedCurrencies: [...new Set(allowed)],
    invoiceTaxLabel: formText(formData, "invoiceTaxLabel") || "Tax",
    invoiceTaxRate: formText(formData, "invoiceTaxRate") || "0",
    invoicePaymentTerms: formText(formData, "invoicePaymentTerms"),
    invoiceDueDays: formNumber(formData, "invoiceDueDays"),
    poTaxLabel: formText(formData, "poTaxLabel") || "Tax",
    poTaxRate: formText(formData, "poTaxRate") || "0",
    poTerms: formText(formData, "poTerms"),
    poExpectedDeliveryDays: formNumber(formData, "poExpectedDeliveryDays"),
  });
}

export const operationalSettingsSchema = z
  .object({
    expectedVersion: version,
    projectEndingSoonDays: z.number().int().min(1).max(120),
    invoiceDueSoonDays: z.number().int().min(1).max(120),
    staleDraftInvoiceDays: z.number().int().min(1).max(365),
    assignmentEndingSoonDays: z.number().int().min(1).max(120),
    materialRequiredSoonDays: z.number().int().min(1).max(120),
    poExpectedSoonDays: z.number().int().min(1).max(120),
  })
  .strict();

export function operationalSettingsInput(formData: FormData) {
  return operationalSettingsSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    projectEndingSoonDays: formNumber(formData, "projectEndingSoonDays"),
    invoiceDueSoonDays: formNumber(formData, "invoiceDueSoonDays"),
    staleDraftInvoiceDays: formNumber(formData, "staleDraftInvoiceDays"),
    assignmentEndingSoonDays: formNumber(formData, "assignmentEndingSoonDays"),
    materialRequiredSoonDays: formNumber(formData, "materialRequiredSoonDays"),
    poExpectedSoonDays: formNumber(formData, "poExpectedSoonDays"),
  });
}

export const staffRoleKeys = [
  "super_admin",
  "admin",
  "project_manager",
  "finance",
  "content_editor",
  "viewer",
] as const;

export const staffActionSchema = z
  .object({
    userId: z.string().uuid(),
    action: z.enum(["disable", "reactivate", "set_role", "rename", "reset_password"]),
    role: z.enum(staffRoleKeys).nullable(),
    displayName: z.string().trim().min(1).max(80).nullable(),
    /** Owner-typed temporary password (reset); empty → the server generates one. */
    temporaryPassword: z.string().nullable(),
  })
  .strict();

/** Temporary password policy (C10 §154): 12+ characters, letters and digits. */
export const temporaryPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/u, "Include a letter.")
  .regex(/\d/u, "Include a digit.");

export const createStaffSchema = z
  .object({
    displayName: z.string().trim().min(1, "Enter the staff member's name.").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
    role: z.enum(staffRoleKeys),
    temporaryPassword: z.union([temporaryPasswordSchema, z.literal("")]),
  })
  .strict();
export function createStaffInput(formData: FormData) {
  return createStaffSchema.safeParse({
    displayName: formText(formData, "displayName"),
    email: formText(formData, "email"),
    role: formText(formData, "role"),
    temporaryPassword: formText(formData, "temporaryPassword"),
  });
}
export function staffActionInput(formData: FormData) {
  return staffActionSchema.safeParse({
    userId: formText(formData, "userId"),
    action: formText(formData, "action"),
    role: formText(formData, "role") || null,
    displayName: formText(formData, "displayName") || null,
    temporaryPassword: formText(formData, "temporaryPassword") || null,
  });
}

// ---------------------------------------------------------------------
// Read projections
// ---------------------------------------------------------------------

const num = z.union([z.string(), z.number()]);

export const businessProfileReadSchema = z.object({
  display_name: z.string(),
  legal_name: z.string().nullable(),
  short_name: z.string(),
  public_description: z.string().nullable(),
  tagline: z.string().nullable(),
  primary_email: z.string(),
  website_url: z.string().nullable(),
  timezone: z.string(),
  default_locale: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  mission_text: z.string().nullable(),
  approach_text: z.string().nullable(),
  service_area_text: z.string().nullable(),
  public_credentials_text: z.string().nullable(),
  version: z.number().int(),
  updated_at: z.string(),
});

export const contactChannelReadSchema = z.object({
  id: z.string().uuid(),
  channel_type: z.enum(channelTypes),
  label: z.string(),
  value: z.string(),
  purpose: z.string().nullable(),
  is_public: z.boolean(),
  calling_enabled: z.boolean(),
  active: z.boolean(),
  sort_order: z.number().int(),
});
export type ContactChannel = z.infer<typeof contactChannelReadSchema>;

export const businessLocationReadSchema = z.object({
  public_name: z.string().nullable(),
  street_address: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  postal_code: z.string().nullable(),
  latitude: num.nullable(),
  longitude: num.nullable(),
  maps_url: z.string().nullable(),
  directions_url: z.string().nullable(),
  service_area_text: z.string().nullable(),
  publish_location: z.boolean(),
  version: z.number().int(),
});

export const businessHourSchema = z.object({
  weekday: z.number().int(),
  is_open: z.boolean(),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
});

export const socialLinkReadSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(socialPlatforms),
  label: z.string().nullable(),
  url: z.string(),
  active: z.boolean(),
  sort_order: z.number().int(),
});
export type SocialLink = z.infer<typeof socialLinkReadSchema>;

export const domainVersionsSchema = z.object({
  contact_channels: z.number().int(),
  business_hours: z.number().int(),
  social_links: z.number().int(),
  navigation: z.number().int(),
});

export const publicConfigurationSchema = z
  .object({
    business: z
      .object({
        display_name: z.string(),
        legal_name: z.string().optional(),
        short_name: z.string().optional(),
        description: z.string().optional(),
        tagline: z.string().optional(),
        primary_email: z.string().optional(),
        website_url: z.string().optional(),
        timezone: z.string().optional(),
        default_locale: z.string().optional(),
        country: z.string().optional(),
        region: z.string().optional(),
        mission: z.string().optional(),
        approach: z.string().optional(),
        service_area: z.string().optional(),
        credentials: z.string().optional(),
      })
      .optional(),
    contact: z
      .object({
        primary_email: z.string().optional(),
        whatsapp_digits: z.string().optional(),
        channels: z
          .array(
            z.object({
              id: z.string(),
              type: z.enum(channelTypes),
              label: z.string(),
              value: z.string(),
              href: z.string().optional(),
              calling_enabled: z.boolean().optional(),
              sort_order: z.number().int().optional(),
            }),
          )
          .optional(),
      })
      .optional(),
    location: z
      .object({
        name: z.string().optional(),
        street: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        postal_code: z.string().optional(),
        latitude: num.optional(),
        longitude: num.optional(),
        maps_url: z.string().optional(),
        directions_url: z.string().optional(),
        service_area: z.string().optional(),
      })
      .optional(),
    hours: z.array(businessHourSchema).optional(),
    social: z
      .array(
        z.object({
          platform: z.enum(socialPlatforms),
          label: z.string().optional(),
          url: z.string(),
          sort_order: z.number().int().optional(),
        }),
      )
      .optional(),
    website: z
      .object({
        canonical_base_url: z.string().optional(),
        homepage_cta_label: z.string().optional(),
        homepage_cta_route: z.string().optional(),
        secondary_cta_label: z.string().optional(),
        secondary_cta_route: z.string().optional(),
        footer_statement: z.string().optional(),
        contact_intro: z.string().optional(),
        service_area_wording: z.string().optional(),
        company_summary: z.string().optional(),
        announcement: z.string().optional(),
        analytics_enabled: z.boolean().optional(),
        analytics_provider: z.string().optional(),
        consent_required: z.boolean().optional(),
        first_party_analytics_enabled: z.boolean().optional(),
        analytics_site_id: z.string().optional(),
      })
      .optional(),
    navigation: z
      .array(
        z.object({
          route_key: navigationRouteKey,
          label: z.string().optional(),
          visible: z.boolean(),
          sort_order: z.number().int(),
        }),
      )
      .optional(),
    brand: z.record(z.string(), z.boolean()).optional(),
    seo: z
      .object({
        site_name: z.string().optional(),
        title_template: z.string().optional(),
        meta_description: z.string().optional(),
        organization_name: z.string().optional(),
        organization_url: z.string().optional(),
      })
      .optional(),
    legal: z
      .record(
        z.string(),
        z.object({
          published: z.boolean(),
          title: z.string().nullable(),
          updated_at: z.string().nullable(),
        }),
      )
      .optional(),
    site_mode: z.enum(["preview", "live"]).optional(),
    intake: z
      .object({
        enabled: z.boolean(),
        upload_policy: z.enum(["disabled", "images_only", "images_and_pdf"]),
      })
      .optional(),
    published_at: z.string().optional(),
    snapshot_id: z.string().optional(),
  })
  .passthrough();
export type PublicConfiguration = z.infer<typeof publicConfigurationSchema>;

export const businessSettingsSchema = z.object({
  profile: businessProfileReadSchema,
  channels: z.array(contactChannelReadSchema),
  location: businessLocationReadSchema,
  hours: z.array(businessHourSchema),
  social: z.array(socialLinkReadSchema),
  domain_versions: domainVersionsSchema,
  published: publicConfigurationSchema,
  preview: publicConfigurationSchema,
});
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;

export const websiteReadSchema = z.object({
  site_mode: z.enum(["preview", "live"]),
  site_mode_changed_at: z.string().nullable(),
  canonical_base_url: z.string().nullable(),
  homepage_cta_label: z.string(),
  homepage_cta_route: z.string(),
  secondary_cta_label: z.string().nullable(),
  secondary_cta_route: z.string().nullable(),
  footer_statement: z.string().nullable(),
  contact_intro: z.string().nullable(),
  service_area_wording: z.string().nullable(),
  company_summary: z.string().nullable(),
  announcement_text: z.string().nullable(),
  announcement_active: z.boolean(),
  analytics_enabled: z.boolean(),
  analytics_provider: z.string().nullable(),
  consent_required: z.boolean(),
  first_party_analytics_enabled: z.boolean(),
  analytics_site_id: z.string().nullable(),
  analytics_retention_days: z.number().int(),
  version: z.number().int(),
});

export const brandMediaSummarySchema = z
  .object({
    id: z.string().uuid(),
    filename: z.string().nullable(),
    mime_type: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    public_eligible: z.boolean(),
  })
  .nullable();

export const websiteSettingsReadSchema = z.object({
  website: websiteReadSchema,
  navigation: z.array(
    z.object({
      route_key: navigationRouteKey,
      label_override: z.string().nullable(),
      visible: z.boolean(),
      sort_order: z.number().int(),
    }),
  ),
  brand: z.object({
    version: z.number().int(),
    slots: z.record(z.string(), brandMediaSummarySchema),
  }),
  seo: z.object({
    site_name: z.string(),
    title_template: z.string(),
    meta_description: z.string().nullable(),
    organization_name: z.string().nullable(),
    organization_url: z.string().nullable(),
    version: z.number().int(),
  }),
  domain_versions: domainVersionsSchema,
  published: publicConfigurationSchema,
  preview: publicConfigurationSchema,
  is_super_admin: z.boolean(),
});
export type WebsiteSettings = z.infer<typeof websiteSettingsReadSchema>;

export const brandCandidateSchema = z.array(
  z.object({
    id: z.string().uuid(),
    filename: z.string().nullable(),
    mime_type: z.string().nullable(),
    width: z.number().nullable(),
    height: z.number().nullable(),
  }),
);
export type BrandCandidate = z.infer<typeof brandCandidateSchema>[number];

export const legalPagesSchema = z.object({
  pages: z.array(
    z.object({
      slug: z.enum(legalSlugs),
      draft_title: z.string(),
      draft_body: z.string(),
      draft_is_starter: z.boolean(),
      version: z.number().int(),
      published_title: z.string().nullable(),
      published_body: z.string().nullable(),
      published_revision: z.number().int().nullable(),
      published_at: z.string().nullable(),
      published_by: z.string().nullable(),
      updated_at: z.string(),
      has_unpublished_changes: z.boolean(),
      revisions: z.array(
        z.object({
          revision: z.number().int(),
          published_at: z.string(),
          published_by: z.string().nullable(),
        }),
      ),
    }),
  ),
  can_publish: z.boolean(),
});
export type LegalPages = z.infer<typeof legalPagesSchema>;
export type LegalPage = LegalPages["pages"][number];

export const documentDefaultsReadSchema = z.object({
  default_currency: z.string(),
  allowed_currencies: z.array(z.string()),
  invoice_tax_label: z.string(),
  invoice_tax_rate: num,
  invoice_payment_terms: z.string().nullable(),
  invoice_due_days: z.number().int(),
  po_tax_label: z.string(),
  po_tax_rate: num,
  po_terms: z.string().nullable(),
  po_expected_delivery_days: z.number().int(),
});
export type DocumentDefaults = z.infer<typeof documentDefaultsReadSchema>;

export const systemSettingsSchema = z.object({
  document_defaults: documentDefaultsReadSchema.extend({ version: z.number().int() }),
  operational: z.object({
    project_ending_soon_days: z.number().int(),
    invoice_due_soon_days: z.number().int(),
    stale_draft_invoice_days: z.number().int(),
    assignment_ending_soon_days: z.number().int(),
    material_required_soon_days: z.number().int(),
    po_expected_soon_days: z.number().int(),
    version: z.number().int(),
  }),
  numbering: z.object({
    invoice_pattern: z.string(),
    purchase_order_pattern: z.string(),
    invoice_counters: z.record(z.string(), z.number()),
    purchase_order_counters: z.record(z.string(), z.number()),
  }),
  site_mode: z.enum(["preview", "live"]),
  website_version: z.number().int(),
  can_write: z.boolean(),
  is_super_admin: z.boolean(),
});
export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const readinessCheckSchema = z.object({
  key: z.string(),
  label: z.string(),
  classification: z.enum(["required", "recommended", "optional", "info"]),
  state: z.enum(readinessStates),
  detail: z.string().nullable().optional(),
});
export type ReadinessCheck = z.infer<typeof readinessCheckSchema>;

export const launchReadinessSchema = z.object({
  checks: z.array(readinessCheckSchema),
  evidence: z.array(readinessCheckSchema),
  overall: z.enum(readinessStates),
  site_mode: z.enum(["preview", "live"]),
  website_version: z.number().int(),
  is_super_admin: z.boolean(),
});
export type LaunchReadiness = z.infer<typeof launchReadinessSchema>;

export const staffRegisterSchema = z.object({
  staff: z.array(
    z.object({
      id: z.string().uuid(),
      display_name: z.string().nullable(),
      email: z.string().nullable(),
      account_status: z.enum(["pending_mfa", "active", "disabled"]),
      roles: z.array(z.string()),
      mfa_enrolled: z.boolean(),
      last_sign_in_at: z.string().nullable(),
      created_at: z.string(),
      last_activity_at: z.string().nullable(),
      is_self: z.boolean(),
      must_change_password: z.boolean().catch(false),
    }),
  ),
  roles: z.array(
    z.object({
      key: z.string(),
      display_name: z.string(),
      is_system: z.boolean().catch(true),
      permissions: z.array(z.string()).catch([]),
    }),
  ),
  active_super_admins: z.number().int().catch(1),
  can_manage: z.boolean(),
});
export type StaffRegister = z.infer<typeof staffRegisterSchema>;

export const settingsOverviewSchema = z.object({
  site_mode: z.enum(["preview", "live"]),
  published_at: z.string().nullable(),
  has_unpublished_changes: z.boolean(),
  domains: z.object({
    business: z
      .object({
        display_name: z.string(),
        email: z.string(),
        channel_count: z.number().int(),
        location_published: z.boolean(),
        social_count: z.number().int(),
      })
      .nullable(),
    website: z
      .object({
        canonical_base_url: z.string().nullable(),
        seo_site_name: z.string(),
        meta_description_set: z.boolean(),
        logo_set: z.boolean(),
      })
      .nullable(),
    legal: z
      .record(
        z.string(),
        z.object({
          published: z.boolean(),
          starter: z.boolean(),
          revision: z.number().int().nullable(),
        }),
      )
      .nullable(),
    system: z.object({ default_currency: z.string(), invoice_tax_label: z.string() }).nullable(),
    staff: z.object({ active: z.number().int(), disabled: z.number().int() }).nullable(),
  }),
  readiness: z.enum(readinessStates).nullable(),
});
export type SettingsOverview = z.infer<typeof settingsOverviewSchema>;

export const snapshotHistorySchema = z.array(
  z.object({
    id: z.string().uuid(),
    published_at: z.string(),
    note: z.string().nullable(),
    is_current: z.boolean(),
    published_by: z.string().nullable(),
  }),
);

export function readinessTone(state: ReadinessState): "ready" | "review" | "blocked" {
  return state === "ready" ? "ready" : state === "warning" ? "review" : "blocked";
}
export const readinessLabels: Readonly<Record<ReadinessState, string>> = {
  ready: "READY",
  warning: "WARNING",
  blocked: "BLOCKED",
};

export { zodFieldErrors };
