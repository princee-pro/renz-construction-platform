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
  assignmentAdjustInput,
  assignmentCreateInput,
  assignmentEditInput,
  assignmentRateInput,
  assignmentStatusInput,
  contractorPaymentInput,
  contractorReverseInput,
  zodFieldErrors,
} from "@/features/assignments/assignment-contract";
import { loadProjectList } from "@/features/operational-projects/project-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateAssignment(assignmentId?: string, projectId?: string, partnerId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/finance/contractor-payables");
  revalidatePath("/admin/operations/contractors");
  if (assignmentId) revalidatePath(`/admin/operations/assignments/${assignmentId}`);
  if (projectId) revalidatePath(`/admin/operations/projects/${projectId}`);
  if (partnerId) revalidatePath(`/admin/operations/contractors/${partnerId}`);
}

function conflictOrError(data: unknown): AdminActionState {
  return actionState(
    commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
    commandReason(data),
    { currentVersion: commandVersion(data, "current_version") },
  );
}

export async function createAssignmentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.assign");
  if (denied) return denied;
  const parsed = assignmentCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before assigning.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_contractor_assignment", {
    target_project_id: input.projectId,
    target_partner_id: input.partnerId,
    target_scope: input.scope,
    target_status: input.status,
    ...(input.specialization ? { target_specialization: input.specialization } : {}),
    ...(input.startDate ? { target_start_date: input.startDate } : {}),
    ...(input.endDate ? { target_end_date: input.endDate } : {}),
    ...(input.rateType ? { target_rate_type: input.rateType } : {}),
    ...(input.rateAmount ? { target_rate_amount: Number(input.rateAmount) } : {}),
    ...(input.currency ? { target_currency: input.currency } : {}),
    ...(input.plannedUnits ? { target_planned_units: Number(input.plannedUnits) } : {}),
    ...(input.agreedAmount ? { target_agreed_amount: Number(input.agreedAmount) } : {}),
    ...(input.paymentTerms ? { target_payment_terms: input.paymentTerms } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors:
        commandReasonCode(data) === "capability_missing" ? { partnerId: commandReason(data) } : {},
    });
  }
  const createdId = commandId(data);
  revalidateAssignment(createdId ?? undefined, input.projectId, input.partnerId);
  return actionState("success", "Contractor assigned.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updateAssignmentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.assign");
  if (denied) return denied;
  const parsed = assignmentEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_contractor_assignment", {
    target_id: input.assignmentId,
    expected_version: input.expectedVersion,
    target_scope: input.scope,
    ...(input.specialization ? { target_specialization: input.specialization } : {}),
    ...(input.startDate ? { target_start_date: input.startDate } : {}),
    ...(input.endDate ? { target_end_date: input.endDate } : {}),
    ...(input.rateType ? { target_rate_type: input.rateType } : {}),
    ...(input.rateAmount ? { target_rate_amount: Number(input.rateAmount) } : {}),
    ...(input.currency ? { target_currency: input.currency } : {}),
    ...(input.plannedUnits ? { target_planned_units: Number(input.plannedUnits) } : {}),
    ...(input.agreedAmount ? { target_agreed_amount: Number(input.agreedAmount) } : {}),
    ...(input.paymentTerms ? { target_payment_terms: input.paymentTerms } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAssignment(input.assignmentId);
  return actionState("success", "Assignment saved.", { currentVersion: commandVersion(data) });
}

export async function changeAssignmentStatusAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.assign");
  if (denied) return denied;
  const parsed = assignmentStatusInput(formData);
  if (!parsed.success) return actionState("error", "Choose a valid status.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_contractor_assignment_status", {
    target_id: parsed.data.assignmentId,
    expected_version: parsed.data.expectedVersion,
    next_status: parsed.data.nextStatus,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAssignment(parsed.data.assignmentId);
  return actionState("success", "Status updated.", { currentVersion: commandVersion(data) });
}

export async function adjustAssignmentAmountAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.assign");
  if (denied) return denied;
  const parsed = assignmentAdjustInput(formData);
  if (!parsed.success) {
    return actionState("error", "Enter the new agreed amount and a reason.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("adjust_contractor_assignment_amount", {
    target_id: parsed.data.assignmentId,
    expected_version: parsed.data.expectedVersion,
    new_amount: Number(parsed.data.newAmount),
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAssignment(parsed.data.assignmentId);
  return actionState("success", "Agreed amount adjusted.", {
    currentVersion: commandVersion(data),
  });
}

export async function rateAssignmentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.assign");
  if (denied) return denied;
  const parsed = assignmentRateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Choose a rating from 1 to 5.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("rate_contractor_assignment", {
    target_id: parsed.data.assignmentId,
    expected_version: parsed.data.expectedVersion,
    rating: parsed.data.rating,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateAssignment(parsed.data.assignmentId);
  return actionState("success", "Performance review saved.", {
    currentVersion: commandVersion(data),
  });
}

export async function recordContractorPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.payments.write");
  if (denied) return denied;
  const parsed = contractorPaymentInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before recording this payment.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("record_contractor_payment", {
    target_assignment_id: input.assignmentId,
    amount: Number(input.amount),
    target_payment_date: input.paymentDate,
    target_method: input.paymentMethod,
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors:
        commandReasonCode(data) === "exceeds_remaining" ? { amount: commandReason(data) } : {},
    });
  }
  revalidateAssignment(input.assignmentId);
  return actionState("success", "Payment recorded.", { currentVersion: commandVersion(data) });
}

export async function reverseContractorPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("contractors.payments.write");
  if (denied) return denied;
  const parsed = contractorReverseInput(formData);
  if (!parsed.success) {
    return actionState("error", "A reversal reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("reverse_contractor_payment", {
    target_payment_id: parsed.data.paymentId,
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateAssignment(commandId(data) ?? undefined);
  return actionState("success", "Payment reversed.", { currentVersion: commandVersion(data) });
}

export type ProjectPickerEntry = Readonly<{ id: string; title: string; client: string }>;

/** Active operational projects for the "assign from contractor" entry point. */
export async function searchActiveProjectsAction(
  query: string,
): Promise<readonly ProjectPickerEntry[]> {
  const denied = await authorize("contractors.assign");
  if (denied) return [];
  try {
    const result = await loadProjectList({
      search: query.trim().slice(0, 100),
      clientId: "",
      status: "",
      phase: "",
      priority: "",
      statusScope: "active",
      caseStudy: "",
      cursorUpdatedAt: "",
      cursorId: "",
    });
    return result.items.map((item) => ({
      id: item.id,
      title: item.title,
      client: item.client.full_name,
    }));
  } catch {
    return [];
  }
}
