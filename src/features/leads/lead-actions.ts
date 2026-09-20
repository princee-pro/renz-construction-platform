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
  attachmentReviewInput,
  intakeSettingsInput,
  leadArchiveInput,
  leadAssignInput,
  leadContactLogInput,
  leadConvertClientInput,
  leadCreateInput,
  leadCreateProjectInput,
  leadNoteInput,
  leadRequirementsInput,
  leadStatusInput,
  leadUpdateInput,
  zodFieldErrors,
} from "@/features/leads/lead-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { localDateTimeToInstant } from "@/lib/time/business-time";
import { loadBusinessTimezone } from "@/lib/time/business-timezone-server";

function revalidateLeads(leadId?: string, extra: readonly string[] = []): void {
  revalidatePath("/admin/operations/leads");
  revalidatePath("/admin");
  if (leadId) revalidatePath(`/admin/operations/leads/${leadId}`);
  for (const path of extra) revalidatePath(path);
}

function conflictOrError(data: unknown): AdminActionState {
  if (commandReasonCode(data) === "version_conflict") {
    const current = commandVersion(data, "current_version");
    return actionState(
      "conflict",
      "Another staff member changed this lead first. Your entries are kept; reload the latest before saving again.",
      { currentVersion: current },
    );
  }
  return actionState("error", commandReason(data));
}

export async function createLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating this lead.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_lead_manual", {
    target_lead_type: input.leadType,
    target_source_channel: input.sourceChannel,
    target_full_name: input.fullName,
    target_summary: input.summary,
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.company ? { target_company: input.company } : {}),
    ...(input.location ? { target_location_text: input.location } : {}),
    ...(input.message ? { target_message: input.message } : {}),
    ...(input.serviceKey ? { target_service_key: input.serviceKey } : {}),
    ...(input.priority ? { target_priority: input.priority } : {}),
    assign_to_me: input.assignToMe,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const createdId = commandId(data);
  revalidateLeads(createdId ?? undefined);
  return actionState("success", "Lead created.", {
    createdId,
    currentVersion: commandVersion(data),
  });
}

export async function updateLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadUpdateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_lead", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    target_full_name: input.fullName,
    target_summary: input.summary,
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.company ? { target_company: input.company } : {}),
    ...(input.location ? { target_location_text: input.location } : {}),
    ...(input.preferredContact ? { target_preferred_contact: input.preferredContact } : {}),
    ...(input.serviceKey ? { target_service_key: input.serviceKey } : {}),
    ...(input.serviceId ? { target_service_id: input.serviceId } : {}),
    ...(input.priority ? { target_priority: input.priority } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateLeads(input.id);
  return actionState("success", "Lead updated.", { currentVersion: commandVersion(data) });
}

