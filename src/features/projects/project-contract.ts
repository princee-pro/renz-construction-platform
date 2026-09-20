import { z } from "zod";

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

export const locationGranularities = ["city", "region", "country"] as const;

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

const optionalYear = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .pipe(z.number().int().min(1800).max(2500).nullable());

export const projectCreateSchema = z
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
    title: requiredText(1, 160),
  })
  .strict();

export const projectEditorSchema = z
  .object({
    projectId: z.string().uuid(),
    projectVersion: z.number().int().positive(),
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
    title: requiredText(1, 160),
    summary: optionalText(600),
    challenge: optionalText(4_000),
    approach: optionalText(4_000),
    solution: optionalText(4_000),
    outcomes: optionalText(4_000),
    seoTitle: optionalText(160),
    seoDescription: optionalText(320),
    publicLocation: optionalText(200),
    publicLocationGranularity: z.enum(locationGranularities).nullable(),
    projectType: optionalText(80),
    projectScope: optionalText(4_000),
    renzRole: optionalText(400),
    deliveryStatus: optionalText(80),
    startYear: optionalYear,
    completionYear: optionalYear,
    sortOrder: z.number().int().min(0).max(100_000),
    featured: z.boolean(),
    heroAssetId: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(z.string().uuid().nullable()),
  })
  .strict();

export const projectEvidenceCreateSchema = z
  .object({
    projectId: z.string().uuid(),
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
    projectId: z.string().uuid(),
    evidenceId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const publicationActionSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    operation: z.enum(["publish", "unpublish", "archive"]),
  })
  .strict();

export const projectReviewSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
  })
  .strict();

export const projectServicesSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    services: z.array(
      z
        .object({
          serviceId: z.string().uuid(),
          scopeLabel: optionalText(200),
        })
        .strict(),
    ),
  })
  .strict();

export const stageCreateSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: requiredText(1, 160),
    description: optionalText(4_000),
    sortOrder: z.number().int().min(0).max(1_000),
  })
  .strict();

export const stageEditSchema = z
  .object({
    stageId: z.string().uuid(),
    projectId: z.string().uuid(),
    expectedStageVersion: z.number().int().positive(),
    title: requiredText(1, 160),
    description: optionalText(4_000),
    sortOrder: z.number().int().min(0).max(1_000),
  })
  .strict();

export const stageDeleteSchema = z
  .object({
    stageId: z.string().uuid(),
    projectId: z.string().uuid(),
    expectedStageVersion: z.number().int().positive(),
  })
  .strict();

export const mediaRoles = [
  "hero",
  "context",
  "exterior",
  "interior",
  "detail",
  "process",
  "drawing",
  "dusk",
  "gallery",
  "before",
  "during",
  "after",
  "video",
  "video_poster",
  "listing",
  "background",
  "social",
] as const;

export const mediaAttachSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    mediaAssetId: z.string().uuid(),
    role: z.enum(mediaRoles),
    phase: optionalText(40),
    stageId: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(z.string().uuid().nullable()),
    decorative: z.boolean(),
    credit: optionalText(200),
    altText: optionalText(300),
    caption: optionalText(600),
  })
  .strict();

export const mediaUpdateSchema = z
  .object({
    projectMediaId: z.string().uuid(),
    projectId: z.string().uuid(),
    expectedMediaVersion: z.number().int().positive(),
    expectedLocalizationVersion: z.number().int().positive(),
    role: z.enum(mediaRoles),
    phase: optionalText(40),
    stageId: z
      .string()
      .trim()
      .transform((value) => (value === "" ? null : value))
      .pipe(z.string().uuid().nullable()),
    decorative: z.boolean(),
    credit: optionalText(200),
    altText: optionalText(300),
    caption: optionalText(600),
  })
  .strict();

export const mediaRemoveSchema = z
  .object({
    projectMediaId: z.string().uuid(),
    projectId: z.string().uuid(),
    expectedMediaVersion: z.number().int().positive(),
  })
  .strict();

export const mediaReorderSchema = z
  .object({
    projectId: z.string().uuid(),
    orderedIds: z.array(z.string().uuid()).min(1),
  })
  .strict();

export const mediaPromoteSchema = z
  .object({
    projectMediaId: z.string().uuid(),
    projectId: z.string().uuid(),
    expectedMediaVersion: z.number().int().positive(),
    rightsHolder: optionalText(200),
    rightsSource: optionalText(200),
    credit: optionalText(200),
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

const projectEvidenceSchema = z
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

const projectServiceRelationSchema = z
  .object({
    service_id: z.string().uuid(),
    name: z.string().nullable(),
    scope_label: z.string().nullable(),
    sort_order: z.number().int(),
  })
  .strict();

const projectStageSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    stage_date: z.string().nullable(),
    stage_status: z.string().nullable(),
    sort_order: z.number().int(),
    version: z.number().int().positive(),
  })
  .strict();

