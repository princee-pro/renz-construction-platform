import "server-only";

import {
  deliveryOverviewSchema,
  deliveryQueueSchema,
  duplicateMaterialSchema,
  materialDetailSchema,
  materialListResultSchema,
  materialPickerSchema,
  poDetailSchema,
  poDocumentSchema,
  poListResultSchema,
  projectDeliverySummarySchema,
  projectProcurementSchema,
  type DeliveryOverview,
  type DeliveryQueueItem,
  type DuplicateMaterial,
  type MaterialDetail,
  type MaterialListResult,
  type MaterialPickerEntry,
  type PoDetail,
  type PoDocument,
  type PoListResult,
  type ProjectDeliverySummary,
  type ProjectProcurement,
} from "@/features/procurement/procurement-contract";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

function firstOf(raw: Readonly<Record<string, string | string[] | undefined>>) {
  return (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
}

// Materials --------------------------------------------------------------

export type MaterialListFilters = Readonly<{
  search: string;
  category: string;
  statusScope: "active" | "archived" | "all";
  cursorUpdatedAt: string;
  cursorId: string;
}>;

export function normalizeMaterialListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): MaterialListFilters {
  const first = firstOf(raw);
  const status = first("status");
  return {
    search: first("q").trim().slice(0, 100),
    category: first("category").trim().slice(0, 80),
    statusScope: status === "archived" || status === "all" ? status : "active",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadMaterialList(filters: MaterialListFilters): Promise<MaterialListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_materials", {
    page_size: 25,
    status_scope: filters.statusScope,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.category ? { category_filter: filters.category } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The material catalog could not be loaded.");
  return materialListResultSchema.parse(data);
}

export async function loadMaterialDetail(materialId: string): Promise<MaterialDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_material", { target_id: materialId });
  if (error) return null;
  return materialDetailSchema.parse(data);
}

export async function loadMaterialsForPicker(
  query: string,
): Promise<readonly MaterialPickerEntry[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_materials_for_picker", {
    limit_count: 10,
    ...(query.trim() ? { search_query: query.trim().slice(0, 100) } : {}),
  });
  if (error) return [];
  const parsed = materialPickerSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

export async function findDuplicateMaterials(
  name: string,
  code: string,
  excludeId?: string,
): Promise<readonly DuplicateMaterial[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("find_possible_duplicate_materials", {
    target_name: name.trim().slice(0, 200),
    ...(code.trim() ? { target_code: code.trim().slice(0, 60) } : {}),
    ...(excludeId && uuidPattern.test(excludeId) ? { exclude_id: excludeId } : {}),
  });
  if (error) return [];
  const parsed = duplicateMaterialSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

// Project procurement ----------------------------------------------------

export async function loadProjectProcurement(
  projectId: string,
): Promise<ProjectProcurement | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_project_procurement", {
    target_project_id: projectId,
  });
  if (error) return null;
  return projectProcurementSchema.parse(data);
}

export async function loadProjectDeliverySummary(
  projectId: string,
): Promise<ProjectDeliverySummary | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_project_delivery_summary", {
    target_project_id: projectId,
  });
  if (error) return null;
  return projectDeliverySummarySchema.parse(data);
}

// Purchase orders --------------------------------------------------------

export type PoListFilters = Readonly<{
  search: string;
  supplierId: string;
  projectId: string;
  lifecycle: string;
  delivery: string;
  currency: string;
  delayed: boolean;
  issuedFrom: string;
  issuedTo: string;
  cursorUpdatedAt: string;
  cursorId: string;
}>;

export function normalizePoListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): PoListFilters {
  const first = firstOf(raw);
  const lifecycle = first("lifecycle");
  const delivery = first("delivery");
  const currency = first("currency").toUpperCase();
  return {
    search: first("q").trim().slice(0, 100),
    supplierId: uuidPattern.test(first("supplier")) ? first("supplier") : "",
    projectId: uuidPattern.test(first("project")) ? first("project") : "",
    lifecycle: ["draft", "issued", "cancelled", "closed"].includes(lifecycle) ? lifecycle : "",
    delivery: ["not_received", "partially_received", "received", "delayed"].includes(delivery)
      ? delivery
      : "",
    currency: /^[A-Z]{3}$/u.test(currency) ? currency : "",
    delayed: first("delayed") === "1",
    issuedFrom: datePattern.test(first("from")) ? first("from") : "",
    issuedTo: datePattern.test(first("to")) ? first("to") : "",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadPoList(filters: PoListFilters): Promise<PoListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_purchase_orders", {
    page_size: 25,
    delayed_only: filters.delayed,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.supplierId ? { supplier_id_filter: filters.supplierId } : {}),
    ...(filters.projectId ? { project_id_filter: filters.projectId } : {}),
    ...(filters.lifecycle ? { lifecycle_filter: filters.lifecycle } : {}),
    ...(filters.delivery ? { delivery_filter: filters.delivery } : {}),
    ...(filters.currency ? { currency_filter: filters.currency } : {}),
    ...(filters.issuedFrom ? { issued_from: filters.issuedFrom } : {}),
    ...(filters.issuedTo ? { issued_to: filters.issuedTo } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The purchase order register could not be loaded.");
  return poListResultSchema.parse(data);
}

export async function loadPoDetail(orderId: string): Promise<PoDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_purchase_order", { target_id: orderId });
  if (error) return null;
  return poDetailSchema.parse(data);
}

// Control Room -----------------------------------------------------------

export async function loadDeliveryOverview(): Promise<DeliveryOverview | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_delivery_overview");
  if (error) return null;
  return deliveryOverviewSchema.parse(data);
}

export async function loadDeliveryActionQueue(limit = 20): Promise<readonly DeliveryQueueItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_delivery_action_queue", { limit_count: limit });
  if (error) return [];
  return deliveryQueueSchema.parse(data);
}

/**
 * The single anonymous procurement read path: a raw supplier share token
 * resolved server-side through the stateless public client. Null for every
 * miss (unknown, malformed, revoked, draft) — nothing is enumerable.
 */
export async function loadSharedPurchaseOrder(rawToken: string): Promise<PoDocument | null> {
  if (!/^[A-Za-z0-9_-]{40,64}$/u.test(rawToken)) return null;
  const client = createPublicSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("public_purchase_order_by_share_token", {
    raw_token: rawToken,
  });
  if (error || data === null) return null;
  const parsed = poDocumentSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
