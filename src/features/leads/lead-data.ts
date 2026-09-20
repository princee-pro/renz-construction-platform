import "server-only";

import {
  intakeSettingsSchema,
  leadAssigneesSchema,
  leadDetailSchema,
  leadListResultSchema,
  leadOverviewSchema,
  leadQueueSchema,
  leadSummarySchema,
  leadSources,
  leadStatuses,
  type IntakeSettings,
  type LeadAssignee,
  type LeadDetail,
  type LeadListResult,
  type LeadOverview,
  type LeadQueueItem,
  type LeadSummary,
} from "@/features/leads/lead-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type LeadListFilters = Readonly<{
  search: string;
  type: string;
  status: string;
  service: string;
  assigned: string;
  source: string;
  scope: "active" | "archived" | "all";
  from: string;
  to: string;
  cursorSubmittedAt: string;
  cursorId: string;
  view: "table" | "pipeline";
}>;

const leadTypes = new Set(["general", "project", "service", "material"]);
const serviceKeys = new Set([
  "design",
  "executions",
  "hybrid-service",
  "supervision",
  "consultations",
  "not_sure",
  "other",
]);

export function normalizeLeadListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): LeadListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const scope = first("scope");
  const assigned = first("assigned");
  const date = (value: string) => (/^\d{4}-\d{2}-\d{2}$/u.test(value) ? value : "");
  return {
    search: first("q").trim().slice(0, 100),
    type: leadTypes.has(first("type")) ? first("type") : "",
    status: (leadStatuses as readonly string[]).includes(first("status")) ? first("status") : "",
    service: serviceKeys.has(first("service")) ? first("service") : "",
    assigned:
      assigned === "me" || assigned === "unassigned" || /^[0-9a-f-]{36}$/u.test(assigned)
        ? assigned
        : "",
    source: (leadSources as readonly string[]).includes(first("source")) ? first("source") : "",
    scope: scope === "archived" || scope === "all" ? scope : "active",
    from: date(first("from")),
    to: date(first("to")),
    cursorSubmittedAt: first("cs"),
    cursorId: first("ci"),
    view: first("view") === "pipeline" ? "pipeline" : "table",
  };
}

export function leadFiltersActive(filters: LeadListFilters): boolean {
  return Boolean(
    filters.search ||
    filters.type ||
    filters.status ||
    filters.service ||
    filters.assigned ||
    filters.source ||
    filters.scope !== "active" ||
    filters.from ||
    filters.to,
  );
}

export async function loadLeadList(
  filters: LeadListFilters,
  pageSize = 25,
): Promise<LeadListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_leads", {
    page_size: pageSize,
    status_scope: filters.scope,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.type ? { type_filter: filters.type } : {}),
    ...(filters.status ? { status_filter: filters.status } : {}),
    ...(filters.service ? { service_filter: filters.service } : {}),
    ...(filters.assigned ? { assigned_filter: filters.assigned } : {}),
    ...(filters.source ? { source_filter: filters.source } : {}),
    ...(filters.from ? { submitted_from: filters.from } : {}),
    ...(filters.to ? { submitted_to: filters.to } : {}),
    ...(filters.cursorSubmittedAt && filters.cursorId
      ? { cursor_submitted_at: filters.cursorSubmittedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The lead register could not be loaded.");
  return leadListResultSchema.parse(data);
}

export async function loadLeadOverview(): Promise<LeadOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_leads_overview");
  if (error) throw new Error("The lead overview could not be loaded.");
  return leadOverviewSchema.parse(data);
}

export async function loadLeadActionQueue(limit = 12): Promise<readonly LeadQueueItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_lead_action_queue", { limit_count: limit });
  if (error) return [];
  return leadQueueSchema.parse(data ?? []);
}

export async function loadLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_lead", { target_id: leadId });
  if (error || data === null) return null;
  return leadDetailSchema.parse(data);
}

export async function loadLeadAssignees(): Promise<readonly LeadAssignee[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_lead_assignees");
  if (error) return [];
  return leadAssigneesSchema.parse(data ?? []);
}

export async function loadClientLeads(clientId: string): Promise<readonly LeadSummary[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_client_leads", { target_client_id: clientId });
  if (error) return [];
  return leadSummarySchema.array().parse(data ?? []);
}

export async function loadProjectOriginatingLead(projectId: string): Promise<LeadSummary | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_project_originating_lead", {
    target_project_id: projectId,
  });
  if (error || data === null) return null;
  const parsed = leadSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export async function loadIntakeSettings(): Promise<IntakeSettings | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_intake_settings");
  if (error || data === null) return null;
  const parsed = intakeSettingsSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
