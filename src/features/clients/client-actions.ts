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
  clientArchiveInput,
  clientCreateInput,
  clientEditInput,
  clientNoteCreateInput,
  zodFieldErrors,
  type ClientPickerEntry,
  type DuplicateClient,
} from "@/features/clients/client-contract";
import { findDuplicateClients, loadActiveClientsForPicker } from "@/features/clients/client-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidateClients(clientId?: string): void {
  revalidatePath("/admin/operations/clients");
  revalidatePath("/admin");
  if (clientId) revalidatePath(`/admin/operations/clients/${clientId}`);
}

export async function createClientAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("clients.write");
  if (denied) return denied;
  const parsed = clientCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating this client.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_client", {
    full_name: input.fullName,
    target_tier: input.clientTier,
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.address ? { target_address: input.address } : {}),
    ...(input.company ? { target_company: input.company } : {}),
    ...(input.referralSource ? { target_referral_source: input.referralSource } : {}),
    ...(input.externalReference ? { target_external_reference: input.externalReference } : {}),
    ...(input.initialNote ? { initial_note: input.initialNote } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data), { fieldErrors: {} });
  }
  const createdId = commandId(data);
  revalidateClients(createdId ?? undefined);
  return actionState("success", "Client created.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updateClientAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("clients.write");
  if (denied) return denied;
  const parsed = clientEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_client", {
    target_id: input.clientId,
    expected_version: input.expectedVersion,
    target_full_name: input.fullName,
    target_tier: input.clientTier,
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.address ? { target_address: input.address } : {}),
    ...(input.company ? { target_company: input.company } : {}),
    ...(input.referralSource ? { target_referral_source: input.referralSource } : {}),
    ...(input.externalReference ? { target_external_reference: input.externalReference } : {}),
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateClients(input.clientId);
  return actionState("success", "Client updated.", { currentVersion: commandVersion(data) });
}

export async function archiveClientAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("clients.write");
  if (denied) return denied;
  const parsed = clientArchiveInput(formData);
  if (!parsed.success) return actionState("error", "The client reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_admin_client", {
    target_id: input.clientId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    return actionState(
      commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
      commandReason(data),
      { currentVersion: commandVersion(data, "current_version") },
    );
  }
  revalidateClients(input.clientId);
  return actionState("success", "Client archived.", { currentVersion: commandVersion(data) });
}

export async function createClientNoteAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("clients.write");
  if (denied) return denied;
  const parsed = clientNoteCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Enter a note before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_client_note", {
    target_client_id: input.clientId,
    body: input.body,
  });
  if (error || !commandSucceeded(data)) {
    return actionState("error", commandReason(data));
  }
  revalidateClients(input.clientId);
  return actionState("success", "Note added.");
}

export async function searchActiveClientsAction(
  query: string,
): Promise<readonly ClientPickerEntry[]> {
  // The picker serves both project creation (C4) and invoice drafting (C5).
  const authorization =
    (await authorize("operations.projects.write")) && (await authorize("finance.invoices.write"));
  if (authorization) return [];
  return loadActiveClientsForPicker(query);
}

export async function checkDuplicateClientsAction(
  fullName: string,
  email: string,
  phone: string,
  excludeId?: string,
): Promise<readonly DuplicateClient[]> {
  const authorization = await authorize("clients.read");
  if (authorization) return [];
  if (fullName.trim().length < 3 && email.trim() === "" && phone.trim() === "") return [];
  return findDuplicateClients(fullName, email, phone, excludeId);
}
