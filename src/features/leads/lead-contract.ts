import { z } from "zod";

import { DEFAULT_BUSINESS_TIMEZONE } from "@/lib/time/business-time";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";
import {
  currentStageLabels,
  leadTypeLabels,
  needLabels,
  projectTypeLabels,
  scaleBandLabels,
  type LeadType,
} from "@/features/intake/intake-policy";

export {
  zodFieldErrors,
  leadTypeLabels,
  needLabels,
  projectTypeLabels,
  currentStageLabels,
  scaleBandLabels,
};

// ---------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------

export const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "site_visit",
  "proposal",
  "won",
  "lost",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export const leadStatusLabels: Readonly<Record<LeadStatus, string>> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  site_visit: "Site Visit",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};
export const leadStatusTones: Readonly<
  Record<
    LeadStatus,
    "neutral" | "draft" | "published" | "archived" | "ready" | "blocked" | "review"
  >
> = {
  new: "review",
  contacted: "draft",
  qualified: "published",
  site_visit: "published",
  proposal: "published",
  won: "ready",
  lost: "archived",
};

export const leadSources = [
  "website_contact",
  "start_a_project",
  "service_page",
  "material_enquiry",
  "whatsapp",
  "manual",
  "referral",
  "other",
] as const;
export type LeadSource = (typeof leadSources)[number];
export const leadSourceLabels: Readonly<Record<LeadSource, string>> = {
  website_contact: "Website contact",
  start_a_project: "Start a Project",
  service_page: "Service page",
  material_enquiry: "Material enquiry",
  whatsapp: "WhatsApp",
  manual: "Manual",
  referral: "Referral",
  other: "Other",
};
export const staffSources = ["whatsapp", "manual", "referral", "other"] as const;

export const lostReasons = [
  "not_ready",
  "budget",
  "timeline",
  "not_a_fit",
  "unreachable",
  "chose_another_provider",
  "duplicate",
  "other",
] as const;
export type LostReason = (typeof lostReasons)[number];
export const lostReasonLabels: Readonly<Record<LostReason, string>> = {
  not_ready: "Not ready",
  budget: "Budget",
  timeline: "Timeline",
  not_a_fit: "Not a fit",
  unreachable: "Unreachable",
  chose_another_provider: "Chose another provider",
  duplicate: "Duplicate",
  other: "Other",
};

export const contactTypes = [
  "phone_call",
  "whatsapp",
  "email",
  "meeting",
  "site_visit",
  "other",
] as const;
export type ContactType = (typeof contactTypes)[number];
export const contactTypeLabels: Readonly<Record<ContactType, string>> = {
  phone_call: "Phone call",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  site_visit: "Site visit",
  other: "Other",
};

export const leadEventLabels: Readonly<Record<string, string>> = {
  submitted: "Lead submitted from the website",
  created_manual: "Lead created by staff",
  updated: "Lead details updated",
  assigned: "Assigned",
  unassigned: "Assignment cleared",
  contact_logged: "Contact logged",
  note_created: "Note added",
  status_changed: "Stage changed",
  converted_client: "Converted to client",
  project_created: "Operational project created",
  requirements_created: "Material requirements created",
  attachment_reviewed: "Attachment reviewed",
  archived: "Lead archived",
};

export const leadActivityLabels: Readonly<Record<string, string>> = {
  "lead.public_submit": "Lead submitted online",
  "lead.create_manual": "Lead created",
  "lead.update": "Lead updated",
  "lead.assign": "Lead assigned",
  "lead.status_change": "Lead stage changed",
  "lead.contact_log": "Lead contact logged",
  "lead.note_create": "Lead note added",
  "lead.convert_client": "Lead converted to client",
  "lead.convert_project": "Project created from lead",
  "lead.material_requirements_create": "Material requirements created from lead",
  "lead.attachment_review": "Lead attachment reviewed",
  "lead.archive": "Lead archived",
};

export const leadQueueLabels: Readonly<Record<string, string>> = {
  new_unassigned: "New lead, unassigned",
  new_uncontacted: "New lead not contacted",
  qualified_without_client: "Qualified without client",
  project_without_project: "Project lead without project",
  proposal_stale: "Proposal stale",
};

