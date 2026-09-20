"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  evidenceCommandInput,
  mediaAttachInput,
  mediaPromoteInput,
  mediaRemoveInput,
  mediaUpdateInput,
  projectCreateInput,
  projectEditorInput,
  projectEvidenceInput,
  projectReviewInput,
  publicationActionInput,
  stageCreateInput,
  stageDeleteInput,
  stageEditInput,
  type ProjectActionState,
  zodFieldErrors,
} from "@/features/projects/project-contract";
import { authorizeServerAction, type ActionAuthorization } from "@/lib/auth/access";
import type { AdminPermission } from "@/lib/auth/permissions";
import { archiveContent, publishContent, unpublishContent } from "@/lib/content/operations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CommandObject = Readonly<Record<string, unknown>>;

function commandObject(value: unknown): CommandObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as CommandObject)
    : null;
}

function commandSucceeded(value: unknown): boolean {
  return commandObject(value)?.["ok"] === true;
}

function commandVersion(value: unknown, key = "version"): number | null {
  const candidate = commandObject(value)?.[key];
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0
    ? candidate
    : null;
}

function commandReason(value: unknown): string {
  const reasons = commandObject(value)?.["reasons"];
  if (!Array.isArray(reasons)) return "The operation could not be completed.";
  const first = commandObject(reasons[0]);
  const detail = first?.["detail"];
  return typeof detail === "string" && detail.length <= 240
    ? detail
    : "The operation could not be completed.";
}

function commandReasonCode(value: unknown): string {
  const reasons = commandObject(value)?.["reasons"];
  if (!Array.isArray(reasons)) return "operation_failed";
  const first = commandObject(reasons[0]);
  const code = first?.["code"];
  return typeof code === "string" && /^[a-z0-9_]{1,80}$/u.test(code) ? code : "operation_failed";
}

function actionState(
  status: ProjectActionState["status"],
  message: string,
  options: Readonly<{
    fieldErrors?: Readonly<Record<string, string>>;
    projectVersion?: number | null;
    localizationVersion?: number | null;
    reauthHref?: string | null;
  }> = {},
): ProjectActionState {
  return {
    status,
    message,
    fieldErrors: options.fieldErrors ?? {},
    projectVersion: options.projectVersion ?? null,
    localizationVersion: options.localizationVersion ?? null,
    reauthHref: options.reauthHref ?? null,
  };
}

function authorizationFailure(authorization: Exclude<ActionAuthorization, { ok: true }>) {
  if (authorization.reason === "forbidden") {
    return actionState(
      "error",
      "Your current role does not allow this operation. No changes were made.",
    );
  }
  if (authorization.reason === "disabled") {
    return actionState(
      "reauth",
      "This staff account is no longer active. Your entered values remain on this page.",
      { reauthHref: authorization.reauthHref },
    );
  }
  if (authorization.reason === "mfa_required") {
    return actionState(
      "reauth",
      "MFA verification is required before this operation. Your entered values remain on this page.",
      { reauthHref: authorization.reauthHref },
    );
  }
  return actionState(
    "reauth",
    "Your secure session is unavailable. Sign in again; the values on this page have not been cleared.",
    { reauthHref: authorization.reauthHref },
  );
}

async function authorize(permission: AdminPermission): Promise<ProjectActionState | null> {
  const authorization = await authorizeServerAction(permission);
  return authorization.ok ? null : authorizationFailure(authorization);
}

async function recordRejectedOperation(
  action: string,
  projectId: string,
  reason: string,
): Promise<void> {
  const client = await createServerSupabaseClient();
  await client.rpc("record_audit_event", {
    event_action: action,
    event_entity_type: "project",
    event_entity_id: projectId,
    event_outcome: "rejected",
    event_metadata: { reason },
  });
}

function revalidateProject(projectId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/content/projects");
  revalidatePath(`/admin/content/projects/${projectId}`);
  revalidatePath(`/admin/content/projects/${projectId}/preview`);
  revalidatePath("/projects");
}

