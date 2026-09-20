import "server-only";

import {
  actionQueueSchema,
  caseStudyOperationalProjectSchema,
  operationsOverviewSchema,
  projectDetailSchema,
  projectListResultSchema,
  quickFindResultSchema,
  recentActivitySchema,
  type ActionQueueItem,
  type CaseStudyOperationalProject,
  type OperationalProjectDetail,
  type OperationalProjectListResult,
  type OperationsOverview,
  type QuickFindResult,
  type RecentActivityItem,
} from "@/features/operational-projects/project-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProjectListFilters = Readonly<{
  search: string;
  clientId: string;
  status: string;
  phase: string;
  priority: string;
  statusScope: "active" | "archived" | "all";
  caseStudy: "" | "linked" | "unlinked";
  cursorUpdatedAt: string;
  cursorId: string;
}>;

export function normalizeProjectListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): ProjectListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const scope = first("scope");
  const caseStudy = first("caseStudy");
  return {
    search: first("q").trim().slice(0, 100),
    clientId: first("client"),
    status: first("status"),
    phase: first("phase"),
    priority: first("priority"),
    statusScope: scope === "archived" || scope === "all" ? scope : "active",
    caseStudy: caseStudy === "linked" || caseStudy === "unlinked" ? caseStudy : "",
    cursorUpdatedAt: first("cu"),
    cursorId: first("ci"),
  };
}

export async function loadOperationsOverview(): Promise<OperationsOverview> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_operations_overview");
  if (error) throw new Error("The operations overview could not be loaded.");
  return operationsOverviewSchema.parse(data);
}

export async function loadActionQueue(limit = 20): Promise<readonly ActionQueueItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_action_queue", { limit_count: limit });
  if (error) return [];
  return actionQueueSchema.parse(data);
}

export async function loadRecentActivity(limit = 20): Promise<readonly RecentActivityItem[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_recent_activity", { limit_count: limit });
  if (error) return [];
  return recentActivitySchema.parse(data);
}

export async function loadProjectList(
  filters: ProjectListFilters,
): Promise<OperationalProjectListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_operational_projects", {
    page_size: 25,
    status_scope: filters.statusScope,
    ...(filters.search ? { search_query: filters.search } : {}),
    ...(filters.clientId ? { client_id_filter: filters.clientId } : {}),
    ...(filters.status ? { status_filter: filters.status } : {}),
    ...(filters.phase ? { phase_filter: filters.phase } : {}),
    ...(filters.priority ? { priority_filter: filters.priority } : {}),
    ...(filters.caseStudy ? { case_study_filter: filters.caseStudy } : {}),
    ...(filters.cursorUpdatedAt && filters.cursorId
      ? { cursor_updated_at: filters.cursorUpdatedAt, cursor_id: filters.cursorId }
      : {}),
  });
  if (error) throw new Error("The project register could not be loaded.");
  return projectListResultSchema.parse(data);
}

export async function loadProjectDetail(
  projectId: string,
): Promise<OperationalProjectDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_operational_project", {
    target_id: projectId,
  });
  if (error) return null;
  return projectDetailSchema.parse(data);
}

export async function loadOperationalProjectForCaseStudy(
  caseStudyId: string,
): Promise<CaseStudyOperationalProject> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_operational_project_for_case_study", {
    target_case_study_id: caseStudyId,
  });
  if (error) return null;
  return caseStudyOperationalProjectSchema.parse(data);
}

export async function quickFind(query: string): Promise<QuickFindResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_global_quick_find", {
    search_query: query,
    limit_count: 8,
  });
  if (error) return [];
  return quickFindResultSchema.parse(data);
}
