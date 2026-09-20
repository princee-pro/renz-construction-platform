"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  actionState,
  authorize,
  commandId,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { type AdminActionState } from "@/features/admin-shared/action-state";
import {
  brandMediaInput,
  businessHoursInput,
  businessLocationInput,
  businessProfileInput,
  contactChannelInput,
  documentDefaultsInput,
  legalDraftInput,
  legalPublishInput,
  navigationSettingsInput,
  operationalSettingsInput,
  seoSettingsInput,
  siteModeInput,
  socialLinkInput,
  staffActionInput,
  createStaffInput,
  temporaryPasswordSchema,
  websiteSettingsInput,
  zodFieldErrors,
  type BrandCandidate,
} from "@/features/settings/settings-contract";
import { environmentLaunchBlockers, loadBrandCandidates } from "@/features/settings/settings-data";
import { roleDescriptions } from "@/lib/auth/capabilities";
import { createStaffUser, setStaffBan, setStaffPassword } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateSettings(section: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath(`/admin/settings/${section}`);
  revalidatePath("/admin/settings/launch-readiness");
}

/** Published public configuration changed: revalidate the public routes (the loader itself is per-request). */
function revalidatePublicSite(): void {
  for (const path of [
    "/",
    "/contact",
    "/about",
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    revalidatePath(path);
  }
  revalidatePath("/", "layout");
}

function conflictOrError(data: unknown): AdminActionState {
  return actionState(
    commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
    commandReason(data),
    { currentVersion: commandVersion(data, "current_version") },
  );
}

function invalid(message: string, error: Parameters<typeof zodFieldErrors>[0]): AdminActionState {
  return actionState("error", message, { fieldErrors: zodFieldErrors(error) });
}

// Business ---------------------------------------------------------------

export async function updateBusinessProfileAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) return denied;
  const parsed = businessProfileInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_business_profile", {
    expected_version: input.expectedVersion,
    target_display_name: input.displayName,
    target_primary_email: input.primaryEmail,
    target_short_name: input.shortName,
    target_timezone: input.timezone,
    target_default_locale: input.defaultLocale,
    ...(input.legalName ? { target_legal_name: input.legalName } : {}),
    ...(input.publicDescription ? { target_public_description: input.publicDescription } : {}),
    ...(input.tagline ? { target_tagline: input.tagline } : {}),
    ...(input.websiteUrl ? { target_website_url: input.websiteUrl } : {}),
    ...(input.country ? { target_country: input.country } : {}),
    ...(input.region ? { target_region: input.region } : {}),
    ...(input.mission ? { target_mission: input.mission } : {}),
    ...(input.approach ? { target_approach: input.approach } : {}),
    ...(input.serviceArea ? { target_service_area: input.serviceArea } : {}),
    ...(input.credentials ? { target_credentials: input.credentials } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("business");
  return actionState("success", "Business profile saved as draft. Publish to make it public.", {
    currentVersion: commandVersion(data),
  });
}

export async function upsertContactChannelAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) return denied;
  const parsed = contactChannelInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("upsert_contact_channel", {
    expected_version: input.expectedVersion,
    target_channel_type: input.channelType,
    target_label: input.label,
    target_value: input.value,
    target_is_public: input.isPublic,
    target_calling_enabled: input.callingEnabled,
    target_active: input.active,
    target_sort_order: input.sortOrder,
    ...(input.channelId ? { target_id: input.channelId } : {}),
    ...(input.purpose ? { target_purpose: input.purpose } : {}),
  });
  if (error || !commandSucceeded(data)) {
    if (commandReasonCode(data) === "version_conflict") return conflictOrError(data);
    return actionState("error", commandReason(data), {
      fieldErrors: { value: commandReason(data) },
    });
  }
  revalidateSettings("business");
  return actionState("success", "Contact channel saved.", {
    currentVersion: commandVersion(data),
    createdId: commandId(data),
  });
}

