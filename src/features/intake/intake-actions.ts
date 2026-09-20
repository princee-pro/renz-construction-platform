"use server";

import type { z } from "zod";

import type { Json } from "@/lib/database/database.types";
import {
  contactInput,
  intakeState,
  materialEnquiryInput,
  projectIntakeInput,
  serviceEnquiryInput,
  zodFieldErrors,
  type IntakeActionState,
} from "@/features/intake/intake-contract";
import { needLabels, projectTypeLabels, type IntakeScope } from "@/features/intake/intake-policy";
import {
  hashUploadToken,
  screenSubmission,
  type AbuseVerdict,
} from "@/features/intake/intake-server";
import { getPublishedLegalPage } from "@/lib/site/legal-pages";
import { getSiteIdentity } from "@/lib/site/public-configuration";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type SubmitOutcome =
  { ok: true; reference: string; leadType: string } | { ok: false; code: string; detail: string };

async function submitLead(payload: Record<string, Json>): Promise<SubmitOutcome> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc("intake_submit_lead", { payload });
  const result = (data ?? null) as {
    ok?: boolean;
    reference?: string;
    lead_type?: string;
    reasons?: { code?: string; detail?: string; field?: string }[];
  } | null;
  if (error || !result) {
    return { ok: false, code: "unavailable", detail: "The enquiry could not be saved right now." };
  }
  if (result.ok === true && typeof result.reference === "string") {
    return { ok: true, reference: result.reference, leadType: result.lead_type ?? "general" };
  }
  const reason = result.reasons?.[0];
  return {
    ok: false,
    code: reason?.code ?? "invalid_input",
    detail: reason?.detail ?? "Please check the form.",
  };
}

function screeningFailure(verdict: Extract<AbuseVerdict, { ok: false }>): IntakeActionState {
  switch (verdict.kind) {
    case "rate_limited":
      return intakeState(
        "rate_limited",
        "You have sent several enquiries recently. Please wait a little, or reach RENZ on WhatsApp or by email.",
        { retryAfterSeconds: verdict.retryAfterSeconds ?? null, fallback: true },
      );
    case "too_fast":
      return intakeState("error", "That was quick — please review the form and submit again.");
    case "expired":
      return intakeState(
        "error",
        "This form session has expired. Reload the page; your entries stay in the form until then.",
        { fieldErrors: { formToken: "Reload the page to refresh the form session." } },
      );
    case "bot":
      return intakeState("error", "The anti-bot check did not pass. Please try again.", {
        fieldErrors: { turnstileToken: "Complete the verification and try again." },
      });
    default:
      return intakeState(
        "unavailable",
        "Online enquiries are unavailable at the moment. Please use WhatsApp or email.",
        { fallback: true },
      );
  }
}

function outcomeState(outcome: SubmitOutcome): IntakeActionState {
  if (outcome.ok) {
    return intakeState("success", "Thank you — your enquiry has been received.", {
      reference: outcome.reference,
      leadType: outcome.leadType,
    });
  }
  if (outcome.code === "intake_disabled" || outcome.code === "unavailable") {
    return intakeState("unavailable", outcome.detail, { fallback: true });
  }
  if (
    outcome.code === "expired_session" ||
    outcome.code === "not_authorized" ||
    outcome.code === "uploads_disabled"
  ) {
    return intakeState("error", outcome.detail, { fieldErrors: { files: outcome.detail } });
  }
  return intakeState("error", outcome.detail, { fieldErrors: { form: outcome.detail } });
}

async function consentRevision(): Promise<number> {
  const privacy = await getPublishedLegalPage("privacy");
  return privacy?.revision ?? 0;
}

