import "server-only";

import { z } from "zod";

import {
  projectDetailSchema,
  projectListResultSchema,
  type ProjectDetail,
  type ProjectListResult,
} from "@/features/projects/project-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const cursorSchema = z
  .object({
    updated_at: z.iso.datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export type ProjectListFilters = Readonly<{
  query: string;
  status: "draft" | "published" | "archived" | "all";
  type: string;
  locale: string;
  cursor: string;
}>;

export function decodeProjectCursor(value: string): { updated_at: string; id: string } | null {
  if (!value || value.length > 512) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const result = cursorSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function encodeProjectCursor(cursor: { updated_at: string; id: string } | null): string {
  return cursor ? Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url") : "";
}

export function normalizeProjectListFilters(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): ProjectListFilters {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const status = first("status");
  const locale = first("locale").trim();
  return {
    query: first("q").trim().slice(0, 100),
    status: status === "draft" || status === "published" || status === "archived" ? status : "all",
    type: first("type").trim().slice(0, 80),
    locale: /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(locale) ? locale : "",
    cursor: decodeProjectCursor(first("cursor")) ? first("cursor") : "",
  };
}

export async function loadProjectList(filters: ProjectListFilters): Promise<ProjectListResult> {
  const client = await createServerSupabaseClient();
  const cursor = decodeProjectCursor(filters.cursor);
  const { data, error } = await client.rpc("admin_list_projects", {
    page_size: 25,
    ...(filters.query ? { search_query: filters.query } : {}),
    ...(filters.status === "all" ? {} : { status_filter: filters.status }),
    ...(filters.type ? { type_filter: filters.type } : {}),
    ...(filters.locale ? { locale_filter: filters.locale } : {}),
    ...(cursor ? { cursor_updated_at: cursor.updated_at, cursor_id: cursor.id } : {}),
  });
  if (error || data === null) throw new Error("Projects could not be loaded.");
  return projectListResultSchema.parse(data);
}

export async function loadProjectDetail(
  projectId: string,
  locale = "en",
): Promise<ProjectDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_project", {
    target_id: projectId,
    target_locale: locale,
  });
  if (error) throw new Error("Project detail could not be loaded.");
  return data === null ? null : projectDetailSchema.parse(data);
}

export async function loadPublishableServices(): Promise<readonly { id: string; name: string }[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("services")
    .select("id, service_localizations(name, locale)")
    .eq("publication_status", "draft")
    .limit(100);
  const published = await client
    .from("services")
    .select("id, service_localizations(name, locale)")
    .eq("publication_status", "published")
    .limit(100);
  if (error || published.error) throw new Error("Services could not be loaded.");
  const rows = [...(data ?? []), ...(published.data ?? [])];
  const seen = new Set<string>();
  const items: { id: string; name: string }[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const localizations = Array.isArray(row.service_localizations) ? row.service_localizations : [];
    const match = localizations.find((entry) => entry.locale === "en") ?? localizations[0] ?? null;
    items.push({ id: row.id, name: match?.name ?? row.id });
  }
  return items.sort((left, right) => left.name.localeCompare(right.name));
}
