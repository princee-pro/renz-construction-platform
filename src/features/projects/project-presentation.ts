import "server-only";

import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const projectPresentationSchema = z.object({
  evidence_class: z
    .enum(["real_project", "concept_study", "context_study", "experience_study"])
    .catch("real_project"),
  layout_hint: z
    .enum(["auto", "monument", "portrait", "landscape", "technical", "strip", "wide"])
    .catch("auto"),
  home_featured: z.boolean().catch(false),
  materials: z.string().nullable().catch(null),
  tags: z.array(z.string()).catch([]),
  version: z.number().int(),
  has_draft_changes: z.boolean().catch(false),
});
export type ProjectPresentation = z.infer<typeof projectPresentationSchema>;

/** CR1 website placement fields for a project. */
export async function loadProjectPresentation(
  projectId: string,
): Promise<ProjectPresentation | null> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_get_project_presentation", {
    target_id: projectId,
  });
  if (error || data === null) return null;
  const parsed = projectPresentationSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