const projectMediaSchema = z
  .object({
    id: z.string().uuid(),
    media_asset_id: z.string().uuid(),
    role: z.string(),
    phase: z.string().nullable(),
    stage_id: z.string().uuid().nullable(),
    decorative: z.boolean(),
    credit: z.string().nullable(),
    sort_order: z.number().int(),
    public_status: z.string(),
    version: z.number().int().positive(),
    mime_type: z.string().nullable(),
    width: z.number().int().nullable(),
    height: z.number().int().nullable(),
    provenance_class: z.string().nullable(),
    storage_state: z.string().nullable(),
    asset_version: z.number().int().positive(),
    rights_status: z.string().nullable(),
    public_use_permission: z.string().nullable(),
    original_filename: z.string().nullable(),
    alt_text: z.string().nullable(),
    caption: z.string().nullable(),
    localization_version: z.number().int().nullable(),
  })
  .strict();

export const projectDetailSchema = z
  .object({
    project: z
      .object({
        id: z.string().uuid(),
        publication_status: z.enum(publicationStatuses),
        published_at: z.string().nullable(),
        public_location: z.string().nullable(),
        public_location_granularity: z.string().nullable(),
        project_type: z.string().nullable(),
        project_scope: z.string().nullable(),
        renz_role: z.string().nullable(),
        start_year: z.number().int().nullable(),
        completion_year: z.number().int().nullable(),
        delivery_status: z.string().nullable(),
        sort_order: z.number().int().nonnegative(),
        featured: z.boolean(),
        hero_asset_id: z.string().uuid().nullable(),
        reviewed_by: z.string().uuid().nullable(),
        reviewed_at: z.string().nullable(),
        created_at: z.string(),
        updated_at: z.string(),
        version: z.number().int().positive(),
      })
      .strict(),
    localization: z
      .object({
        locale: z.string(),
        slug: z.string(),
        title: z.string(),
        summary: z.string().nullable(),
        challenge: z.string().nullable(),
        approach: z.string().nullable(),
        solution: z.string().nullable(),
        outcomes: z.string().nullable(),
        seo_title: z.string().nullable(),
        seo_description: z.string().nullable(),
        version: z.number().int().positive(),
      })
      .strict()
      .nullable(),
    available_locales: z.array(z.string()),
    services: z.array(projectServiceRelationSchema),
    stages: z.array(projectStageSchema),
    media: z.array(projectMediaSchema),
    evidence: z.array(projectEvidenceSchema),
    readiness: z
      .object({
        ready: z.boolean(),
        reasons: z.array(readinessReasonSchema),
      })
      .strict(),
  })
  .strict();

export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectEvidence = z.infer<typeof projectEvidenceSchema>;
export type ProjectMedia = z.infer<typeof projectMediaSchema>;
export type ProjectStage = z.infer<typeof projectStageSchema>;

