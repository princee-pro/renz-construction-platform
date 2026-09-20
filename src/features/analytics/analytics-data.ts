import "server-only";

import {
  analyticsOverviewSchema,
  deliveryAnalyticsSchema,
  financeAnalyticsSchema,
  leadAnalyticsSchema,
  projectAnalyticsSchema,
  resolveAnalyticsRange,
  websiteAnalyticsSchema,
  type AnalyticsOverview,
  type AnalyticsRange,
  type DeliveryAnalytics,
  type FinanceAnalytics,
  type LeadAnalytics,
  type ProjectAnalytics,
  type WebsiteAnalytics,
} from "@/features/analytics/analytics-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { businessDate } from "@/lib/time/business-time";
import { loadBusinessTimezone } from "@/lib/time/business-timezone-server";

/**
 * Analytics loaders (C9 §10): one bounded RPC per page returning
 * presentation-ready aggregates. React never downloads raw rows. Every
 * range is resolved against the business-timezone "today" and re-validated
 * by the database window function.
 */

export async function resolveRequestedRange(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): Promise<Readonly<{ range: AnalyticsRange; timeZone: string; today: string }>> {
  const timeZone = await loadBusinessTimezone();
  const today = businessDate(new Date(), timeZone);
  return { range: resolveAnalyticsRange(raw, today), timeZone, today };
}

function rangeArgs(range: AnalyticsRange) {
  return { range_from: range.from, range_to: range.to };
}

export async function loadAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_overview", rangeArgs(range));
  if (error) throw new Error("The analytics overview could not be loaded.");
  return analyticsOverviewSchema.parse(data);
}

export async function loadLeadAnalytics(range: AnalyticsRange): Promise<LeadAnalytics> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_leads", rangeArgs(range));
  if (error) throw new Error("Lead analytics could not be loaded.");
  return leadAnalyticsSchema.parse(data);
}

export async function loadProjectAnalytics(range: AnalyticsRange): Promise<ProjectAnalytics> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_projects", rangeArgs(range));
  if (error) throw new Error("Project analytics could not be loaded.");
  return projectAnalyticsSchema.parse(data);
}

export async function loadFinanceAnalytics(range: AnalyticsRange): Promise<FinanceAnalytics> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_finance", rangeArgs(range));
  if (error) throw new Error("Finance analytics could not be loaded.");
  return financeAnalyticsSchema.parse(data);
}

export async function loadDeliveryAnalytics(range: AnalyticsRange): Promise<DeliveryAnalytics> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_delivery", rangeArgs(range));
  if (error) throw new Error("Delivery analytics could not be loaded.");
  return deliveryAnalyticsSchema.parse(data);
}

export async function loadWebsiteAnalytics(range: AnalyticsRange): Promise<WebsiteAnalytics> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_analytics_website", rangeArgs(range));
  if (error) throw new Error("Website analytics could not be loaded.");
  return websiteAnalyticsSchema.parse(data);
}