export async function updateBusinessLocationAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) return denied;
  const parsed = businessLocationInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_business_location", {
    expected_version: input.expectedVersion,
    target_publish: input.publish,
    ...(input.publicName ? { target_public_name: input.publicName } : {}),
    ...(input.street ? { target_street: input.street } : {}),
    ...(input.city ? { target_city: input.city } : {}),
    ...(input.region ? { target_region: input.region } : {}),
    ...(input.country ? { target_country: input.country } : {}),
    ...(input.postalCode ? { target_postal_code: input.postalCode } : {}),
    ...(input.latitude !== null ? { target_latitude: input.latitude } : {}),
    ...(input.longitude !== null ? { target_longitude: input.longitude } : {}),
    ...(input.mapsUrl ? { target_maps_url: input.mapsUrl } : {}),
    ...(input.directionsUrl ? { target_directions_url: input.directionsUrl } : {}),
    ...(input.serviceArea ? { target_service_area: input.serviceArea } : {}),
  });
  if (error || !commandSucceeded(data)) {
    if (commandReasonCode(data) === "version_conflict") return conflictOrError(data);
    return actionState("error", commandReason(data), {
      fieldErrors: { publish: commandReason(data) },
    });
  }
  revalidateSettings("business");
  return actionState("success", "Location saved. Publish the public configuration to apply it.", {
    currentVersion: commandVersion(data),
  });
}

export async function updateBusinessHoursAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) return denied;
  const parsed = businessHoursInput(formData);
  if (!parsed.success) return invalid("Check the opening hours.", parsed.error);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_business_hours", {
    expected_version: parsed.data.expectedVersion,
    hours: parsed.data.hours,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("business");
  return actionState("success", "Business hours saved.", { currentVersion: commandVersion(data) });
}

