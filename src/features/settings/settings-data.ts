import "server-only";

import {
  brandCandidateSchema,
  businessSettingsSchema,
  documentDefaultsReadSchema,
  launchReadinessSchema,
  legalPagesSchema,
  settingsOverviewSchema,
  snapshotHistorySchema,
  staffRegisterSchema,
  systemSettingsSchema,
  websiteSettingsReadSchema,
  type BrandCandidate,
  type BusinessSettings,
  type DocumentDefaults,
  type LaunchReadiness,
  type LegalPages,
  type SettingsOverview,
  type StaffRegister,
  type SystemSettings,
  type WebsiteSettings,
} from "@/features/settings/settings-contract";
import { intakeEnvironmentChecks } from "@/features/intake/intake-server";
import { notificationEnvironmentChecks } from "@/features/notifications/notification-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function loadSettingsOverview(): Promise<SettingsOverview | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_settings_overview");
  if (error) return null;
  return settingsOverviewSchema.parse(data);
}

export async function loadBusinessSettings(): Promise<BusinessSettings | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_business_settings");
  if (error) return null;
  return businessSettingsSchema.parse(data);
}

export async function loadWebsiteSettings(): Promise<WebsiteSettings | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_website_settings");
  if (error) return null;
  return websiteSettingsReadSchema.parse(data);
}

export async function loadBrandCandidates(query: string): Promise<readonly BrandCandidate[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_brand_media_candidates", {
    limit_count: 12,
    ...(query.trim() ? { search_query: query.trim().slice(0, 100) } : {}),
  });
  if (error) return [];
  const parsed = brandCandidateSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function loadLegalPages(): Promise<LegalPages | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_legal_pages");
  if (error) return null;
  return legalPagesSchema.parse(data);
}

export async function loadSystemSettings(): Promise<SystemSettings | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_system_settings");
  if (error) return null;
  return systemSettingsSchema.parse(data);
}

/**
 * Database readiness merged with the deployment-environment checks only the
 * Next server can see (C8 anti-abuse secret, Turnstile, scanner adapter).
 * A blocked required environment check blocks the overall state exactly like
 * a database check; `changeSiteModeAction` applies the same gate.
 */
export async function loadLaunchReadiness(): Promise<LaunchReadiness | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_launch_readiness");
  if (error) return null;
  const readiness = launchReadinessSchema.parse(data);
  const checks = [
    ...readiness.checks,
    ...intakeEnvironmentChecks(),
    ...notificationEnvironmentChecks(),
  ];
  const blocked = checks.some(
    (check) => check.classification === "required" && check.state === "blocked",
  );
  const warning = checks.some((check) => check.state !== "ready");
  return { ...readiness, checks, overall: blocked ? "blocked" : warning ? "warning" : "ready" };
}

export function environmentLaunchBlockers(): readonly string[] {
  return intakeEnvironmentChecks()
    .filter((check) => check.classification === "required" && check.state === "blocked")
    .map((check) => check.label);
}

export async function loadStaffRegister(): Promise<StaffRegister | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_staff");
  if (error) return null;
  return staffRegisterSchema.parse(data);
}

export async function loadSnapshotHistory(limit = 10) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_configuration_snapshots", {
    limit_count: limit,
  });
  if (error) return [];
  const parsed = snapshotHistorySchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

/** Form defaults for NEW invoice / purchase order drafts (never a snapshot rewrite). */
export async function loadDocumentDefaults(): Promise<DocumentDefaults | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_document_defaults");
  if (error) return null;
  const parsed = documentDefaultsReadSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** ISO date (YYYY-MM-DD) `days` from today, for document date defaults. */
export function dateAfterDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Secrets boundary: Admin sees Configured / Not configured, never the value.
 * Only names are listed; values never leave the server.
 */
export function environmentPresence(): readonly Readonly<{ key: string; configured: boolean }>[] {
  return [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "RENZ_CLIENT_PREVIEW",
    "INTAKE_RATE_LIMIT_SECRET",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "RENZ_TASK_TOKEN",
  ].map((key) => ({ key, configured: Boolean(process.env[key]) }));
}
