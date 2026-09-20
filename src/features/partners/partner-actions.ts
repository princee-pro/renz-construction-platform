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
  partnerCapabilityInput,
  partnerCreateInput,
  partnerEditInput,
  partnerRefInput,
  zodFieldErrors,
  type DuplicatePartner,
  type PartnerCapability,
  type PartnerPickerEntry,
} from "@/features/partners/partner-contract";
import { findDuplicatePartners, loadPartnersForPicker } from "@/features/partners/partner-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function revalidatePartners(partnerId?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/operations/contractors");
  revalidatePath("/admin/procurement/suppliers");
  if (partnerId) {
    revalidatePath(`/admin/operations/contractors/${partnerId}`);
    revalidatePath(`/admin/procurement/suppliers/${partnerId}`);
  }
}

function conflictOrError(data: unknown): AdminActionState {
  return actionState(
    commandReasonCode(data) === "version_conflict" ? "conflict" : "error",
    commandReason(data),
    { currentVersion: commandVersion(data, "current_version") },
  );
}

export async function createPartnerAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("partners.write");
  if (denied) return denied;
  const parsed = partnerCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating this partner.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_trade_partner", {
    target_display_name: input.displayName,
    target_capabilities: input.capabilities,
    target_specializations: input.specializations,
    target_availability: input.availability,
    ...(input.companyName ? { target_company: input.companyName } : {}),
    ...(input.contactName ? { target_contact: input.contactName } : {}),
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.address ? { target_address: input.address } : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const createdId = commandId(data);
  revalidatePartners(createdId ?? undefined);
  return actionState("success", "Partner created.", {
    currentVersion: commandVersion(data),
    createdId,
  });
}

export async function updatePartnerAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("partners.write");
  if (denied) return denied;
  const parsed = partnerEditInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_trade_partner", {
    target_id: input.partnerId,
    expected_version: input.expectedVersion,
    target_display_name: input.displayName,
    target_specializations: input.specializations,
    target_availability: input.availability,
    ...(input.companyName ? { target_company: input.companyName } : {}),
    ...(input.contactName ? { target_contact: input.contactName } : {}),
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.address ? { target_address: input.address } : {}),
    ...(input.notes ? { target_notes: input.notes } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidatePartners(input.partnerId);
  return actionState("success", "Partner updated.", { currentVersion: commandVersion(data) });
}

export async function addPartnerCapabilityAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("partners.write");
  if (denied) return denied;
  const parsed = partnerCapabilityInput(formData);
  if (!parsed.success) return actionState("error", "The capability request is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("add_trade_partner_capability", {
    target_id: parsed.data.partnerId,
    expected_version: parsed.data.expectedVersion,
    capability: parsed.data.capability,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidatePartners(parsed.data.partnerId);
  return actionState("success", "Capability added.", { currentVersion: commandVersion(data) });
}

export async function archivePartnerAction(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("partners.write");
  if (denied) return denied;
  const parsed = partnerRefInput(formData);
  if (!parsed.success) return actionState("error", "The partner reference is invalid.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_admin_trade_partner", {
    target_id: parsed.data.partnerId,
    expected_version: parsed.data.expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidatePartners(parsed.data.partnerId);
  return actionState("success", "Partner archived.", { currentVersion: commandVersion(data) });
}

export async function searchPartnersAction(
  capability: PartnerCapability,
  query: string,
): Promise<readonly PartnerPickerEntry[]> {
  const denied = await authorize("partners.read");
  if (denied) return [];
  if (capability !== "contractor" && capability !== "supplier") return [];
  return loadPartnersForPicker(capability, query);
}

export async function checkDuplicatePartnersAction(
  displayName: string,
  email: string,
  phone: string,
  company: string,
  excludeId?: string,
): Promise<readonly DuplicatePartner[]> {
  const denied = await authorize("partners.read");
  if (denied) return [];
  if (
    displayName.trim().length < 3 &&
    email.trim() === "" &&
    phone.trim() === "" &&
    company.trim().length < 3
  ) {
    return [];
  }
  return findDuplicatePartners(displayName, email, phone, company, excludeId);
}