export async function createProjectAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;

  const parsed = projectCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating the draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_project_draft", {
    target_locale: parsed.data.locale,
    target_slug: parsed.data.slug,
    target_title: parsed.data.title,
  });
  const id = commandObject(data)?.["id"];
  if (error || !commandSucceeded(data) || typeof id !== "string") {
    const duplicate = error?.code === "23505";
    return actionState(
      "error",
      duplicate
        ? "That locale and slug are already in use. Choose a different slug."
        : "The project draft could not be created. Your values remain available.",
      { fieldErrors: duplicate ? { slug: "This locale and slug must be unique." } : {} },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content/projects");
  redirect(`/admin/content/projects/${id}?locale=${encodeURIComponent(parsed.data.locale)}`);
}

export async function saveProjectAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;

  const parsed = projectEditorInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_project_draft", {
    target_id: input.projectId,
    expected_version: input.projectVersion,
    expected_localization_version: input.localizationVersion,
    target_locale: input.locale,
    target_slug: input.slug,
    target_title: input.title,
    target_summary: input.summary ?? "",
    target_challenge: input.challenge ?? "",
    target_approach: input.approach ?? "",
    target_solution: input.solution ?? "",
    target_outcomes: input.outcomes ?? "",
    target_seo_title: input.seoTitle ?? "",
    target_seo_description: input.seoDescription ?? "",
    // These columns are nullable in Postgres; the generated RPC arg types omit
    // `| null` even though the function body accepts and expects it.
    target_public_location: input.publicLocation as unknown as string,
    target_public_location_granularity: input.publicLocationGranularity as unknown as string,
    target_project_type: input.projectType as unknown as string,
    target_project_scope: input.projectScope as unknown as string,
    target_renz_role: input.renzRole as unknown as string,
    target_delivery_status: input.deliveryStatus as unknown as string,
    target_start_year: input.startYear as unknown as number,
    target_completion_year: input.completionYear as unknown as number,
    target_sort_order: input.sortOrder,
    target_featured: input.featured,
    target_hero_asset_id: input.heroAssetId as unknown as string,
  });

  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    await recordRejectedOperation("project.update", input.projectId, code);
    if (code === "version_conflict") {
      return actionState(
        "conflict",
        "A newer version was saved by another editor. Your values are preserved; reload the authoritative version before making a new save.",
        {
          projectVersion: commandVersion(data, "current_version"),
          localizationVersion: commandVersion(data, "current_localization_version"),
        },
      );
    }
    const duplicate = error?.code === "23505";
    return actionState(
      "error",
      duplicate
        ? "That locale and slug are already in use. Your other edits were preserved."
        : commandReason(data),
      { fieldErrors: duplicate ? { slug: "This locale and slug must be unique." } : {} },
    );
  }

  revalidateProject(input.projectId);
  return actionState("success", "Draft saved.", {
    projectVersion: commandVersion(data),
    localizationVersion: commandVersion(data, "localization_version"),
  });
}

export async function markProjectReviewedAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("claims.verify");
  if (denied) return denied;
  const parsed = projectReviewInput(formData);
  if (!parsed.success) return actionState("error", "The review command is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("mark_project_factually_reviewed", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation(
      "project.mark_reviewed",
      input.projectId,
      commandReasonCode(data),
    );
    return actionState("error", commandReason(data));
  }
  revalidateProject(input.projectId);
  return actionState("success", "Project marked as factually reviewed.", {
    projectVersion: commandVersion(data),
  });
}

export async function createEvidenceAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = projectEvidenceInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the evidence fields before registering it.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_project_evidence", {
    target_project_id: input.projectId,
    fact_claim: input.factClaim,
    source_type: input.sourceType,
    source_reference: input.sourceReference,
    sensitivity: input.sensitivity,
    consent_required: input.consentRequired,
    required: input.required,
    ...(input.purpose === null ? {} : { purpose: input.purpose }),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", "Evidence could not be registered. Your values remain available.");
  }
  revalidateProject(input.projectId);
  return actionState("success", "Evidence registered as Unverified.");
}