export async function upsertSocialLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) return denied;
  const parsed = socialLinkInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("upsert_social_link", {
    expected_version: input.expectedVersion,
    target_platform: input.platform,
    target_url: input.url,
    target_active: input.active,
    target_sort_order: input.sortOrder,
    ...(input.linkId ? { target_id: input.linkId } : {}),
    ...(input.label ? { target_label: input.label } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("business");
  return actionState("success", "Social link saved.", {
    currentVersion: commandVersion(data),
    createdId: commandId(data),
  });
}

// Website ----------------------------------------------------------------

export async function updateWebsiteSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.website.write");
  if (denied) return denied;
  const parsed = websiteSettingsInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_website_settings", {
    expected_version: input.expectedVersion,
    target_homepage_cta_label: input.homepageCtaLabel,
    target_homepage_cta_route: input.homepageCtaRoute,
    target_announcement_active: input.announcementActive,
    target_analytics_enabled: input.analyticsEnabled,
    target_consent_required: input.consentRequired,
    target_first_party_analytics_enabled: input.firstPartyAnalyticsEnabled,
    target_analytics_retention_days: input.analyticsRetentionDays,
    ...(input.analyticsSiteId ? { target_analytics_site_id: input.analyticsSiteId } : {}),
    ...(input.canonicalBaseUrl ? { target_canonical_base_url: input.canonicalBaseUrl } : {}),
    ...(input.secondaryCtaLabel ? { target_secondary_cta_label: input.secondaryCtaLabel } : {}),
    ...(input.secondaryCtaRoute ? { target_secondary_cta_route: input.secondaryCtaRoute } : {}),
    ...(input.footerStatement ? { target_footer_statement: input.footerStatement } : {}),
    ...(input.contactIntro ? { target_contact_intro: input.contactIntro } : {}),
    ...(input.serviceAreaWording ? { target_service_area_wording: input.serviceAreaWording } : {}),
    ...(input.companySummary ? { target_company_summary: input.companySummary } : {}),
    ...(input.announcementText ? { target_announcement_text: input.announcementText } : {}),
    ...(input.analyticsProvider ? { target_analytics_provider: input.analyticsProvider } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("website");
  return actionState("success", "Website settings saved as draft. Publish to make them public.", {
    currentVersion: commandVersion(data),
  });
}

export async function updateNavigationSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  // CR1: the owner navigation permission is enough to manage the menu.
  const denied =
    (await authorize("website.navigation.write")) && (await authorize("settings.website.write"));
  if (denied) return denied;
  const parsed = navigationSettingsInput(formData);
  if (!parsed.success) return invalid("Check the navigation labels.", parsed.error);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_navigation_settings", {
    expected_version: parsed.data.expectedVersion,
    items: parsed.data.items,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("website");
  return actionState("success", "Navigation saved.", { currentVersion: commandVersion(data) });
}

export async function updateBrandMediaAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.website.write");
  if (denied) return denied;
  const parsed = brandMediaInput(formData);
  if (!parsed.success) return invalid("Select valid media assets.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_brand_media_settings", {
    expected_version: input.expectedVersion,
    ...(input.primary_logo ? { target_primary_logo: input.primary_logo } : {}),
    ...(input.reversed_logo ? { target_reversed_logo: input.reversed_logo } : {}),
    ...(input.favicon ? { target_favicon: input.favicon } : {}),
    ...(input.default_og ? { target_default_og: input.default_og } : {}),
    ...(input.default_share ? { target_default_share: input.default_share } : {}),
    ...(input.default_hero ? { target_default_hero: input.default_hero } : {}),
    ...(input.document_logo ? { target_document_logo: input.document_logo } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("website");
  return actionState("success", "Brand media saved.", { currentVersion: commandVersion(data) });
}

export async function updateSeoSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.website.write");
  if (denied) return denied;
  const parsed = seoSettingsInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_seo_settings", {
    expected_version: input.expectedVersion,
    target_site_name: input.siteName,
    target_title_template: input.titleTemplate,
    ...(input.metaDescription ? { target_meta_description: input.metaDescription } : {}),
    ...(input.organizationName ? { target_organization_name: input.organizationName } : {}),
    ...(input.organizationUrl ? { target_organization_url: input.organizationUrl } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("website");
  return actionState("success", "SEO settings saved as draft. Publish to make them public.", {
    currentVersion: commandVersion(data),
  });
}

export async function publishPublicConfigurationAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.business.write");
  if (denied) {
    const websiteDenied = await authorize("settings.website.write");
    if (websiteDenied) return websiteDenied;
  }
  const rawNote = formData.get("note");
  const note = (typeof rawNote === "string" ? rawNote : "").trim().slice(0, 300);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("publish_public_configuration", {
    ...(note ? { note } : {}),
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateSettings("business");
  revalidateSettings("website");
  revalidatePublicSite();
  return actionState("success", "Public configuration published.", {
    createdId: commandId(data),
  });
}

export async function changeSiteModeAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.website.write");
  if (denied) return denied;
  const parsed = siteModeInput(formData);
  if (!parsed.success) return actionState("error", "Choose preview or live.");
  if (parsed.data.nextMode === "live") {
    const blockers = environmentLaunchBlockers();
    if (blockers.length > 0) {
      return actionState(
        "error",
        `Required launch checks are not satisfied in the deployment environment: ${blockers.join("; ")}.`,
        { detail: "launch_blocked" },
      );
    }
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_site_mode", {
    expected_version: parsed.data.expectedVersion,
    next_mode: parsed.data.nextMode,
  });
  if (error || !commandSucceeded(data)) {
    if (commandReasonCode(data) === "launch_blocked") {
      return actionState("error", commandReason(data), { detail: "launch_blocked" });
    }
    return conflictOrError(data);
  }
  revalidateSettings("website");
  revalidateSettings("system");
  revalidatePublicSite();
  return actionState("success", `Site mode is now ${parsed.data.nextMode}.`, {
    currentVersion: commandVersion(data),
  });
}

// Legal ------------------------------------------------------------------

export async function updateLegalDraftAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.legal.write");
  if (denied) return denied;
  const parsed = legalDraftInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_legal_page_draft", {
    target_slug: parsed.data.slug,
    expected_version: parsed.data.expectedVersion,
    target_title: parsed.data.title,
    target_body: parsed.data.body,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("legal");
  return actionState(
    "success",
    "Draft saved. The public page still shows the published revision.",
    {
      currentVersion: commandVersion(data),
    },
  );
}

export async function publishLegalPageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.legal.publish");
  if (denied) return denied;
  const parsed = legalPublishInput(formData);
  if (!parsed.success) return actionState("error", "The legal page reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("publish_legal_page", {
    target_slug: parsed.data.slug,
    expected_version: parsed.data.expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("legal");
  revalidatePublicSite();
  return actionState("success", "Legal page published.", { currentVersion: commandVersion(data) });
}

// System -----------------------------------------------------------------

export async function updateDocumentDefaultsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.system.write");
  if (denied) return denied;
  const parsed = documentDefaultsInput(formData);
  if (!parsed.success) return invalid("Correct the highlighted fields.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_document_defaults", {
    expected_version: input.expectedVersion,
    target_default_currency: input.defaultCurrency,
    target_allowed_currencies: input.allowedCurrencies,
    target_invoice_tax_label: input.invoiceTaxLabel,
    target_invoice_tax_rate: Number(input.invoiceTaxRate),
    target_invoice_due_days: input.invoiceDueDays,
    target_po_tax_label: input.poTaxLabel,
    target_po_tax_rate: Number(input.poTaxRate),
    target_po_expected_delivery_days: input.poExpectedDeliveryDays,
    ...(input.invoicePaymentTerms
      ? { target_invoice_payment_terms: input.invoicePaymentTerms }
      : {}),
    ...(input.poTerms ? { target_po_terms: input.poTerms } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("system");
  revalidatePath("/admin/finance/invoices/new");
  revalidatePath("/admin/procurement/orders/new");
  return actionState("success", "Document defaults saved. Only new drafts use them.", {
    currentVersion: commandVersion(data),
  });
}

export async function updateOperationalSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.system.write");
  if (denied) return denied;
  const parsed = operationalSettingsInput(formData);
  if (!parsed.success) return invalid("Thresholds must be whole days in range.", parsed.error);
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_operational_settings", {
    expected_version: input.expectedVersion,
    target_project_ending_soon_days: input.projectEndingSoonDays,
    target_invoice_due_soon_days: input.invoiceDueSoonDays,
    target_stale_draft_invoice_days: input.staleDraftInvoiceDays,
    target_assignment_ending_soon_days: input.assignmentEndingSoonDays,
    target_material_required_soon_days: input.materialRequiredSoonDays,
    target_po_expected_soon_days: input.poExpectedSoonDays,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateSettings("system");
  revalidatePath("/admin/finance");
  return actionState("success", "Operational thresholds saved.", {
    currentVersion: commandVersion(data),
  });
}

// Staff ------------------------------------------------------------------

export async function staffAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("staff.manage");
  if (denied) return denied;
  const parsed = staffActionInput(formData);
  if (!parsed.success) return actionState("error", "The staff action is invalid.");
  const client = await createServerSupabaseClient();
  if (parsed.data.action === "disable") {
    const { data, error } = await client.rpc("disable_user", {
      target_user_id: parsed.data.userId,
    });
    if (error || data !== true) {
      return actionState("error", "The account could not be disabled.");
    }
    try {
      await setStaffBan(parsed.data.userId, true);
    } catch {
      // the profile status already blocks every facade; the ban is defence in depth
    }
    revalidateSettings("staff");
    return actionState("success", "Account disabled. They can no longer sign in.");
  }
  if (parsed.data.action === "reactivate") {
    const { data, error } = await client.rpc("reactivate_user", {
      target_user_id: parsed.data.userId,
    });
    if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
    try {
      await setStaffBan(parsed.data.userId, false);
    } catch {
      // best effort
    }
    revalidateSettings("staff");
    return actionState("success", "Account reactivated.");
  }
  if (parsed.data.action === "rename") {
    if (!parsed.data.displayName) return actionState("error", "Enter a name.");
    const { data, error } = await client.rpc("admin_update_staff_profile", {
      target_user_id: parsed.data.userId,
      target_display_name: parsed.data.displayName,
    });
    if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
    revalidateSettings("staff");
    return actionState("success", "Name saved.");
  }
  if (parsed.data.action === "reset_password") {
    return resetStaffPassword(client, parsed.data.userId, parsed.data.temporaryPassword);
  }
  if (!parsed.data.role) return actionState("error", "Choose a role.");
  const { data, error } = await client.rpc("set_staff_role", {
    target_user_id: parsed.data.userId,
    requested_role_key: parsed.data.role,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateSettings("staff");
  return actionState(
    "success",
    `Role set to ${roleDescriptions[parsed.data.role]?.label ?? parsed.data.role}.`,
  );
}

/** Cryptographically strong temporary password: 16 chars, letters + digits, no ambiguous glyphs. */
function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  let value = "";
  for (const byte of bytes) value += alphabet[byte % alphabet.length];
  // guarantee the policy (a letter and a digit) without weakening randomness
  return `${value.slice(0, 14)}${alphabet[bytes[0]! % 50]}${(bytes[1]! % 8) + 2}`;
}

/**
 * The temporary password exists only in this request and in the one
 * success message the owner reads once. Never logged, never audited, never
 * stored: the profile only records that a change is required.
 */
async function resetStaffPassword(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  typed: string | null,
): Promise<AdminActionState> {
  const temporary = typed && typed.length > 0 ? typed : generateTemporaryPassword();
  const policy = temporaryPasswordSchema.safeParse(temporary);
  if (!policy.success) {
    return actionState("error", policy.error.issues[0]?.message ?? "Choose a stronger password.");
  }
  // The facade decides (owner only, never self) before the Auth Admin call.
  const gate = await client.rpc("admin_require_password_change", { target_user_id: userId });
  if (gate.error || !commandSucceeded(gate.data))
    return actionState("error", commandReason(gate.data));
  try {
    await setStaffPassword(userId, temporary);
  } catch {
    return actionState("error", "The password could not be reset. Try again.");
  }
  try {
    await setStaffBan(userId, false);
  } catch {
    // a lifted ban is best-effort; the profile status governs access
  }
  revalidateSettings("staff");
  return actionState(
    "success",
    `Temporary password set. Give it to the staff member privately — it is shown once: ${temporary}`,
    { currentVersion: null },
  );
}

/** C10 §19–21: the owner creates a staff account with a temporary password (no email is sent). */
export async function createStaffAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("staff.manage");
  if (denied) return denied;
  const parsed = createStaffInput(formData);
  if (!parsed.success) return invalid("Check the highlighted fields.", parsed.error);
  const client = await createServerSupabaseClient();
  // Owner-only, server-side: the facade refuses anyone but a Super Admin with
  // staff.manage before any Auth Admin call is made.
  const probe = await client.rpc("admin_list_staff");
  const canManage =
    !probe.error &&
    typeof probe.data === "object" &&
    probe.data !== null &&
    (probe.data as { can_manage?: boolean }).can_manage === true;
  if (!canManage) return actionState("error", "Only the owner (Super Admin) can create staff.");
  const temporary =
    parsed.data.temporaryPassword.length > 0
      ? parsed.data.temporaryPassword
      : generateTemporaryPassword();
  let userId: string;
  try {
    userId = (await createStaffUser(parsed.data.email, temporary, parsed.data.displayName)).userId;
  } catch (error) {
    return actionState(
      "error",
      error instanceof Error && error.message === "email_exists"
        ? "An account with this email already exists."
        : "The account could not be created. Try again.",
    );
  }
  const prepared = await client.rpc("admin_prepare_staff_profile", {
    target_user_id: userId,
    target_display_name: parsed.data.displayName,
    requested_role_key: parsed.data.role,
  });
  if (prepared.error || !commandSucceeded(prepared.data)) {
    return actionState("error", commandReason(prepared.data));
  }
  revalidateSettings("staff");
  return actionState(
    "success",
    `Account created for ${parsed.data.email}. Temporary password (shown once — give it privately): ${temporary}. They will be asked to change it and set up their authenticator at first sign-in.`,
    { currentVersion: null },
  );
}

export async function searchBrandMediaAction(query: string): Promise<readonly BrandCandidate[]> {
  const denied = await authorize("settings.website.read");
  if (denied) return [];
  return loadBrandCandidates(query);
}