export const projectPhasesForConversion = [
  "design",
  "planning",
  "procurement",
  "structural",
  "execution",
  "finishing",
] as const;

// ---------------------------------------------------------------------
// Read schemas
// ---------------------------------------------------------------------

const nullableString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const leadSummarySchema = z.object({
  id: z.string().uuid(),
  reference: z.string(),
  lead_type: z.enum(["general", "project", "service", "material"]),
  source_channel: z.enum(leadSources),
  status: z.enum(leadStatuses),
  priority: z
    .enum(["low", "medium", "high"])
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  full_name: z.string(),
  company: nullableString,
  email: nullableString,
  phone_display: nullableString,
  summary: z.string(),
  service_key: nullableString,
  location_text: nullableString,
  assigned_to: nullableString,
  assigned_to_name: nullableString,
  client_id: nullableString,
  operational_project_id: nullableString,
  submitted_at: z.string(),
  last_activity_at: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  updated_at: z.string(),
  archived_at: nullableString,
  version: z.number().int(),
  attachment_count: z.number().int().optional().default(0),
});
export type LeadSummary = z.infer<typeof leadSummarySchema>;

export const leadListResultSchema = z.object({
  items: z.array(leadSummarySchema),
  has_more: z.boolean(),
  status_counts: z.record(z.string(), z.number()),
});
export type LeadListResult = z.infer<typeof leadListResultSchema>;

export const leadOverviewSchema = z.object({
  status_counts: z.record(z.string(), z.number()),
  type_counts: z.record(z.string(), z.number()),
  unassigned_count: z.number(),
  new_today_count: z.number(),
  my_open_count: z.number(),
  won_30d_count: z.number(),
  lost_30d_count: z.number(),
  uncontacted_hours: z.number().nullable(),
  proposal_stale_days: z.number().nullable(),
  recent: z.array(leadSummarySchema),
});
export type LeadOverview = z.infer<typeof leadOverviewSchema>;

export const leadQueueSchema = z.array(
  z.object({
    kind: z.string(),
    lead_id: z.string().uuid(),
    reference: z.string(),
    title: z.string(),
    detail: z.string(),
  }),
);
export type LeadQueueItem = z.infer<typeof leadQueueSchema>[number];

const timelineEntry = z
  .object({
    kind: z.enum(["status", "event", "contact"]),
    at: z.string(),
    from_status: nullableString,
    to_status: nullableString,
    reason_code: nullableString,
    event_type: nullableString,
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    contact_type: nullableString,
    note: nullableString,
    actor: nullableString,
  })
  .passthrough();
export type LeadTimelineEntry = z.infer<typeof timelineEntry>;

