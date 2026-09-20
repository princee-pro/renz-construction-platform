import "server-only";

import { z } from "zod";

import {
  serviceDetailSchema,
  serviceListResultSchema,
  serviceOverviewSchema,
  type ServiceDetail,
  type ServiceListResult,
  type ServiceOverview,
} from "@/features/services/service-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const cursorSchema = z
  .object({
    updated_at: z.iso.datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export type ServiceListFilters = Readonly<{
  query: string;
  status: "draft" | "published" | "archived" | "all";
  locale: string;
  cursor: string;
}>;

export type AuditActivity = Readonly<{
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  outcome: string;
  metadata: unknown;
  occurredAt: string;
}>;

export function decodeServiceCursor(value: string): { updated_at: string; id: string } | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const result = cursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function encodeServiceCursor(cursor: { updated_at: string; id: string } | null): string {
  return cursor ? Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url") : "";
}

export function normalizeServiceListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): ServiceListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const status = first("status");
  const locale = first("locale").trim();
  return {
    query: first("q").trim().slice(0, 100),
    status: status === "draft" || status === "published" || status === "archived" ? status : "all",
    locale: /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(locale) ? locale : "",
    cursor: decodeServiceCursor(first("cursor")) ? first("cursor") : "",
  };
}

export async function loadServiceOverview(): Promise<ServiceOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_service_overview");
  if (error || data === null) throw new Error("Service overview could not be loaded.");
  return serviceOverviewSchema.parse(data);
}

export async function loadServiceList(filters: ServiceListFilters): Promise<ServiceListResult> {
  const client = await createServerSupabaseClient();
  const cursor = decodeServiceCursor(filters.cursor);
  const { data, error } = await client.rpc("admin_list_services", {
    page_size: 25,
    ...(filters.query ? { search_query: filters.query } : {}),
    ...(filters.status === "all" ? {} : { status_filter: filters.status }),
    ...(filters.locale ? { locale_filter: filters.locale } : {}),
    ...(cursor ? { cursor_updated_at: cursor.updated_at, cursor_id: cursor.id } : {}),
  });
  if (error || data === null) throw new Error("Services could not be loaded.");
  return serviceListResultSchema.parse(data);
}

export async function loadServiceDetail(
  serviceId: string,
  locale = "en",
): Promise<ServiceDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_service", {
    target_id: serviceId,
    target_locale: locale,
  });
  if (error) throw new Error("Service detail could not be loaded.");
  return data === null ? null : serviceDetailSchema.parse(data);
}

export async function loadAuditActivity(
  options: Readonly<{ entityId?: string; limit?: number }> = {},
): Promise<readonly AuditActivity[]> {
  const client = await createServerSupabaseClient();
  let query = client
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, outcome, metadata, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(Math.min(Math.max(options.limit ?? 8, 1), 25));
  if (options.entityId)
    query = query.eq("entity_type", "service").eq("entity_id", options.entityId);
  const { data, error } = await query;
  if (error) throw new Error("Audit activity could not be loaded.");
  return (data ?? []).map((item) => ({
    id: item.id,
    action: item.action,
    entityType: item.entity_type,
    entityId: item.entity_id,
    outcome: item.outcome,
    metadata: item.metadata,
    occurredAt: item.occurred_at,
  }));
}
