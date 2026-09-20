import { z } from "zod";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";

export const partnerCapabilities = ["contractor", "supplier"] as const;
export type PartnerCapability = (typeof partnerCapabilities)[number];
export const partnerCapabilityLabels: Readonly<Record<PartnerCapability, string>> = {
  contractor: "Contractor",
  supplier: "Supplier",
};

export const availabilityStatuses = ["available", "busy", "unavailable"] as const;
export type AvailabilityStatus = (typeof availabilityStatuses)[number];
export const availabilityLabels: Readonly<Record<AvailabilityStatus, string>> = {
  available: "Available",
  busy: "Busy",
  unavailable: "Unavailable",
};

/** Taxonomy options only — never claims about actual RENZ contractors. */
export const specializationOptions = [
  "Masonry",
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Steelwork",
  "Roofing",
  "Painting",
  "Tiling",
  "Glazing",
  "Landscaping",
  "General Works",
] as const;

const specializationList = z
  .array(requiredText(1, 60))
  .max(20, "At most 20 specializations.")
  .transform((values) => [...new Set(values.map((value) => value.trim()))]);

const partnerFields = {
  displayName: requiredText(1, 200),
  companyName: optionalText(200),
  contactName: optionalText(200),
  email: optionalText(254),
  phone: optionalText(40),
  address: optionalText(400),
  notes: optionalText(4000),
  specializations: specializationList,
  availability: z.enum(availabilityStatuses),
};

export const partnerCreateSchema = z
  .object({
    ...partnerFields,
    capabilities: z
      .array(z.enum(partnerCapabilities))
      .min(1, "Choose at least one capability.")
      .transform((values) => [...new Set(values)]),
  })
  .strict();

export const partnerEditSchema = z
  .object({
    partnerId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    ...partnerFields,
  })
  .strict();

export const partnerRefSchema = z
  .object({ partnerId: z.string().uuid(), expectedVersion: z.number().int().positive() })
  .strict();

export const partnerCapabilitySchema = partnerRefSchema
  .extend({ capability: z.enum(partnerCapabilities) })
  .strict();

function specializationsFromForm(formData: FormData): string[] {
  return formData
    .getAll("specializations")
    .filter((value): value is string => typeof value === "string" && value.trim() !== "");
}