export const leadDetailSchema = z.object({
  lead: leadSummarySchema.extend({
    message: nullableString,
    preferred_contact: nullableString,
    service_id: nullableString,
    service_name: nullableString,
    lost_reason: nullableString,
    consent_revision: z
      .number()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    consented_at: nullableString,
    first_contact_at: nullableString,
    qualified_at: nullableString,
    site_visit_at: nullableString,
    won_at: nullableString,
    lost_at: nullableString,
    created_at: z.string(),
    created_by_name: nullableString,
    whatsapp_digits: nullableString,
    tel_href: nullableString,
  }),
  project_details: z
    .object({
      need_key: z.string(),
      project_type: z.string(),
      site_state: nullableString,
      floor_area_m2: z.union([z.number(), z.string()]).nullable().optional(),
      floors: z.number().nullable().optional(),
      units: z.number().nullable().optional(),
      site_area_m2: z.union([z.number(), z.string()]).nullable().optional(),
      scale_band: nullableString,
      start_timing: nullableString,
      completion_timing: nullableString,
      budget_preference: z.string(),
      budget_currency: nullableString,
      budget_min: z.union([z.number(), z.string()]).nullable().optional(),
      budget_max: z.union([z.number(), z.string()]).nullable().optional(),
      current_stage: nullableString,
      special_requirements: nullableString,
      source_context: nullableString,
    })
    .nullable(),
  service_details: z
    .object({
      service_key: z.string(),
      context_text: nullableString,
      requirement_text: z.string(),
      preferred_timing: nullableString,
    })
    .nullable(),
  material_items: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number(),
      description: z.string(),
      quantity: z.union([z.number(), z.string()]).nullable().optional(),
      unit: nullableString,
      specification: nullableString,
    }),
  ),
  attachments: z.array(
    z.object({
      id: z.string().uuid(),
      original_filename: z.string(),
      detected_mime_type: z.string(),
      byte_size: z.number(),
      scan_status: z.enum(["pending_review", "safe", "rejected"]),
      rejection_reason: nullableString,
      uploaded_at: z.string(),
      reviewed_at: nullableString,
      reviewed_by_name: nullableString,
    }),
  ),
  notes: z.array(
    z.object({
      id: z.string().uuid(),
      body: z.string(),
      created_at: z.string(),
      author: nullableString,
    }),
  ),
  contact_logs: z.array(
    z.object({
      id: z.string().uuid(),
      contact_type: z.enum(contactTypes),
      occurred_at: z.string(),
      note: nullableString,
      actor: nullableString,
    }),
  ),
  timeline: z.array(timelineEntry),
  possible_matches: z.object({
    leads: z.array(
      z.object({
        id: z.string().uuid(),
        reference: z.string(),
        full_name: z.string(),
        status: z.string(),
        lead_type: z.string(),
        submitted_at: z.string(),
        match_reason: z.string(),
      }),
    ),
    clients: z.array(
      z.object({
        id: z.string().uuid(),
        full_name: z.string(),
        company: nullableString,
        email: nullableString,
        phone_display: nullableString,
        archived_at: nullableString,
        match_reason: z.string(),
      }),
    ),
  }),
  client: z
    .object({
      id: z.string().uuid(),
      full_name: z.string(),
      company: nullableString,
      archived_at: nullableString,
    })
    .nullable(),
  operational_project: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      status: z.string(),
      current_phase: z.string(),
      archived_at: nullableString,
    })
    .nullable(),
  requirements_created: z.number(),
  permissions: z.object({
    write: z.boolean(),
    assign: z.boolean(),
    convert: z.boolean(),
    attachments: z.boolean(),
    clients_write: z.boolean(),
    projects_write: z.boolean(),
    materials_write: z.boolean(),
  }),
});
export type LeadDetail = z.infer<typeof leadDetailSchema>;

export const leadAssigneesSchema = z.array(
  z.object({ id: z.string().uuid(), display_name: nullableString }),
);
export type LeadAssignee = z.infer<typeof leadAssigneesSchema>[number];

export const intakeSettingsSchema = z.object({
  intake_enabled: z.boolean(),
  upload_policy: z.enum(["disabled", "images_only", "images_and_pdf"]),
  lead_uncontacted_hours: z.number().int(),
  proposal_stale_days: z.number().int(),
  version: z.number().int(),
  updated_at: z.string(),
});
export type IntakeSettings = z.infer<typeof intakeSettingsSchema>;

// ---------------------------------------------------------------------
// Form parsers (server actions)
// ---------------------------------------------------------------------

const uuid = z.string().uuid("Reload the page and try again.");
const version = z.number().int().positive("Reload the page and try again.");
const serviceKey = z
  .enum([
    "design",
    "executions",
    "hybrid-service",
    "supervision",
    "consultations",
    "not_sure",
    "other",
  ])
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value));
const priority = z
  .enum(["low", "medium", "high"])
  .or(z.literal(""))
  .transform((value) => (value === "" ? null : value));

export const leadCreateSchema = z
  .object({
    leadType: z.enum(["general", "project", "service", "material"]),
    sourceChannel: z.enum(staffSources),
    fullName: requiredText(2, 200),
    summary: requiredText(2, 200),
    email: optionalText(254),
    phone: optionalText(40),
    company: optionalText(200),
    location: optionalText(400),
    message: optionalText(4000),
    serviceKey,
    priority,
    assignToMe: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter an email address or a phone number.",
      });
    }
  });
