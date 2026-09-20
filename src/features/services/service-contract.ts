import { z } from "zod";

import { contentBlocksSchema, type ContentBlocks } from "@/lib/content/schemas";

export const publicationStatuses = ["draft", "published", "archived"] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];

export const evidenceStates = [
  "unverified",
  "in_review",
  "verified",
  "expired",
  "rejected",
] as const;
export type EvidenceState = (typeof evidenceStates)[number];

const safePlainText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, `Keep this field to ${maximum.toLocaleString("en")} characters or fewer.`)
    .refine((value) => !/[<>]/u.test(value), "Markup is not accepted in this field.")
    .refine(
      (value) => !/(?:javascript\s*:|data\s*:\s*text\/html|vbscript\s*:)/iu.test(value),
      "Executable protocols are not accepted in this field.",
    );

const requiredText = (minimum: number, maximum: number) =>
  safePlainText(maximum).pipe(
    z
      .string()
      .min(minimum, minimum === 1 ? "Enter a value." : `Enter at least ${minimum} characters.`),
  );

const optionalText = (maximum: number) =>
  safePlainText(maximum).transform((value) => value || null);

export const serviceCreateSchema = z
  .object({
    locale: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u, "Enter a valid BCP 47 locale."),
    slug: z
      .string()
      .trim()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use lowercase words separated by hyphens."),
    name: requiredText(1, 160),
  })
  .strict();

export const serviceEditorSchema = z
  .object({
    serviceId: z.string().uuid(),
    serviceVersion: z.number().int().positive(),
    localizationVersion: z.number().int().positive(),
    locale: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u),
    slug: z
      .string()
      .trim()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Use lowercase words separated by hyphens."),
    name: requiredText(1, 160),
    summary: optionalText(600),
    scope: optionalText(4_000),
    deliverables: optionalText(4_000),
    exclusions: optionalText(4_000),
    clientInputs: optionalText(4_000),
    deliveryWording: optionalText(4_000),
    professionalTerminology: optionalText(4_000),
    seoTitle: optionalText(160),
    seoDescription: optionalText(320),
    sortOrder: z.number().int().min(0).max(100_000),
    featured: z.boolean(),
    bodyBlocks: contentBlocksSchema,
  })
  .strict();

export const serviceEvidenceCreateSchema = z
  .object({
    serviceId: z.string().uuid(),
    factClaim: requiredText(1, 1_000),
    sourceType: z.enum([
      "client_supplied",
      "client_confirmation",
      "contract_document",
      "project_document",
      "media_metadata",
      "credential_document",
      "testimonial_consent",
      "public_authoritative_source",
      "internal_record",
      "other_reviewed_source",
    ]),
    sourceReference: requiredText(1, 1_000),
    sensitivity: z.enum(["public", "private"]),
    consentRequired: z.boolean(),
    required: z.boolean(),
    purpose: optionalText(500),
  })
  .strict();

export const evidenceCommandSchema = z
  .object({
    serviceId: z.string().uuid(),
    evidenceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const publicationActionSchema = z
  .object({
    serviceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    operation: z.enum(["publish", "unpublish", "archive"]),
  })
  .strict();

const readinessReasonSchema = z
  .object({
    code: z.string(),
    field: z.string().nullable().optional(),
    detail: z.string(),
  })
  .passthrough();

export type ReadinessReason = z.infer<typeof readinessReasonSchema>;

const serviceEvidenceSchema = z
  .object({
    id: z.string().uuid(),
    fact_claim: z.string(),
    source_type: z.string(),
    source_reference: z.string(),
    sensitivity: z.enum(["public", "private"]),
    verification_state: z.enum(evidenceStates),
    review_due_at: z.string().nullable(),
    consent_required: z.boolean(),
    consent_state: z.string(),
    required: z.boolean(),
    purpose: z.string().nullable(),
    version: z.number().int().positive(),
    updated_at: z.string(),
  })
  .strict();

export const serviceDetailSchema = z
  .object({
    service: z
      .object({
        id: z.string().uuid(),
        publication_status: z.enum(publicationStatuses),
        published_at: z.string().nullable(),
        sort_order: z.number().int().nonnegative(),
        featured: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        version: z.number().int().positive(),
      })
      .strict(),
    localization: z
      .object({
        locale: z.string(),
        slug: z.string(),
        name: z.string(),
        summary: z.string().nullable(),
        body_blocks: contentBlocksSchema,
        schema_version: z.number().int().positive(),
        seo_title: z.string().nullable(),
        seo_description: z.string().nullable(),
        scope: z.string().nullable(),
        deliverables: z.string().nullable(),
        exclusions: z.string().nullable(),
        client_inputs: z.string().nullable(),
        delivery_wording: z.string().nullable(),
        professional_terminology: z.string().nullable(),
        version: z.number().int().positive(),
      })
      .strict()
      .nullable(),
    available_locales: z.array(z.string()),
    evidence: z.array(serviceEvidenceSchema),
    readiness: z
      .object({
        ready: z.boolean(),
        reasons: z.array(readinessReasonSchema),
      })
      .strict(),
  })
  .strict();

export type ServiceDetail = z.infer<typeof serviceDetailSchema>;
export type ServiceEvidence = z.infer<typeof serviceEvidenceSchema>;

export const serviceListResultSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().uuid(),
          publication_status: z.enum(publicationStatuses),
          updated_at: z.string(),
          version: z.number().int().positive(),
          featured: z.boolean(),
          locale: z.string(),
          name: z.string(),
          slug: z.string(),
          readiness: z.enum(["ready", "blocked"]),
          blocker_count: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    has_more: z.boolean(),
    next_cursor: z.object({ updated_at: z.string(), id: z.string().uuid() }).strict().nullable(),
  })
  .strict();