export async function assignLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.assign");
  if (denied) return denied;
  const parsed = leadAssignInput(formData);
  if (!parsed.success)
    return actionState("error", "Choose a staff member.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  let assignee: string | null = input.assignee === "" ? null : input.assignee;
  if (input.assignee === "me") {
    const { data: user } = await client.auth.getUser();
    assignee = user.user?.id ?? null;
    if (!assignee)
      return actionState("error", "Your session could not be resolved. Sign in again.");
  }
  const { data, error } = await client.rpc("assign_lead", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    ...(assignee ? { target_assignee: assignee } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateLeads(input.id);
  return actionState(
    "success",
    assignee
      ? input.assignee === "me"
        ? "Assigned to you."
        : "Lead assigned."
      : "Assignment cleared.",
    {
      currentVersion: commandVersion(data),
    },
  );
}

export async function changeLeadStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadStatusInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("change_lead_status", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    target_status: input.status,
    ...(input.reasonCode ? { target_reason_code: input.reasonCode } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateLeads(input.id);
  return actionState("success", "Stage updated.", { currentVersion: commandVersion(data) });
}

export async function logLeadContactAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadContactLogInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  // Staff typed a wall-clock time in the RENZ business timezone; convert it
  // to the canonical instant with that zone (never the server's clock).
  let occurredAt: string | null = null;
  if (input.occurredAt) {
    const timeZone = await loadBusinessTimezone();
    const instant = localDateTimeToInstant(input.occurredAt, timeZone);
    if (!instant) {
      return actionState("error", "Correct the highlighted fields.", {
        fieldErrors: { occurredAt: "Enter a valid date and time." },
      });
    }
    if (instant.getTime() > Date.now() + 60 * 60 * 1000) {
      return actionState("error", "Correct the highlighted fields.", {
        fieldErrors: { occurredAt: `Contact time must not be in the future (${timeZone}).` },
      });
    }
    occurredAt = instant.toISOString();
  }
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("log_lead_contact", {
    target_id: input.id,
    target_contact_type: input.contactType,
    ...(occurredAt ? { target_occurred_at: occurredAt } : {}),
    ...(input.note ? { target_note: input.note } : {}),
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  let version = commandVersion(data);
  if (input.markContacted && version) {
    const moved = await client.rpc("change_lead_status", {
      target_id: input.id,
      expected_version: version,
      target_status: "contacted",
    });
    if (commandSucceeded(moved.data)) version = commandVersion(moved.data);
  }
  revalidateLeads(input.id);
  return actionState(
    "success",
    input.markContacted ? "Contact logged and stage set to Contacted." : "Contact logged.",
    {
      currentVersion: version,
    },
  );
}

export async function createLeadNoteAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadNoteInput(formData);
  if (!parsed.success)
    return actionState("error", "Write a note first.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_lead_note", {
    target_id: parsed.data.id,
    body: parsed.data.body,
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  revalidateLeads(parsed.data.id);
  return actionState("success", "Note added.");
}

export async function convertLeadToClientAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.convert");
  if (denied) return denied;
  const parsed = leadConvertClientInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("convert_lead_to_client", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    ...(input.existingClientId ? { existing_client_id: input.existingClientId } : {}),
    ...(input.fullName ? { target_full_name: input.fullName } : {}),
    ...(input.email ? { target_email: input.email } : {}),
    ...(input.phone ? { target_phone: input.phone } : {}),
    ...(input.company ? { target_company: input.company } : {}),
    ...(input.address ? { target_address: input.address } : {}),
    target_tier: input.clientTier,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  const clientId =
    typeof (data as { client_id?: unknown }).client_id === "string"
      ? String((data as { client_id: string }).client_id)
      : null;
  revalidateLeads(
    input.id,
    clientId ? [`/admin/operations/clients/${clientId}`, "/admin/operations/clients"] : [],
  );
  const alreadyLinked = (data as { already_linked?: boolean }).already_linked === true;
  return actionState(
    "success",
    alreadyLinked
      ? "This lead is already linked to a client."
      : input.existingClientId
        ? "Existing client linked."
        : "Client created from this lead.",
    {
      currentVersion: commandVersion(data),
      createdId: clientId,
    },
  );
}

export async function createProjectFromLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.convert");
  if (denied) return denied;
  const parsed = leadCreateProjectInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_project_from_lead", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    target_title: input.title,
    target_phase: input.phase,
    target_priority: input.priority,
    ...(input.description ? { target_description: input.description } : {}),
    ...(input.startDate ? { target_start_date: input.startDate } : {}),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  const projectId =
    typeof (data as { project_id?: unknown }).project_id === "string"
      ? String((data as { project_id: string }).project_id)
      : null;
  revalidateLeads(
    input.id,
    projectId ? [`/admin/operations/projects/${projectId}`, "/admin/operations/projects"] : [],
  );
  return actionState("success", "Operational project created from this lead.", {
    currentVersion: commandVersion(data),
    createdId: projectId,
  });
}

export async function createRequirementsFromLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.convert");
  if (denied) return denied;
  const parsed = leadRequirementsInput(formData);
  if (!parsed.success) {
    return actionState("error", "Select at least one item and complete its quantity and unit.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_material_requirements_from_lead", {
    target_id: input.id,
    expected_version: input.expectedVersion,
    items: input.items.map((item) => ({
      item_name: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      specification: item.specification ?? "",
      required_by: item.requiredBy ?? "",
      priority: item.priority,
    })),
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateLeads(input.id, ["/admin/procurement/materials", "/admin/operations/projects"]);
  const created = (data as { created?: number }).created ?? input.items.length;
  return actionState(
    "success",
    `${created} material requirement${created === 1 ? "" : "s"} created as drafts on the project. No purchase order was created.`,
    {
      currentVersion: commandVersion(data),
    },
  );
}

export async function reviewLeadAttachmentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = attachmentReviewInput(formData);
  if (!parsed.success)
    return actionState("error", "Give a short reason when rejecting a file.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("review_lead_attachment", {
    target_attachment_id: parsed.data.attachmentId,
    target_state: parsed.data.state,
    ...(parsed.data.reason ? { target_reason: parsed.data.reason } : {}),
  });
  if (error || !commandSucceeded(data)) return actionState("error", commandReason(data));
  const leadId = formData.get("leadId");
  revalidateLeads(typeof leadId === "string" ? leadId : undefined);
  return actionState(
    "success",
    parsed.data.state === "safe" ? "Attachment marked safe." : "Attachment rejected.",
  );
}

export async function archiveLeadAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("leads.write");
  if (denied) return denied;
  const parsed = leadArchiveInput(formData);
  if (!parsed.success) return actionState("error", "Reload the page and try again.");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("archive_lead", {
    target_id: parsed.data.id,
    expected_version: parsed.data.expectedVersion,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidateLeads(parsed.data.id);
  return actionState("success", "Lead archived.", { currentVersion: commandVersion(data) });
}

export async function updateIntakeSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const denied = await authorize("settings.system.write");
  if (denied) return denied;
  const parsed = intakeSettingsInput(formData);
  if (!parsed.success)
    return actionState("error", "Correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_intake_settings", {
    expected_version: input.expectedVersion,
    target_intake_enabled: input.intakeEnabled,
    target_upload_policy: input.uploadPolicy,
    target_lead_uncontacted_hours: input.leadUncontactedHours,
    target_proposal_stale_days: input.proposalStaleDays,
  });
  if (error || !commandSucceeded(data)) return conflictOrError(data);
  revalidatePath("/admin/settings/system");
  revalidatePath("/admin/settings/launch-readiness");
  revalidatePath("/admin");
  for (const path of ["/contact", "/start-a-project", "/enquire/service", "/enquire/materials"])
    revalidatePath(path);
  return actionState("success", "Intake settings saved.", { currentVersion: commandVersion(data) });
}