/** A honeypot hit is accepted quietly with a plausible-looking reference; nothing is stored. */
function decoyReference(): string {
  return `RENZ-LEAD-${new Date().getUTCFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
}

async function run<T extends { formToken: string; turnstileToken?: string | undefined }>(
  scope: IntakeScope,
  formData: FormData,
  parsed: z.ZodSafeParseResult<T>,
  build: (data: T, nonce: string, revision: number) => Record<string, Json>,
): Promise<IntakeActionState> {
  const identity = await getSiteIdentity();
  if (!identity.intake.enabled) {
    return intakeState(
      "unavailable",
      "Online enquiries are paused at the moment. Please use WhatsApp or email.",
      { fallback: true },
    );
  }
  if (!parsed.success) {
    return intakeState("error", "Please correct the highlighted fields.", {
      fieldErrors: zodFieldErrors(parsed.error),
    });
  }
  const screened = await screenSubmission(
    scope,
    formData,
    parsed.data.formToken,
    parsed.data.turnstileToken,
  );
  if (!screened.ok) return screeningFailure(screened);
  if (screened.silent) {
    return intakeState("success", "Thank you — your enquiry has been received.", {
      reference: decoyReference(),
      leadType: scope,
    });
  }
  const revision = await consentRevision();
  return outcomeState(await submitLead(build(parsed.data, screened.nonce, revision)));
}

export async function submitContactAction(
  _previous: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return run("contact", formData, contactInput(formData), (data, nonce, revision) => ({
    lead_type: "general",
    source_channel: "website_contact",
    idempotency_key: nonce,
    full_name: data.fullName,
    email: data.email ?? "",
    phone: data.phone ?? "",
    company: data.company ?? "",
    summary: data.subject,
    message: data.message,
    consent_revision: revision,
  }));
}

export async function submitServiceEnquiryAction(
  _previous: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return run("service", formData, serviceEnquiryInput(formData), (data, nonce, revision) => ({
    lead_type: "service",
    source_channel: "service_page",
    idempotency_key: nonce,
    full_name: data.fullName,
    email: data.email ?? "",
    phone: data.phone ?? "",
    company: data.company ?? "",
    summary: `Service enquiry: ${needLabels[data.serviceKey as keyof typeof needLabels] ?? data.serviceKey}`,
    message: data.requirement,
    service_key: data.serviceKey,
    consent_revision: revision,
    details: {
      context_text: data.context ?? "",
      requirement_text: data.requirement,
      preferred_timing: data.timing ?? "",
    },
  }));
}

export async function submitMaterialEnquiryAction(
  _previous: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return run("material", formData, materialEnquiryInput(formData), (data, nonce, revision) => ({
    lead_type: "material",
    source_channel: "material_enquiry",
    idempotency_key: nonce,
    full_name: data.fullName,
    email: data.email ?? "",
    phone: data.phone ?? "",
    company: data.company ?? "",
    location_text: data.location ?? "",
    summary: `Material enquiry: ${data.items.length} item${data.items.length === 1 ? "" : "s"}`,
    message: data.notes ?? "",
    consent_revision: revision,
    details: {
      items: data.items.map((item) => ({
        description: item.description,
        quantity: item.quantity === null ? "" : String(item.quantity),
        unit: item.unit ?? "",
        specification: item.specification ?? "",
      })),
    },
  }));
}

export async function submitProjectIntakeAction(
  _previous: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return run("project", formData, projectIntakeInput(formData), (data, nonce, revision) => {
    const number = (value: number | null) => (value === null ? "" : String(value));
    const range = data.budgetPreference === "range";
    return {
      lead_type: "project",
      source_channel: "start_a_project",
      idempotency_key: nonce,
      full_name: data.fullName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      company: data.company ?? "",
      location_text: data.location ?? "",
      preferred_contact: data.preferredContact ?? "",
      summary: `${projectTypeLabels[data.projectType]} project · ${needLabels[data.needKey]}`.slice(
        0,
        200,
      ),
      message: data.description,
      service_key: data.needKey,
      consent_revision: revision,
      upload_session_id: data.uploadSessionId,
      upload_session_token_hash: data.uploadSessionToken
        ? hashUploadToken(data.uploadSessionToken)
        : "",
      details: {
        need_key: data.needKey,
        project_type: data.projectType,
        site_state: data.siteState ?? "",
        floor_area_m2: number(data.floorArea),
        floors: number(data.floors),
        units: number(data.units),
        site_area_m2: number(data.siteArea),
        scale_band: data.scaleBand ?? "",
        start_timing: data.startTiming ?? "",
        completion_timing: data.completionTiming ?? "",
        budget_preference: data.budgetPreference,
        budget_currency: range ? data.budgetCurrency : "",
        budget_min: range ? number(data.budgetMin) : "",
        budget_max: range ? number(data.budgetMax) : "",
        current_stage: data.currentStage ?? "",
        special_requirements: data.specialRequirements ?? "",
        source_context: data.sourceContext ?? "",
      },
    };
  });
}