export type ServiceListResult = z.infer<typeof serviceListResultSchema>;

export const serviceOverviewSchema = z
  .object({
    draft: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    evidence: z
      .object({
        unverified: z.number().int().nonnegative(),
        in_review: z.number().int().nonnegative(),
        verified: z.number().int().nonnegative(),
        attention: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type ServiceOverview = z.infer<typeof serviceOverviewSchema>;

export type ServiceEditorValues = Readonly<{
  locale: string;
  slug: string;
  name: string;
  summary: string;
  scope: string;
  deliverables: string;
  exclusions: string;
  clientInputs: string;
  deliveryWording: string;
  professionalTerminology: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  featured: boolean;
  bodyBlocks: ContentBlocks;
}>;

export type ServiceActionState = Readonly<{
  status: "idle" | "error" | "success" | "conflict" | "reauth";
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  serviceVersion: number | null;
  localizationVersion: number | null;
  reauthHref: string | null;
}>;

export const initialServiceActionState: ServiceActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  serviceVersion: null,
  localizationVersion: null,
  reauthHref: null,
};

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formNumber(formData: FormData, key: string): number {
  const value = Number(formText(formData, key));
  return Number.isFinite(value) ? value : Number.NaN;
}

function parseBlocks(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function serviceCreateInput(formData: FormData) {
  return serviceCreateSchema.safeParse({
    locale: formText(formData, "locale"),
    slug: formText(formData, "slug"),
    name: formText(formData, "name"),
  });
}

export function serviceEditorInput(formData: FormData) {
  return serviceEditorSchema.safeParse({
    serviceId: formText(formData, "serviceId"),
    serviceVersion: formNumber(formData, "serviceVersion"),
    localizationVersion: formNumber(formData, "localizationVersion"),
    locale: formText(formData, "locale"),
    slug: formText(formData, "slug"),
    name: formText(formData, "name"),
    summary: formText(formData, "summary"),
    scope: formText(formData, "scope"),
    deliverables: formText(formData, "deliverables"),
    exclusions: formText(formData, "exclusions"),
    clientInputs: formText(formData, "clientInputs"),
    deliveryWording: formText(formData, "deliveryWording"),
    professionalTerminology: formText(formData, "professionalTerminology"),
    seoTitle: formText(formData, "seoTitle"),
    seoDescription: formText(formData, "seoDescription"),
    sortOrder: formNumber(formData, "sortOrder"),
    featured: formData.get("featured") === "on",
    bodyBlocks: parseBlocks(formText(formData, "bodyBlocks")),
  });
}

export function serviceEvidenceInput(formData: FormData) {
  return serviceEvidenceCreateSchema.safeParse({
    serviceId: formText(formData, "serviceId"),
    factClaim: formText(formData, "factClaim"),
    sourceType: formText(formData, "sourceType"),
    sourceReference: formText(formData, "sourceReference"),
    sensitivity: formText(formData, "sensitivity"),
    consentRequired: formData.get("consentRequired") === "on",
    required: formData.get("required") === "on",
    purpose: formText(formData, "purpose"),
  });
}

export function evidenceCommandInput(formData: FormData) {
  return evidenceCommandSchema.safeParse({
    serviceId: formText(formData, "serviceId"),
    evidenceId: formText(formData, "evidenceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function publicationActionInput(formData: FormData) {
  return publicationActionSchema.safeParse({
    serviceId: formText(formData, "serviceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    operation: formText(formData, "operation"),
  });
}

export function zodFieldErrors(error: z.ZodError): Readonly<Record<string, string>> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fields[field] ??= issue.message;
  }
  return fields;
}
