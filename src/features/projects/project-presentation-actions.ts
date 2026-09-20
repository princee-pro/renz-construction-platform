"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionState,
  authorize,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { formNumber, formText, type AdminActionState } from "@/features/admin-shared/action-state";
import type { Json } from "@/lib/database/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const evidenceClasses = ["real_project", "concept_study", "experience_study"] as const;
const layoutHints = [
  "auto",
  "monument",
  "portrait",
  "landscape",
  "technical",
  "strip",
  "wide",
] as const;

/** CR1: evidence class, auto-layout hint, Home feature, materials and tags for a project. */
export async function saveProjectPlacementAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const projectId = formText(formData, "projectId");
  if (!z.string().uuid().safeParse(projectId).success)
    return actionState("error", "Project not found.");
  const evidenceClass = formText(formData, "evidenceClass");
  const layoutHint = formText(formData, "layoutHint") || "auto";
  const materials = formText(formData, "materials").trim();
  const tags = formText(formData, "tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 12);
  if (!(evidenceClasses as readonly string[]).includes(evidenceClass)) {
    return actionState("error", "Choose whether this is a real RENZ project or a study.", {
      fieldErrors: { evidenceClass: "Choose a classification." },
    });
  }
  if (!(layoutHints as readonly string[]).includes(layoutHint)) {
    return actionState("error", "Choose a layout hint.", {
      fieldErrors: { layoutHint: "Choose a layout hint." },
    });
  }
  if (
    /[<>]/u.test(materials + tags.join("")) ||
    materials.length > 300 ||
    tags.some((tag) => tag.length > 40)
  ) {
    return actionState("error", "Materials (300) and tags (40 each) are plain text.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_project_presentation", {
    target_id: projectId,
    expected_version: formNumber(formData, "expectedVersion"),
    target_evidence_class: evidenceClass,
    target_layout_hint: layoutHint,
    target_home_featured: formText(formData, "homeFeatured") === "on",
    target_materials: (materials || null) as unknown as string,
    target_tags: tags as unknown as Json,
  });
  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    if (code === "version_conflict") {
      return actionState(
        "conflict",
        "This project was saved again in the meantime (for example with Save draft). Your choices are kept — press Save placement once more.",
        { currentVersion: commandVersion(data, "current_version") },
      );
    }
    return actionState("error", commandReason(data));
  }
  revalidatePath(`/admin/content/projects/${projectId}`);
  return actionState(
    "success",
    "Website placement saved. Publish (or publish changes) to update the website.",
    {
      currentVersion: commandVersion(data),
    },
  );
}