export function leadCreateInput(formData: FormData) {
  return leadCreateSchema.safeParse({
    leadType: formText(formData, "leadType"),
    sourceChannel: formText(formData, "sourceChannel"),
    fullName: formText(formData, "fullName"),
    summary: formText(formData, "summary"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    company: formText(formData, "company"),
    location: formText(formData, "location"),
    message: formText(formData, "message"),
    serviceKey: formText(formData, "serviceKey"),
    priority: formText(formData, "priority"),
    assignToMe: formText(formData, "assignToMe") === "on",
  });
}

export const leadUpdateSchema = z
  .object({
    id: uuid,
    expectedVersion: version,
    fullName: requiredText(2, 200),
    summary: requiredText(2, 200),
    email: optionalText(254),
    phone: optionalText(40),
    company: optionalText(200),
    location: optionalText(400),
    preferredContact: z
      .enum(["whatsapp", "email", "phone", "none"])
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    serviceKey,
    serviceId: z
      .string()
      .uuid()
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    priority,
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter an email address or a phone number.",
      });
    }
  });
export function leadUpdateInput(formData: FormData) {
  return leadUpdateSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    fullName: formText(formData, "fullName"),
    summary: formText(formData, "summary"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    company: formText(formData, "company"),
    location: formText(formData, "location"),
    preferredContact: formText(formData, "preferredContact"),
    serviceKey: formText(formData, "serviceKey"),
    serviceId: formText(formData, "serviceId"),
    priority: formText(formData, "priority"),
  });
}

export const leadAssignSchema = z.object({
  id: uuid,
  expectedVersion: version,
  assignee: z.union([z.literal("me"), z.literal(""), z.string().uuid()]),
});
export function leadAssignInput(formData: FormData) {
  return leadAssignSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    assignee: formText(formData, "assignee"),
  });
}

export const leadStatusSchema = z
  .object({
    id: uuid,
    expectedVersion: version,
    status: z.enum(leadStatuses),
    reasonCode: z
      .enum(lostReasons)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    note: optionalText(4000),
  })
  .superRefine((value, ctx) => {
    if (value.status === "lost" && !value.reasonCode) {
      ctx.addIssue({
        code: "custom",
        path: ["reasonCode"],
        message: "Choose a reason for marking this lead lost.",
      });
    }
  });
export function leadStatusInput(formData: FormData) {
  return leadStatusSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    status: formText(formData, "status"),
    reasonCode: formText(formData, "reasonCode"),
    note: formText(formData, "note"),
  });
}

export const leadContactLogSchema = z.object({
  id: uuid,
  contactType: z.enum(contactTypes),
  // Local wall-clock time in the configured business timezone (the shape
  // `datetime-local` produces). Converted to a canonical instant server-side
  // with an explicit timezone — never by the server's own clock (C9 §9).
  occurredAt: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/u.test(value),
      "Enter a valid date and time.",
    )
    .transform((value) => (value === "" ? null : value)),
  note: optionalText(1000),
  markContacted: z.boolean(),
});
export function leadContactLogInput(formData: FormData) {
  return leadContactLogSchema.safeParse({
    id: formText(formData, "id"),
    contactType: formText(formData, "contactType"),
    occurredAt: formText(formData, "occurredAt"),
    note: formText(formData, "note"),
    markContacted: formText(formData, "markContacted") === "on",
  });
}

export const leadNoteSchema = z.object({ id: uuid, body: requiredText(1, 4000) });
export function leadNoteInput(formData: FormData) {
  return leadNoteSchema.safeParse({
    id: formText(formData, "id"),
    body: formText(formData, "body"),
  });
}

export const leadConvertClientSchema = z.object({
  id: uuid,
  expectedVersion: version,
  existingClientId: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value)),
  fullName: optionalText(200),
  email: optionalText(254),
  phone: optionalText(40),
  company: optionalText(200),
  address: optionalText(400),
  clientTier: z.enum(["standard", "vip", "premium"]).default("standard"),
});
export function leadConvertClientInput(formData: FormData) {
  return leadConvertClientSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    existingClientId: formText(formData, "existingClientId"),
    fullName: formText(formData, "fullName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    company: formText(formData, "company"),
    address: formText(formData, "address"),
    clientTier: formText(formData, "clientTier") || "standard",
  });
}