export async function submitEvidenceAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = evidenceCommandInput(formData);
  if (!parsed.success) return actionState("error", "The evidence reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("submit_project_evidence_for_review", {
    target_project_id: input.projectId,
    target_evidence_id: input.evidenceId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation(
      "evidence.submit_review",
      input.projectId,
      commandReasonCode(data),
    );
    return actionState("error", commandReason(data));
  }
  revalidateProject(input.projectId);
  return actionState("success", "Evidence submitted for review.");
}

export async function reviewEvidenceAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("claims.verify");
  if (denied) return denied;
  const parsed = evidenceCommandInput(formData);
  if (!parsed.success) return actionState("error", "The evidence reference is invalid.");
  const decision = formData.get("decision");
  if (decision !== "verified" && decision !== "rejected") {
    return actionState("error", "Choose a valid evidence decision.");
  }
  const consentState = formData.get("consentState");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("review_project_evidence", {
    target_project_id: input.projectId,
    target_evidence_id: input.evidenceId,
    expected_version: input.expectedVersion,
    next_state: decision,
    ...(consentState === "granted" ? { next_consent_state: "granted" } : {}),
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation("evidence.review", input.projectId, commandReasonCode(data));
    return actionState("error", commandReason(data));
  }
  revalidateProject(input.projectId);
  return actionState(
    "success",
    decision === "verified" ? "Evidence verified." : "Evidence rejected.",
  );
}

export async function changeProjectPublicationAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = publicationActionInput(formData);
  if (!parsed.success) return actionState("error", "The publication command is invalid.");
  const input = parsed.data;
  const permission: AdminPermission =
    input.operation === "archive" ? "content.archive" : "content.publish";
  const denied = await authorize(permission);
  if (denied) return denied;

  let result: unknown;
  try {
    const command = {
      contentType: "project" as const,
      targetId: input.projectId,
      expectedVersion: input.expectedVersion,
    };
    result =
      input.operation === "publish"
        ? await publishContent(command, undefined, { cachePolicy: "read-your-own-writes" })
        : input.operation === "unpublish"
          ? await unpublishContent(command, undefined, { cachePolicy: "read-your-own-writes" })
          : await archiveContent(command, undefined, { cachePolicy: "read-your-own-writes" });
  } catch {
    return actionState(
      "error",
      "The publication operation is temporarily unavailable. No state change was assumed.",
    );
  }

  if (!commandSucceeded(result)) {
    const code = commandReasonCode(result);
    await recordRejectedOperation(`content.${input.operation}`, input.projectId, code);
    const status = code === "version_conflict" ? "conflict" : "error";
    return actionState(status, commandReason(result), {
      projectVersion: commandVersion(result, "current_version"),
    });
  }
  revalidateProject(input.projectId);
  const verb =
    input.operation === "publish"
      ? "published"
      : input.operation === "unpublish"
        ? "returned to Draft"
        : "archived";
  return actionState("success", `Project ${verb}.`, { projectVersion: commandVersion(result) });
}

export async function setProjectServicesAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const projectIdField = formData.get("projectId");
  const projectId = typeof projectIdField === "string" ? projectIdField : "";
  const expectedVersion = Number(formData.get("expectedVersion"));
  const servicesField = formData.get("services");
  const raw = typeof servicesField === "string" ? servicesField : "[]";
  let services: unknown;
  try {
    services = JSON.parse(raw);
  } catch {
    return actionState("error", "The service relationships payload is invalid.");
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("set_admin_project_services", {
    target_project_id: projectId,
    expected_version: expectedVersion,
    target_services: services as never,
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation("project.set_services", projectId, commandReasonCode(data));
    const code = commandReasonCode(data);
    return actionState(code === "version_conflict" ? "conflict" : "error", commandReason(data), {
      projectVersion: commandVersion(data, "current_version"),
    });
  }
  revalidateProject(projectId);
  return actionState("success", "Related services updated.", {
    projectVersion: commandVersion(data),
  });
}

export async function createStageAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = stageCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the story chapter fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_project_stage", {
    target_project_id: input.projectId,
    expected_version: input.expectedVersion,
    target_title: input.title,
    target_description: input.description ?? "",
    target_sort_order: input.sortOrder,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { projectVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProject(input.projectId);
  return actionState("success", "Story chapter added.", {
    projectVersion: commandVersion(data, "project_version"),
  });
}

export async function updateStageAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = stageEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the story chapter fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_project_stage", {
    target_id: input.stageId,
    target_project_id: input.projectId,
    expected_stage_version: input.expectedStageVersion,
    target_title: input.title,
    target_description: input.description ?? "",
    target_sort_order: input.sortOrder,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
    );
  }
  revalidateProject(input.projectId);
  return actionState("success", "Story chapter updated.");
}

