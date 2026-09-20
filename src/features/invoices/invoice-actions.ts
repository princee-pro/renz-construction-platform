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
  invoiceCreateInput,
  invoiceEditInput,
  invoiceIssueInput,
  invoiceRefInput,
  invoiceVoidInput,
  paymentRecordInput,
  paymentReverseInput,
  zodFieldErrors,
} from "@/features/invoices/invoice-contract";
import { loadProjectList } from "@/features/operational-projects/project-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateInvoice(invoiceId?: string, clientId?: string, projectId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/invoices");
  if (invoiceId) revalidatePath(`/admin/finance/invoices/${invoiceId}`);
  if (clientId) revalidatePath(`/admin/operations/clients/${clientId}`);
  if (projectId) revalidatePath(`/admin/operations/projects/${projectId}`);
}

function conflictOrError(data: unknown): AdminActionState {
  return actionState(
    commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
    commandReason(data),
    { currentVersion: commandVersion(data, "current_version") },
  );
}

export async function createInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving this draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_invoice", {
    target_client_id: input.clientId,
    target_currency: input.currency,
    target_tax_rate: Number(input.taxRate),
    lines: input.lines,
    ...(input.projectId ? { target_project_id: input.projectId } : {}),
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
    ...(input.paymentTerms ? { target_payment_terms: input.paymentTerms } : {}),
    ...(input.issueDate ? { target_issue_date: input.issueDate } : {}),
    ...(input.dueDate ? { target_due_date: input.dueDate } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), { fieldErrors: {} });
  }
  const createdId = commandId(data);
  revalidateInvoice(createdId ?? undefined, input.clientId, input.projectId ?? undefined);
  return actionState("success", "Draft saved.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updateInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_invoice", {
    target_id: input.invoiceId,
    expected_version: input.expectedVersion,
    target_client_id: input.clientId,
    target_currency: input.currency,
    target_tax_rate: Number(input.taxRate),
    lines: input.lines,
    ...(input.projectId ? { target_project_id: input.projectId } : {}),
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
    ...(input.paymentTerms ? { target_payment_terms: input.paymentTerms } : {}),
    ...(input.issueDate ? { target_issue_date: input.issueDate } : {}),
    ...(input.dueDate ? { target_due_date: input.dueDate } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateInvoice(input.invoiceId, input.clientId, input.projectId ?? undefined);
  return actionState("success", "Draft saved.", { currentVersion: commandVersion(data) });
}

export async function issueInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.issue");
  if (denied) return denied;
  const parsed = invoiceIssueInput(formData);
  if (!parsed.success) {
    return actionState("error", "Choose an issue date and a due date before issuing.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("issue_admin_invoice", {
    target_id: input.invoiceId,
    expected_version: input.expectedVersion,
    target_issue_date: input.issueDate,
    target_due_date: input.dueDate,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateInvoice(input.invoiceId);
  return actionState("success", "Invoice issued.", { currentVersion: commandVersion(data) });
}

export async function voidInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.void");
  if (denied) return denied;
  const parsed = invoiceVoidInput(formData);
  if (!parsed.success) {
    return actionState("error", "A void reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("void_admin_invoice", {
    target_id: input.invoiceId,
    expected_version: input.expectedVersion,
    reason: input.reason,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateInvoice(input.invoiceId);
  return actionState("success", "Invoice voided.", { currentVersion: commandVersion(data) });
}

export async function archiveInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceRefInput(formData);
  if (!parsed.success) return actionState("error", "The invoice reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_admin_invoice", {
    target_id: input.invoiceId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateInvoice(input.invoiceId);
  return actionState("success", "Draft archived.", { currentVersion: commandVersion(data) });
}

export async function duplicateInvoiceAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceRefInput(formData);
  if (!parsed.success) return actionState("error", "The invoice reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("duplicate_admin_invoice", {
    target_id: parsed.data.invoiceId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const createdId = commandId(data);
  revalidateInvoice(createdId ?? undefined);
  return actionState("success", "New draft created from this invoice.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function recordPaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.payments.write");
  if (denied) return denied;
  const parsed = paymentRecordInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before recording this payment.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("record_invoice_payment", {
    target_invoice_id: input.invoiceId,
    amount: Number(input.amount),
    target_payment_date: input.paymentDate,
    target_method: input.paymentMethod,
    ...(input.reference ? { target_reference: input.reference } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), {
      fieldErrors:
        commandReasonCode(data) === "exceeds_balance" ? { amount: commandReason(data) } : {},
    });
  }
  revalidateInvoice(input.invoiceId);
  return actionState("success", "Payment recorded.", { currentVersion: commandVersion(data) });
}

export async function reversePaymentAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.payments.write");
  if (denied) return denied;
  const parsed = paymentReverseInput(formData);
  if (!parsed.success) {
    return actionState("error", "A reversal reason is required.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("reverse_invoice_payment", {
    target_payment_id: parsed.data.paymentId,
    reason: parsed.data.reason,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateInvoice(commandId(data) ?? undefined);
  return actionState("success", "Payment reversed.", { currentVersion: commandVersion(data) });
}

/** Returns the raw token exactly once via the action state message channel. */
export async function createShareLinkAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceRefInput(formData);
  if (!parsed.success) return actionState("error", "The invoice reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_invoice_share_link", {
    target_id: parsed.data.invoiceId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const rawToken =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)["token"]
      : null;
  const token = typeof rawToken === "string" ? rawToken : null;
  revalidateInvoice(parsed.data.invoiceId);
  return actionState("success", "Client link generated.", {
    currentVersion: commandVersion(data),
    detail: token,
  });
}

export async function revokeShareLinkAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return denied;
  const parsed = invoiceRefInput(formData);
  if (!parsed.success) return actionState("error", "The invoice reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("revoke_invoice_share_link", {
    target_id: parsed.data.invoiceId,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateInvoice(parsed.data.invoiceId);
  return actionState("success", "Client link revoked.", { currentVersion: commandVersion(data) });
}

export type ProjectPickerEntry = Readonly<{ id: string; title: string; status: string }>;

/** Active operational projects of one client, for the invoice editor's project select. */
export async function listClientProjectsAction(
  clientId: string,
): Promise<readonly ProjectPickerEntry[]> {
  const denied = await authorize("finance.invoices.write");
  if (denied) return [];
  if (!/^[0-9a-f-]{36}$/iu.test(clientId)) return [];
  try {
    const result = await loadProjectList({
      search: "",
      clientId,
      status: "",
      phase: "",
      priority: "",
      statusScope: "active",
      caseStudy: "",
      cursorUpdatedAt: "",
      cursorId: "",
    });
    return result.items.map((item) => ({ id: item.id, title: item.title, status: item.status }));
  } catch {
    return [];
  }
}