export const leadCreateProjectSchema = z.object({
  id: uuid,
  expectedVersion: version,
  title: requiredText(2, 200),
  phase: z.enum(projectPhasesForConversion),
  priority: z.enum(["low", "medium", "high"]),
  description: optionalText(4000),
  startDate: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/u.test(value), "Enter a valid date.")
    .transform((value) => (value === "" ? null : value)),
});
export function leadCreateProjectInput(formData: FormData) {
  return leadCreateProjectSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    title: formText(formData, "title"),
    phase: formText(formData, "phase"),
    priority: formText(formData, "priority") || "medium",
    description: formText(formData, "description"),
    startDate: formText(formData, "startDate"),
  });
}

const requirementItem = z.object({
  itemName: requiredText(1, 200),
  quantity: z.number().positive("Quantity must be positive."),
  unit: requiredText(1, 40),
  specification: optionalText(2000),
  requiredBy: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/u.test(value), "Enter a valid date.")
    .transform((value) => (value === "" ? null : value)),
  priority: z.enum(["low", "medium", "high"]),
});
export const leadRequirementsSchema = z.object({
  id: uuid,
  expectedVersion: version,
  items: z.array(requirementItem).min(1, "Select at least one item.").max(20),
});
export function leadRequirementsInput(formData: FormData) {
  const items: unknown[] = [];
  for (let index = 0; index < 20; index += 1) {
    if (formText(formData, `select_${index}`) !== "on") continue;
    items.push({
      itemName: formText(formData, `item_${index}_name`),
      quantity: formNumber(formData, `item_${index}_quantity`),
      unit: formText(formData, `item_${index}_unit`),
      specification: formText(formData, `item_${index}_specification`),
      requiredBy: formText(formData, `item_${index}_required_by`),
      priority: formText(formData, `item_${index}_priority`) || "medium",
    });
  }
  return leadRequirementsSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    items,
  });
}

export const leadArchiveSchema = z.object({ id: uuid, expectedVersion: version });
export function leadArchiveInput(formData: FormData) {
  return leadArchiveSchema.safeParse({
    id: formText(formData, "id"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export const attachmentReviewSchema = z.object({
  attachmentId: uuid,
  state: z.enum(["safe", "rejected"]),
  reason: optionalText(200),
});
export function attachmentReviewInput(formData: FormData) {
  return attachmentReviewSchema.safeParse({
    attachmentId: formText(formData, "attachmentId"),
    state: formText(formData, "state"),
    reason: formText(formData, "reason"),
  });
}

export const intakeSettingsInputSchema = z.object({
  expectedVersion: version,
  intakeEnabled: z.boolean(),
  uploadPolicy: z.enum(["disabled", "images_only", "images_and_pdf"]),
  leadUncontactedHours: z.number().int().min(1).max(720),
  proposalStaleDays: z.number().int().min(1).max(365),
});
export function intakeSettingsInput(formData: FormData) {
  return intakeSettingsInputSchema.safeParse({
    expectedVersion: formNumber(formData, "expectedVersion"),
    intakeEnabled: formText(formData, "intakeEnabled") === "on",
    uploadPolicy: formText(formData, "uploadPolicy"),
    leadUncontactedHours: formNumber(formData, "leadUncontactedHours"),
    proposalStaleDays: formNumber(formData, "proposalStaleDays"),
  });
}

// ---------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------

export function leadTypeLabel(type: string): string {
  return leadTypeLabels[type as LeadType] ?? type;
}

/** Instants are displayed in the configured business timezone (C9 §8). */
export function formatLeadDateTime(
  value: string | null,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatLeadDate(
  value: string | null,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }).format(new Date(value));
}

/** Lead age in whole hours/days for the register's age indicator. */
export function leadAge(submittedAt: string, now = Date.now()): string {
  const hours = Math.max(0, Math.floor((now - Date.parse(submittedAt)) / 3_600_000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`;
}