export const projectListResultSchema = z
  .object({
    items: z.array(
      z
        .object({
          id: z.string().uuid(),
          publication_status: z.enum(publicationStatuses),
          updated_at: z.string(),
          version: z.number().int().positive(),
          featured: z.boolean(),
          project_type: z.string().nullable(),
          public_location: z.string().nullable(),
          locale: z.string(),
          title: z.string(),
          slug: z.string(),
          readiness: z.enum(["ready", "blocked"]),
          blocker_count: z.number().int().nonnegative(),
          media_count: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    has_more: z.boolean(),
    next_cursor: z.object({ updated_at: z.string(), id: z.string().uuid() }).strict().nullable(),
  })
  .strict();
export type ProjectListResult = z.infer<typeof projectListResultSchema>;

export const projectOverviewSchema = z
  .object({
    draft: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    archived: z.number().int().nonnegative(),
    blocked: z.number().int().nonnegative(),
    media: z
      .object({
        total: z.number().int().nonnegative(),
        eligible: z.number().int().nonnegative(),
        rights_unknown: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();
export type ProjectOverview = z.infer<typeof projectOverviewSchema>;

export type ProjectActionState = Readonly<{
  status: "idle" | "error" | "success" | "conflict" | "reauth";
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  projectVersion: number | null;
  localizationVersion: number | null;
  reauthHref: string | null;
}>;

export const initialProjectActionState: ProjectActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  projectVersion: null,
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

export function projectCreateInput(formData: FormData) {
  return projectCreateSchema.safeParse({
    locale: formText(formData, "locale"),
    slug: formText(formData, "slug"),
    title: formText(formData, "title"),
  });
}

export function projectEditorInput(formData: FormData) {
  const granularity = formText(formData, "publicLocationGranularity");
  return projectEditorSchema.safeParse({
    projectId: formText(formData, "projectId"),
    projectVersion: formNumber(formData, "projectVersion"),
    localizationVersion: formNumber(formData, "localizationVersion"),
    locale: formText(formData, "locale"),
    slug: formText(formData, "slug"),
    title: formText(formData, "title"),
    summary: formText(formData, "summary"),
    challenge: formText(formData, "challenge"),
    approach: formText(formData, "approach"),
    solution: formText(formData, "solution"),
    outcomes: formText(formData, "outcomes"),
    seoTitle: formText(formData, "seoTitle"),
    seoDescription: formText(formData, "seoDescription"),
    publicLocation: formText(formData, "publicLocation"),
    publicLocationGranularity: granularity === "" ? null : granularity,
    projectType: formText(formData, "projectType"),
    projectScope: formText(formData, "projectScope"),
    renzRole: formText(formData, "renzRole"),
    deliveryStatus: formText(formData, "deliveryStatus"),
    startYear: formText(formData, "startYear"),
    completionYear: formText(formData, "completionYear"),
    sortOrder: formNumber(formData, "sortOrder"),
    featured: formData.get("featured") === "on",
    heroAssetId: formText(formData, "heroAssetId"),
  });
}

export function projectEvidenceInput(formData: FormData) {
  return projectEvidenceCreateSchema.safeParse({
    projectId: formText(formData, "projectId"),
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
    projectId: formText(formData, "projectId"),
    evidenceId: formText(formData, "evidenceId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function publicationActionInput(formData: FormData) {
  return publicationActionSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    operation: formText(formData, "operation"),
  });
}

export function projectReviewInput(formData: FormData) {
  return projectReviewSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function stageCreateInput(formData: FormData) {
  return stageCreateSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    sortOrder: formNumber(formData, "sortOrder"),
  });
}

export function stageEditInput(formData: FormData) {
  return stageEditSchema.safeParse({
    stageId: formText(formData, "stageId"),
    projectId: formText(formData, "projectId"),
    expectedStageVersion: formNumber(formData, "expectedStageVersion"),
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    sortOrder: formNumber(formData, "sortOrder"),
  });
}

export function stageDeleteInput(formData: FormData) {
  return stageDeleteSchema.safeParse({
    stageId: formText(formData, "stageId"),
    projectId: formText(formData, "projectId"),
    expectedStageVersion: formNumber(formData, "expectedStageVersion"),
  });
}

export function mediaAttachInput(formData: FormData) {
  return mediaAttachSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    mediaAssetId: formText(formData, "mediaAssetId"),
    role: formText(formData, "role"),
    phase: formText(formData, "phase"),
    stageId: formText(formData, "stageId"),
    decorative: formData.get("decorative") === "on",
    credit: formText(formData, "credit"),
    altText: formText(formData, "altText"),
    caption: formText(formData, "caption"),
  });
}

export function mediaUpdateInput(formData: FormData) {
  return mediaUpdateSchema.safeParse({
    projectMediaId: formText(formData, "projectMediaId"),
    projectId: formText(formData, "projectId"),
    expectedMediaVersion: formNumber(formData, "expectedMediaVersion"),
    expectedLocalizationVersion: formNumber(formData, "expectedLocalizationVersion"),
    role: formText(formData, "role"),
    phase: formText(formData, "phase"),
    stageId: formText(formData, "stageId"),
    decorative: formData.get("decorative") === "on",
    credit: formText(formData, "credit"),
    altText: formText(formData, "altText"),
    caption: formText(formData, "caption"),
  });
}

export function mediaRemoveInput(formData: FormData) {
  return mediaRemoveSchema.safeParse({
    projectMediaId: formText(formData, "projectMediaId"),
    projectId: formText(formData, "projectId"),
    expectedMediaVersion: formNumber(formData, "expectedMediaVersion"),
  });
}

export function mediaPromoteInput(formData: FormData) {
  return mediaPromoteSchema.safeParse({
    projectMediaId: formText(formData, "projectMediaId"),
    projectId: formText(formData, "projectId"),
    expectedMediaVersion: formNumber(formData, "expectedMediaVersion"),
    rightsHolder: formText(formData, "rightsHolder"),
    rightsSource: formText(formData, "rightsSource"),
    credit: formText(formData, "credit"),
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