export async function deleteStageAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = stageDeleteInput(formData);
  if (!parsed.success) return actionState("error", "The story chapter reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("delete_admin_project_stage", {
    target_id: input.stageId,
    target_project_id: input.projectId,
    expected_stage_version: input.expectedStageVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data));
  }
  revalidateProject(input.projectId);
  return actionState("success", "Story chapter removed.");
}

export async function attachMediaAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = mediaAttachInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the media fields before attaching it.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_attach_project_media", {
    target_project_id: input.projectId,
    expected_version: input.expectedVersion,
    target_media_asset_id: input.mediaAssetId,
    target_role: input.role,
    target_phase: input.phase ?? "",
    target_stage_id: input.stageId as unknown as string,
    target_decorative: input.decorative,
    target_credit: input.credit ?? "",
    target_alt_text: input.altText ?? "",
    target_caption: input.caption ?? "",
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { projectVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProject(input.projectId);
  return actionState("success", "Media attached to project.", {
    projectVersion: commandVersion(data, "project_version"),
  });
}

export async function updateMediaAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = mediaUpdateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the media fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_update_project_media", {
    target_id: input.projectMediaId,
    target_project_id: input.projectId,
    expected_media_version: input.expectedMediaVersion,
    target_role: input.role,
    target_phase: input.phase ?? "",
    target_stage_id: input.stageId as unknown as string,
    target_decorative: input.decorative,
    target_credit: input.credit ?? "",
    target_alt_text: input.altText ?? "",
    target_caption: input.caption ?? "",
    expected_localization_version: input.expectedLocalizationVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
    );
  }
  revalidateProject(input.projectId);
  return actionState("success", "Media details saved.");
}

export async function removeMediaAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = mediaRemoveInput(formData);
  if (!parsed.success) return actionState("error", "The media reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_remove_project_media", {
    target_id: input.projectMediaId,
    target_project_id: input.projectId,
    expected_media_version: input.expectedMediaVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data));
  }
  revalidateProject(input.projectId);
  return actionState("success", "Media removed from project.");
}

export async function promoteMediaAction(
  _previousState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const denied = await authorize("media.manage");
  if (denied) return denied;
  const parsed = mediaPromoteInput(formData);
  if (!parsed.success) return actionState("error", "The media reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_clear_and_promote_project_media", {
    target_project_media_id: input.projectMediaId,
    expected_media_version: input.expectedMediaVersion,
    target_rights_holder: input.rightsHolder ?? "",
    target_rights_source: input.rightsSource ?? "",
    target_credit: input.credit ?? "",
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
    );
  }
  revalidateProject(input.projectId);
  return actionState("success", "Rights cleared. Media is eligible for public use.");
}

export async function reorderMediaAction(
  projectId: string,
  orderedIds: readonly string[],
): Promise<boolean> {
  const authorization = await authorizeServerAction("content.write");
  if (!authorization.ok) return false;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("admin_reorder_project_media", {
    target_project_id: projectId,
    ordered_ids: orderedIds as unknown as string[],
  });
  if (error || !commandSucceeded(data)) return false;
  revalidateProject(projectId);
  return true;
}
