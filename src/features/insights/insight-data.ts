import "server-only";

import { z } from "zod";

import { contentBlocksSchema } from "@/lib/content/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const nullableString = z.string().nullable().catch(null);
const status = z.enum(["draft", "published", "archived"]);

export const insightListItemSchema = z.object({
  id: z.string().uuid(),
  publication_status: status,
  updated_at: z.string(),
  published_at: nullableString,
  publication_date: nullableString,
  version: z.number().int(),
  title: z.string(),
  slug: z.string(),
  topic: nullableString,
  featured: z.boolean().catch(false),
  pinned: z.boolean().catch(false),
  has_draft_changes: z.boolean().catch(false),
  readiness: z.enum(["ready", "blocked"]).catch("blocked"),
  blocker_count: z.number().int().catch(0),
});
export type InsightListItem = z.infer<typeof insightListItemSchema>;

export const insightListSchema = z.object({
  counts: z.object({
    draft: z.number().int().catch(0),
    published: z.number().int().catch(0),
    archived: z.number().int().catch(0),
  }),
  items: z.array(insightListItemSchema).catch([]),
});
export type InsightList = z.infer<typeof insightListSchema>;

export const readinessReasonSchema = z.object({
  code: z.string(),
  field: z.string().nullable().catch(null),
  detail: z.string(),
});

export const insightDetailSchema = z.object({
  post: z.object({
    id: z.string().uuid(),
    publication_status: status,
    published_at: nullableString,
    publication_date: nullableString,
    topic: nullableString,
    related_service_id: z.string().uuid().nullable().catch(null),
    related_service_name: nullableString,
    featured: z.boolean().catch(false),
    pinned: z.boolean().catch(false),
    sort_priority: z.number().int().catch(0),
    hero_asset_id: z.string().uuid().nullable().catch(null),
    is_time_sensitive: z.boolean().catch(false),
    reviewed_at: nullableString,
    reviewed_by: nullableString,
    created_at: z.string(),
    updated_at: z.string(),
    version: z.number().int(),
    has_draft_changes: z.boolean().catch(false),
  }),
  localization: z.object({
    locale: z.string(),
    slug: z.string(),
    title: z.string(),
    excerpt: nullableString,
    body_blocks: contentBlocksSchema.catch([]),
    seo_title: nullableString,
    seo_description: nullableString,
    version: z.number().int(),
  }),
  readiness: z.object({
    ready: z.boolean().catch(false),
    reasons: z.array(readinessReasonSchema).catch([]),
  }),
  services: z.array(z.object({ id: z.string().uuid(), name: z.string() })).catch([]),
});
export type InsightDetail = z.infer<typeof insightDetailSchema>;

export async function loadInsightList(query: string, statusFilter: string): Promise<InsightList> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_posts", {
    ...(query ? { search_query: query } : {}),
    ...(statusFilter === "draft" || statusFilter === "published" || statusFilter === "archived"
      ? { status_filter: statusFilter }
      : {}),
  });
  if (error) throw new Error("Insights could not be loaded.");
  const parsed = insightListSchema.safeParse(data);
  return parsed.success
    ? parsed.data
    : { counts: { draft: 0, published: 0, archived: 0 }, items: [] };
}

export async function loadInsightDetail(postId: string): Promise<InsightDetail | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_post", { target_id: postId });
  if (error) throw new Error("The insight could not be loaded.");
  if (data === null) return null;
  const parsed = insightDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
