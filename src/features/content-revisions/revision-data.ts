import "server-only";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const contentRevisionsSchema = z.object({
  has_draft_changes: z.boolean().catch(false),
  revisions: z
    .array(
      z.object({
        id: z.string().uuid(),
        revision_no: z.number().int(),
        kind: z.enum(["published", "restore_point"]),
        summary: z.string().nullable().catch(null),
        created_at: z.string(),
        created_by: z.string().nullable().catch(null),
        is_current: z.boolean().catch(false),
      }),
    )
    .catch([]),
});
export type ContentRevisions = z.infer<typeof contentRevisionsSchema>;
export type RevisionContentType = "service" | "project" | "post";

export async function loadContentRevisions(
  contentType: RevisionContentType,
  targetId: string,
): Promise<ContentRevisions> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_list_content_revisions", {
    content_type: contentType,
    target_id: targetId,
  });
  if (error) return { has_draft_changes: false, revisions: [] };
  const parsed = contentRevisionsSchema.safeParse(data);
  return parsed.success ? parsed.data : { has_draft_changes: false, revisions: [] };
}