function partnerFieldsFromForm(formData: FormData) {
  return {
    displayName: formText(formData, "displayName"),
    companyName: formText(formData, "companyName"),
    contactName: formText(formData, "contactName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    address: formText(formData, "address"),
    notes: formText(formData, "notes"),
    specializations: specializationsFromForm(formData),
    availability: formText(formData, "availability") || "available",
  };
}

export function partnerCreateInput(formData: FormData) {
  return partnerCreateSchema.safeParse({
    ...partnerFieldsFromForm(formData),
    capabilities: formData
      .getAll("capabilities")
      .filter((value): value is string => typeof value === "string"),
  });
}

export function partnerEditInput(formData: FormData) {
  return partnerEditSchema.safeParse({
    partnerId: formText(formData, "partnerId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    ...partnerFieldsFromForm(formData),
  });
}

export function partnerRefInput(formData: FormData) {
  return partnerRefSchema.safeParse({
    partnerId: formText(formData, "partnerId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function partnerCapabilityInput(formData: FormData) {
  return partnerCapabilitySchema.safeParse({
    partnerId: formText(formData, "partnerId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    capability: formText(formData, "capability"),
  });
}

// ---------------------------------------------------------------------
// Read projections
// ---------------------------------------------------------------------

const money = z.union([z.string(), z.number()]);

export const currencyBalanceSchema = z.object({
  currency: z.string(),
  agreed: money,
  paid: money,
  remaining: money,
  assignment_count: z.number().int(),
});

export const partnerSummarySchema = z.object({
  id: z.string().uuid(),
  capabilities: z.array(z.enum(partnerCapabilities)),
  display_name: z.string(),
  company_name: z.string().nullable(),
  contact_name: z.string().nullable(),
  email: z.string().nullable(),
  phone_display: z.string().nullable(),
  address: z.string().nullable(),
  specializations: z.array(z.string()),
  availability_status: z.enum(availabilityStatuses),
  version: z.number().int().positive(),
  updated_at: z.string(),
  created_at: z.string(),
  archived_at: z.string().nullable(),
  active_assignment_count: z.number().int(),
  open_order_count: z.number().int(),
  performance: z.object({
    average_rating: money.nullable(),
    rated_count: z.number().int().nullable(),
  }),
  outstanding_by_currency: z.array(currencyBalanceSchema),
});
export type PartnerSummary = z.infer<typeof partnerSummarySchema>;

export const partnerListResultSchema = z.object({
  items: z.array(partnerSummarySchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().nullable(),
});
export type PartnerListResult = z.infer<typeof partnerListResultSchema>;

export const assignmentStatuses = [
  "planned",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export const assignmentStatusLabels: Readonly<Record<AssignmentStatus, string>> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const partnerAssignmentRowSchema = z.object({
  id: z.string().uuid(),
  scope: z.string(),
  specialization: z.string().nullable(),
  status: z.enum(assignmentStatuses),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  currency: z.string().nullable(),
  agreed_amount: money.nullable(),
  paid_amount: money,
  remaining_amount: money.nullable(),
  payment_state: z.enum(["unpaid", "partially_paid", "paid"]),
  performance_rating: z.number().int().nullable(),
  updated_at: z.string(),
  project: z.object({ id: z.string().uuid(), title: z.string() }),
});

export const partnerDetailSchema = z.object({
  partner: partnerSummarySchema.extend({ notes: z.string().nullable() }),
  assignments: z.array(partnerAssignmentRowSchema),
  purchase_orders: z.array(
    z.object({
      id: z.string().uuid(),
      purchase_order_number: z.string().nullable(),
      lifecycle_state: z.enum(["draft", "issued", "cancelled", "closed"]),
      currency: z.string(),
      total: money,
      delivery_state: z.string(),
      expected_delivery_date: z.string().nullable(),
      issue_date: z.string().nullable(),
      project: z.object({ id: z.string().uuid(), title: z.string() }),
    }),
  ),
  rated_assignments: z.array(
    z.object({
      id: z.string().uuid(),
      scope: z.string(),
      performance_rating: z.number().int(),
      performance_note: z.string().nullable(),
      end_date: z.string().nullable(),
      project: z.object({ id: z.string().uuid(), title: z.string() }),
    }),
  ),
  activity: z.array(
    z.object({
      action: z.string(),
      outcome: z.string(),
      occurred_at: z.string(),
      actor: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).nullable(),
    }),
  ),
});
export type PartnerDetail = z.infer<typeof partnerDetailSchema>;

export const partnerPickerSchema = z.array(
  z.object({
    id: z.string().uuid(),
    display_name: z.string(),
    company_name: z.string().nullable(),
    availability_status: z.enum(availabilityStatuses),
    specializations: z.array(z.string()),
  }),
);
export type PartnerPickerEntry = z.infer<typeof partnerPickerSchema>[number];

export const duplicatePartnerSchema = z.array(
  z.object({
    id: z.string().uuid(),
    display_name: z.string(),
    company_name: z.string().nullable(),
    capabilities: z.array(z.enum(partnerCapabilities)),
    email: z.string().nullable(),
    phone_display: z.string().nullable(),
    archived_at: z.string().nullable(),
    match: z.enum(["email", "phone", "name"]),
  }),
);
export type DuplicatePartner = z.infer<typeof duplicatePartnerSchema>[number];

export const partnerActivityLabels: Readonly<Record<string, string>> = {
  "partner.create": "Partner created",
  "partner.update": "Partner updated",
  "partner.archive": "Partner archived",
  "partner.capability_change": "Capability added",
  "assignment.create": "Assignment created",
  "assignment.status_change": "Assignment status changed",
  "assignment.performance_rate": "Performance review added",
  "contractor.payment_record": "Payment recorded",
  "contractor.payment_reverse": "Payment reversed",
  "purchase_order.issue": "Purchase order issued",
  "purchase_order.cancel": "Purchase order cancelled",
  "purchase_order.close": "Purchase order closed",
  "goods_receipt.record": "Delivery received",
};

export function ratingLabel(rating: number | string | null | undefined): string {
  if (rating === null || rating === undefined) return "Not yet rated";
  const numeric = typeof rating === "string" ? Number.parseFloat(rating) : rating;
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(numeric)} / 5`;
}

export const ratingScale: readonly Readonly<{ value: number; label: string }>[] = [
  { value: 1, label: "1 — Poor" },
  { value: 2, label: "2 — Below expectations" },
  { value: 3, label: "3 — Meets expectations" },
  { value: 4, label: "4 — Very good" },
  { value: 5, label: "5 — Excellent" },
];

export { zodFieldErrors };
