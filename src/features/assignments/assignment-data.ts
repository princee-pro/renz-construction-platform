import "server-only";

import {
  assignmentDetailSchema,
  payablesResultSchema,
  projectContractorsSchema,
  type AssignmentDetail,
  type PayablesResult,
  type ProjectContractors,
} from "@/features/assignments/assignment-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type PayablesFilters = Readonly<{
  search: string;
  partnerId: string;
  projectId: string;
  status: string;
  currency: string;
  payment: string;
  cursorUpdatedAt: string;
  cursorId: string;
}>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function normalizePayablesFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): PayablesFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const status = first("status");
  const payment = first("payment");
  const currency = first("currency").toUpperCase();
  return {
    search: first("q").trim().slice(0, 100),
    partnerId: uuid.test(first("partner")) ? first("partner") : "",
    projectId: uuid.test(first("project")) ? first("project") : "",
    status: ["planned", "active", "on_hold", "completed", "cancelled"].includes(status)
      ? status
      : "",
    currency: /^[A-Z]{3}$/u.test(currency) ? currency : "",
    payment: ["unpaid", "partially_paid", "paid"].includes(payment) ? payment : "",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadAssignmentDetail(assignmentId: string): Promise<AssignmentDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_contractor_assignment", {
    target_id: assignmentId,
  });
  if (error) return null;
  return assignmentDetailSchema.parse(data);
}

export async function loadProjectContractors(
  projectId: string,
): Promise<ProjectContractors | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_project_contractors", {
    target_project_id: projectId,
  });
  if (error) return null;
  return projectContractorsSchema.parse(data);
}

export async function loadPayables(filters: PayablesFilters): Promise<PayablesResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_contractor_payables", {
    page_size: 25,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.partnerId ? { partner_id_filter: filters.partnerId } : {}),
    ...(filters.projectId ? { project_id_filter: filters.projectId } : {}),
    ...(filters.status ? { status_filter: filters.status } : {}),
    ...(filters.currency ? { currency_filter: filters.currency } : {}),
    ...(filters.payment ? { payment_filter: filters.payment } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("Contractor payables could not be loaded.");
  return payablesResultSchema.parse(data);
}
