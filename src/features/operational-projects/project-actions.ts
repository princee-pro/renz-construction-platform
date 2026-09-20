"use server";

import { revalidatePath } from "next/cache";

import {
  actionState,
  authorize,
  commandId,
  commandReason,
  commandReasonCode,
  commandSucceeded,
  commandVersion,
} from "@/features/admin-shared/action-helpers";
import { type AdminActionState } from "@/features/admin-shared/action-state";
import {
  caseStudyDraftFromProjectInput,
  caseStudyLinkInput,
  caseStudyUnlinkInput,
  projectArchiveInput,
  projectCreateInput,
  projectEditInput,
  projectNoteCreateInput,
  projectPhaseChangeInput,
  projectPriorityChangeInput,
  projectStatusChangeInput,
  zodFieldErrors,
  type QuickFindResult,
} from "@/features/operational-projects/project-contract";
import { quickFind } from "@/features/operational-projects/project-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateProjects(projectId?: string, clientId?: string): void {
  revalidatePath("/admin/operations/projects");
  revalidatePath("/admin");
  if (projectId) revalidatePath(`/admin/operations/projects/${projectId}`);
  if (clientId) revalidatePath(`/admin/operations/clients/${clientId}`);
}

export async function createProjectAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating this project.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_operational_project", {
    target_client_id: input.clientId,
    title: input.title,
    description: input.description ?? "",
    target_status: input.status,
    target_phase: input.phase,
    target_priority: input.priority,
    target_start_date: input.startDate as unknown as string,
    target_end_date: input.endDate as unknown as string,
    target_budget_amount: input.budgetAmount as unknown as number,
    target_budget_currency: input.budgetCurrency as unknown as string,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data));
  }
  const createdId = commandId(data);
  revalidateProjects(createdId ?? undefined, input.clientId);
  return actionState("success", "Project created.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updateProjectAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_operational_project", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    target_title: input.title,
    target_description: input.description ?? "",
    target_start_date: input.startDate as unknown as string,
    target_end_date: input.endDate as unknown as string,
    target_budget_amount: input.budgetAmount as unknown as number,
    target_budget_currency: input.budgetCurrency as unknown as string,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Project updated.", { currentVersion: commandVersion(data) });
}

export async function changeProjectStatusAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectStatusChangeInput(formData);
  if (!parsed.success) return actionState("error", "The status reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_operational_project_status", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    next_status: input.nextStatus,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Status updated.", { currentVersion: commandVersion(data) });
}

export async function changeProjectPhaseAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectPhaseChangeInput(formData);
  if (!parsed.success) return actionState("error", "The phase reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_operational_project_phase", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    next_phase: input.nextPhase,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Phase updated.", { currentVersion: commandVersion(data) });
}

export async function changeProjectPriorityAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectPriorityChangeInput(formData);
  if (!parsed.success) return actionState("error", "The priority reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_operational_project_priority", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    next_priority: input.nextPriority,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Priority updated.", { currentVersion: commandVersion(data) });
}

export async function archiveProjectAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectArchiveInput(formData);
  if (!parsed.success) return actionState("error", "The project reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_admin_operational_project", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Project archived.", { currentVersion: commandVersion(data) });
}

export async function createProjectNoteAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = projectNoteCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Enter a note before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_operational_project_note", {
    target_project_id: input.projectId,
    body: input.body,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data));
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Note added.");
}

export async function linkCaseStudyAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = caseStudyLinkInput(formData);
  if (!parsed.success) return actionState("error", "The case study reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("link_operational_project_case_study", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    target_case_study_id: input.caseStudyId,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Case study linked.", { currentVersion: commandVersion(data) });
}

export async function unlinkCaseStudyAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = caseStudyUnlinkInput(formData);
  if (!parsed.success) return actionState("error", "The project reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("unlink_operational_project_case_study", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  return actionState("success", "Case study unlinked.", { currentVersion: commandVersion(data) });
}

export async function createCaseStudyDraftFromProjectAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("operations.projects.write");
  if (denied) return denied;
  const parsed = caseStudyDraftFromProjectInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating a draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_case_study_draft_from_operational_project", {
    target_id: input.projectId,
    expected_version: input.expectedVersion,
    target_locale: input.locale,
    target_slug: input.slug,
    target_title: input.title,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateProjects(input.projectId);
  revalidatePath("/admin/content/projects");
  return actionState("success", "Draft case study created and linked.", {
    currentVersion: commandVersion(data),
  });
}

export async function quickFindAction(query: string): Promise<QuickFindResult> {
  if (query.trim().length < 2) return [];
  return quickFind(query);
}
