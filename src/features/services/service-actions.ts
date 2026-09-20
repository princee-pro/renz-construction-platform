"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  evidenceCommandInput,
  publicationActionInput,
  serviceCreateInput,
  serviceEditorInput,
  serviceEvidenceInput,
  type ServiceActionState,
  zodFieldErrors,
} from "@/features/services/service-contract";
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
  status: ServiceActionState["status"],
  message: string,
  options: Readonly<{
    fieldErrors?: Readonly<Record<string, string>>;
    serviceVersion?: number | null;
    localizationVersion?: number | null;
    reauthHref?: string | null;
  }> = {},
): ServiceActionState {
  return {
    status,
    message,
    fieldErrors: options.fieldErrors ?? {},
    serviceVersion: options.serviceVersion ?? null,
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

async function authorize(permission: AdminPermission): Promise<ServiceActionState | null> {
  const authorization = await authorizeServerAction(permission);
  return authorization.ok ? null : authorizationFailure(authorization);
}

async function recordRejectedOperation(
  action: string,
  serviceId: string,
  reason: string,
): Promise<void> {
  const client = await createServerSupabaseClient();
  await client.rpc("record_audit_event", {
    event_action: action,
    event_entity_type: "service",
    event_entity_id: serviceId,
    event_outcome: "rejected",
    event_metadata: { reason },
  });
}

function revalidateService(serviceId: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/content/services");
  revalidatePath(`/admin/content/services/${serviceId}`);
  revalidatePath(`/admin/content/services/${serviceId}/preview`);
}

export async function createServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;

  const parsed = serviceCreateInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before creating the draft.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_admin_service_draft", {
    target_locale: parsed.data.locale,
    target_slug: parsed.data.slug,
    target_name: parsed.data.name,
  });
  const id = commandObject(data)?.["id"];
  if (error || !commandSucceeded(data) || typeof id !== "string") {
    const duplicate = error?.code === "23505";
    return actionState(
      "error",
      duplicate
        ? "That locale and slug are already in use. Choose a different slug."
        : "The service draft could not be created. Your values remain available.",
      { fieldErrors: duplicate ? { slug: "This locale and slug must be unique." } : {} },
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/content/services");
  redirect(`/admin/content/services/${id}?locale=${encodeURIComponent(parsed.data.locale)}`);
}

export async function saveServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;

  const parsed = serviceEditorInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the highlighted fields before saving.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("update_admin_service_draft", {
    target_id: input.serviceId,
    expected_version: input.serviceVersion,
    expected_localization_version: input.localizationVersion,
    target_locale: input.locale,
    target_slug: input.slug,
    target_name: input.name,
    target_summary: input.summary ?? "",
    target_body_blocks: input.bodyBlocks,
    target_seo_title: input.seoTitle ?? "",
    target_seo_description: input.seoDescription ?? "",
    target_scope: input.scope ?? "",
    target_deliverables: input.deliverables ?? "",
    target_exclusions: input.exclusions ?? "",
    target_client_inputs: input.clientInputs ?? "",
    target_delivery_wording: input.deliveryWording ?? "",
    target_professional_terminology: input.professionalTerminology ?? "",
    target_sort_order: input.sortOrder,
    target_featured: input.featured,
  });

  if (error || !commandSucceeded(data)) {
    const code = commandReasonCode(data);
    await recordRejectedOperation("service.update", input.serviceId, code);
    if (code === "version_conflict") {
      return actionState(
        "conflict",
        "A newer version was saved by another editor. Your values are preserved; reload the authoritative version before making a new save.",
        {
          serviceVersion: commandVersion(data, "current_version"),
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

  revalidateService(input.serviceId);
  return actionState("success", "Draft saved.", {
    serviceVersion: commandVersion(data),
    localizationVersion: commandVersion(data, "localization_version"),
  });
}

export async function createEvidenceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = serviceEvidenceInput(formData);
  if (!parsed.success) {
    return actionState("error", "Correct the evidence fields before registering it.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }

  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("create_service_evidence", {
    target_service_id: input.serviceId,
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
  revalidateService(input.serviceId);
  return actionState("success", "Evidence registered as Unverified.");
}

export async function submitEvidenceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const denied = await authorize("content.write");
  if (denied) return denied;
  const parsed = evidenceCommandInput(formData);
  if (!parsed.success) return actionState("error", "The evidence reference is invalid.");
  const input = parsed.data;
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("submit_service_evidence_for_review", {
    target_service_id: input.serviceId,
    target_evidence_id: input.evidenceId,
    expected_version: input.expectedVersion,
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation(
      "evidence.submit_review",
      input.serviceId,
      commandReasonCode(data),
    );
    return actionState("error", commandReason(data));
  }
  revalidateService(input.serviceId);
  return actionState("success", "Evidence submitted for review.");
}

export async function reviewEvidenceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
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
  const { data, error } = await client.rpc("review_service_evidence", {
    target_service_id: input.serviceId,
    target_evidence_id: input.evidenceId,
    expected_version: input.expectedVersion,
    next_state: decision,
    ...(consentState === "granted" ? { next_consent_state: "granted" } : {}),
  });
  if (error || !commandSucceeded(data)) {
    await recordRejectedOperation("evidence.review", input.serviceId, commandReasonCode(data));
    return actionState("error", commandReason(data));
  }
  revalidateService(input.serviceId);
  return actionState(
    "success",
    decision === "verified" ? "Evidence verified." : "Evidence rejected.",
  );
}

export async function changeServicePublicationAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
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
      contentType: "service" as const,
      targetId: input.serviceId,
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
    await recordRejectedOperation(`content.${input.operation}`, input.serviceId, code);
    const status = code === "version_conflict" ? "conflict" : "error";
    return actionState(status, commandReason(result), {
      serviceVersion: commandVersion(result, "current_version"),
    });
  }
  revalidateService(input.serviceId);
  const verb =
    input.operation === "publish"
      ? "published"
      : input.operation === "unpublish"
        ? "returned to Draft"
        : "archived";
  return actionState("success", `Service ${verb}.`, {
    serviceVersion: commandVersion(result),
  });
}
