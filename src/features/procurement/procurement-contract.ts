import { z } from "zod";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";

// ---------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------

export const poLifecycleStates = ["draft", "issued", "cancelled", "closed"] as const;
export type PoLifecycleState = (typeof poLifecycleStates)[number];
export const poLifecycleLabels: Readonly<Record<PoLifecycleState, string>> = {
  draft: "Draft",
  issued: "Issued",
  cancelled: "Cancelled",
  closed: "Closed",
};

export const deliveryStates = [
  "not_received",
  "partially_received",
  "received",
  "delayed",
] as const;
export type DeliveryState = (typeof deliveryStates)[number];
export const deliveryStateLabels: Readonly<Record<DeliveryState, string>> = {
  not_received: "Not received",
  partially_received: "Partially received",
  received: "Received",
  delayed: "Delayed",
};

export const approvalStates = ["draft", "approved", "cancelled"] as const;
export type ApprovalState = (typeof approvalStates)[number];
export const approvalStateLabels: Readonly<Record<ApprovalState, string>> = {
  draft: "Draft",
  approved: "Approved",
  cancelled: "Cancelled",
};

export const procurementStates = [
  "not_ordered",
  "partially_ordered",
  "ordered",
  "partially_received",
  "received",
] as const;
export type ProcurementState = (typeof procurementStates)[number];
export const procurementStateLabels: Readonly<Record<ProcurementState, string>> = {
  not_ordered: "Not ordered",
  partially_ordered: "Partially ordered",
  ordered: "Ordered",
  partially_received: "Partially received",
  received: "Received",
};

export const requirementPriorities = ["low", "medium", "high"] as const;
export type RequirementPriority = (typeof requirementPriorities)[number];
export const requirementPriorityLabels: Readonly<Record<RequirementPriority, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

/** Catalog taxonomy only — free text is still accepted. */
export const materialCategoryOptions = [
  "Cement & Aggregates",
  "Steel & Rebar",
  "Timber",
  "Roofing",
  "Blocks & Bricks",
  "Plumbing",
  "Electrical",
  "Finishes & Paint",
  "Tiles & Flooring",
  "Glass & Aluminium",
  "Tools & Consumables",
  "Other",
] as const;

export const unitOptions = [
  "bag",
  "kg",
  "tonne",
  "m",
  "m²",
  "m³",
  "piece",
  "roll",
  "sheet",
  "litre",
  "box",
  "set",
] as const;

/**
 * One display status for a purchase order, derived from the canonical
 * projection (lifecycle first, delivery state as a consequence).
 */
export function purchaseOrderStatus(
  order: Readonly<{
    lifecycle_state: PoLifecycleState;
    delivery_state: string;
    is_delayed?: boolean;
  }>,
): Readonly<{
  label: string;
  tone: "draft" | "archived" | "ready" | "review" | "blocked" | "neutral";
}> {
  if (order.lifecycle_state === "draft") return { label: "Draft", tone: "draft" };
  if (order.lifecycle_state === "cancelled") return { label: "Cancelled", tone: "archived" };
  if (order.lifecycle_state === "closed") return { label: "Closed", tone: "neutral" };
  if (order.is_delayed || order.delivery_state === "delayed")
    return { label: "Delayed", tone: "blocked" };
  if (order.delivery_state === "received") return { label: "Received", tone: "ready" };
  if (order.delivery_state === "partially_received")
    return { label: "Partially received", tone: "review" };
  return { label: "Issued · awaiting delivery", tone: "neutral" };
}

export function procurementStateTone(
  state: ProcurementState,
): "neutral" | "review" | "ready" | "draft" {
  switch (state) {
    case "received":
      return "ready";
    case "partially_received":
    case "ordered":
      return "review";
    case "partially_ordered":
      return "draft";
    case "not_ordered":
      return "neutral";
  }
}

export function approvalStateTone(state: ApprovalState): "draft" | "ready" | "archived" {
  return state === "approved" ? "ready" : state === "cancelled" ? "archived" : "draft";
}

// ---------------------------------------------------------------------
// Form contracts
// ---------------------------------------------------------------------

const dateOrNull = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date.")
      .nullable(),
  );

const requiredDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date.");

const uuidOrNull = (message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.string().uuid(message).nullable());

const currencyCode = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code."));

const quantityText = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,3})?$/u, message)
    .refine((value) => Number.parseFloat(value) > 0, message);

const taxRateText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? "0" : value))
  .pipe(
    z
      .string()
      .regex(/^\d{1,3}(\.\d{1,2})?$/u, "Enter a tax rate between 0 and 100.")
      .refine((value) => Number.parseFloat(value) <= 100, "Tax rate cannot exceed 100."),
  );

const versionField = z.number().int().positive();

// Materials --------------------------------------------------------------

const materialFields = {
  name: requiredText(1, 200),
  unit: requiredText(1, 40),
  code: optionalText(60),
  category: optionalText(80),
  specification: optionalText(2000),
  supplierId: uuidOrNull("Select a valid supplier."),
};

export const materialCreateSchema = z.object(materialFields).strict();
export const materialEditSchema = z
  .object({
    materialId: z.string().uuid(),
    expectedVersion: versionField,
    active: z.boolean(),
    ...materialFields,
  })
  .strict();
export const materialRefSchema = z
  .object({ materialId: z.string().uuid(), expectedVersion: versionField })
  .strict();

function materialFieldsFromForm(formData: FormData) {
  return {
    name: formText(formData, "name"),
    unit: formText(formData, "unit"),
    code: formText(formData, "code"),
    category: formText(formData, "category"),
    specification: formText(formData, "specification"),
    supplierId: formText(formData, "supplierId"),
  };
}

export function materialCreateInput(formData: FormData) {
  return materialCreateSchema.safeParse(materialFieldsFromForm(formData));
}
export function materialEditInput(formData: FormData) {
  return materialEditSchema.safeParse({
    materialId: formText(formData, "materialId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    active: formText(formData, "active") !== "false",
    ...materialFieldsFromForm(formData),
  });
}
export function materialRefInput(formData: FormData) {
  return materialRefSchema.safeParse({
    materialId: formText(formData, "materialId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

// Requirements -----------------------------------------------------------

const requirementFields = {
  itemName: requiredText(1, 200),
  quantity: quantityText("Enter a quantity greater than zero."),
  unit: requiredText(1, 40),
  materialId: uuidOrNull("Select a valid catalog material."),
  specification: optionalText(2000),
  requiredBy: dateOrNull,
  priority: z.enum(requirementPriorities),
  note: optionalText(2000),
  state: z.enum(approvalStates),
};

export const requirementCreateSchema = z
  .object({ projectId: z.string().uuid("Select a project."), ...requirementFields })
  .strict();
export const requirementEditSchema = z
  .object({
    requirementId: z.string().uuid(),
    expectedVersion: versionField,
    ...requirementFields,
  })
  .strict();

function requirementFieldsFromForm(formData: FormData) {
  return {
    itemName: formText(formData, "itemName"),
    quantity: formText(formData, "quantity"),
    unit: formText(formData, "unit"),
    materialId: formText(formData, "materialId"),
    specification: formText(formData, "specification"),
    requiredBy: formText(formData, "requiredBy"),
    priority: formText(formData, "priority") || "medium",
    note: formText(formData, "note"),
    state: formText(formData, "state") || "draft",
  };
}

export function requirementCreateInput(formData: FormData) {
  return requirementCreateSchema.safeParse({
    projectId: formText(formData, "projectId"),
    ...requirementFieldsFromForm(formData),
  });
}
export function requirementEditInput(formData: FormData) {
  return requirementEditSchema.safeParse({
    requirementId: formText(formData, "requirementId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    ...requirementFieldsFromForm(formData),
  });
}

// Purchase orders --------------------------------------------------------

export const poLineSchema = z
  .object({
    description: requiredText(1, 500),
    quantity: quantityText("Enter a quantity greater than zero."),
    unit_label: requiredText(1, 40),
    unit_price: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/u, "Enter a non-negative unit price (two decimals)."),
    material_requirement_id: uuidOrNull("Invalid requirement reference."),
    material_id: uuidOrNull("Invalid material reference."),
    over_order_confirmed: z.boolean(),
  })
  .strict();
export type PoLineInput = z.infer<typeof poLineSchema>;

const poDraftFields = {
  projectId: z.string().uuid("Select a project."),
  supplierId: z.string().uuid("Select a supplier."),
  currency: currencyCode,
  taxRate: taxRateText,
  reference: optionalText(120),
  expectedDeliveryDate: dateOrNull,
  notes: optionalText(4000),
  terms: optionalText(4000),
  lines: z.array(poLineSchema).max(100, "A purchase order may carry at most 100 lines."),
};

export const poCreateSchema = z.object(poDraftFields).strict();
export const poEditSchema = z
  .object({ orderId: z.string().uuid(), expectedVersion: versionField, ...poDraftFields })
  .strict();
export const poIssueSchema = z
  .object({
    orderId: z.string().uuid(),
    expectedVersion: versionField,
    issueDate: requiredDate,
    expectedDeliveryDate: dateOrNull,
  })
  .strict()
  .refine(
    (value) => value.expectedDeliveryDate === null || value.expectedDeliveryDate >= value.issueDate,
    { message: "Expected delivery cannot precede the issue date.", path: ["expectedDeliveryDate"] },
  );
export const poReasonSchema = z
  .object({
    orderId: z.string().uuid(),
    expectedVersion: versionField,
    reason: requiredText(3, 1000),
  })
  .strict();
export const poRefSchema = z.object({ orderId: z.string().uuid() }).strict();

export const receiptItemSchema = z
  .object({
    line_item_id: z.string().uuid(),
    quantity_received: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,3})?$/u, "Enter a non-negative quantity."),
  })
  .strict();
export const receiptRecordSchema = z
  .object({
    orderId: z.string().uuid(),
    receivedAt: requiredDate,
    reference: optionalText(120),
    note: optionalText(2000),
    items: z
      .array(receiptItemSchema)
      .min(1, "Enter at least one received quantity.")
      .refine(
        (items) => items.some((item) => Number.parseFloat(item.quantity_received) > 0),
        "Enter at least one received quantity greater than zero.",
      ),
  })
  .strict();
export const receiptReverseSchema = z
  .object({ receiptId: z.string().uuid(), reason: requiredText(3, 1000) })
  .strict();

function poLinesFromForm(formData: FormData): PoLineInput[] {
  const raw = formText(formData, "lines");
  if (raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const line =
        typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
      const text = (key: string) => {
        const value = line[key];
        return typeof value === "string" ? value : "";
      };
      return {
        description: text("description"),
        quantity: text("quantity"),
        unit_label: text("unit_label"),
        unit_price: text("unit_price"),
        material_requirement_id: text("material_requirement_id"),
        material_id: text("material_id"),
        over_order_confirmed: line["over_order_confirmed"] === true,
      };
    });
  } catch {
    return [];
  }
}

function poDraftFromForm(formData: FormData) {
  return {
    projectId: formText(formData, "projectId"),
    supplierId: formText(formData, "supplierId"),
    currency: formText(formData, "currency"),
    taxRate: formText(formData, "taxRate"),
    reference: formText(formData, "reference"),
    expectedDeliveryDate: formText(formData, "expectedDeliveryDate"),
    notes: formText(formData, "notes"),
    terms: formText(formData, "terms"),
    lines: poLinesFromForm(formData),
  };
}

export function poCreateInput(formData: FormData) {
  return poCreateSchema.safeParse(poDraftFromForm(formData));
}
export function poEditInput(formData: FormData) {
  return poEditSchema.safeParse({
    orderId: formText(formData, "orderId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    ...poDraftFromForm(formData),
  });
}
export function poIssueInput(formData: FormData) {
  return poIssueSchema.safeParse({
    orderId: formText(formData, "orderId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    issueDate: formText(formData, "issueDate"),
    expectedDeliveryDate: formText(formData, "expectedDeliveryDate"),
  });
}
export function poReasonInput(formData: FormData) {
  return poReasonSchema.safeParse({
    orderId: formText(formData, "orderId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    reason: formText(formData, "reason"),
  });
}
export function poRefInput(formData: FormData) {
  return poRefSchema.safeParse({ orderId: formText(formData, "orderId") });
}
export function receiptRecordInput(formData: FormData) {
  const items: unknown[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^received\[([0-9a-f-]{36})\]$/iu.exec(key);
    if (match && typeof value === "string" && value.trim() !== "") {
      items.push({ line_item_id: match[1], quantity_received: value });
    }
  }
  return receiptRecordSchema.safeParse({
    orderId: formText(formData, "orderId"),
    receivedAt: formText(formData, "receivedAt"),
    reference: formText(formData, "reference"),
    note: formText(formData, "note"),
    items,
  });
}
export function receiptReverseInput(formData: FormData) {
  return receiptReverseSchema.safeParse({
    receiptId: formText(formData, "receiptId"),
    reason: formText(formData, "reason"),
  });
}

// ---------------------------------------------------------------------
// Read projections
// ---------------------------------------------------------------------

const money = z.union([z.string(), z.number()]);
const partnerRef = z.object({ id: z.string().uuid(), display_name: z.string() });
const projectRef = z.object({ id: z.string().uuid(), title: z.string() });
const activitySchema = z.object({
  action: z.string(),
  outcome: z.string(),
  occurred_at: z.string(),
  actor: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const materialListItemSchema = z.object({
  id: z.string().uuid(),
  internal_code: z.string().nullable(),
  name: z.string(),
  category: z.string().nullable(),
  default_unit: z.string(),
  active: z.boolean(),
  archived_at: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int(),
  preferred_supplier: partnerRef.nullable(),
});
export type MaterialListItem = z.infer<typeof materialListItemSchema>;

export const materialListResultSchema = z.object({
  items: z.array(materialListItemSchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().nullable(),
});
export type MaterialListResult = z.infer<typeof materialListResultSchema>;

export const materialDetailSchema = z.object({
  material: materialListItemSchema.extend({
    specification: z.string().nullable(),
    created_at: z.string(),
  }),
  recent_orders: z.array(
    z.object({
      purchase_order_id: z.string().uuid(),
      purchase_order_number: z.string().nullable(),
      lifecycle_state: z.enum(poLifecycleStates),
      quantity: money,
      unit_label: z.string().nullable(),
      unit_price: money,
      currency: z.string(),
      issue_date: z.string().nullable(),
      supplier: z.string(),
    }),
  ),
  activity: z.array(activitySchema),
});
export type MaterialDetail = z.infer<typeof materialDetailSchema>;

export const materialPickerSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    internal_code: z.string().nullable(),
    default_unit: z.string(),
    category: z.string().nullable(),
    preferred_supplier_id: z.string().uuid().nullable(),
  }),
);
export type MaterialPickerEntry = z.infer<typeof materialPickerSchema>[number];

export const duplicateMaterialSchema = z.array(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    internal_code: z.string().nullable(),
    category: z.string().nullable(),
    match: z.enum(["code", "name"]),
  }),
);
export type DuplicateMaterial = z.infer<typeof duplicateMaterialSchema>[number];

export const requirementRowSchema = z.object({
  id: z.string().uuid(),
  item_name: z.string(),
  specification: z.string().nullable(),
  required_quantity: money,
  unit_label: z.string(),
  required_by: z.string().nullable(),
  priority: z.enum(requirementPriorities),
  approval_state: z.enum(approvalStates),
  private_note: z.string().nullable(),
  version: z.number().int(),
  updated_at: z.string(),
  material: z
    .object({ id: z.string().uuid(), name: z.string(), internal_code: z.string().nullable() })
    .nullable(),
  ordered_quantity: money,
  received_quantity: money,
  remaining_to_order: money,
  remaining_to_receive: money,
  procurement_state: z.enum(procurementStates),
});
export type RequirementRow = z.infer<typeof requirementRowSchema>;

export const projectOrderRowSchema = z.object({
  id: z.string().uuid(),
  purchase_order_number: z.string().nullable(),
  lifecycle_state: z.enum(poLifecycleStates),
  currency: z.string(),
  total: money,
  delivery_state: z.enum(deliveryStates),
  is_delayed: z.boolean(),
  expected_delivery_date: z.string().nullable(),
  issue_date: z.string().nullable(),
  updated_at: z.string(),
  ordered_quantity: money,
  received_quantity: money,
  remaining_quantity: money,
  supplier: partnerRef,
});

export const projectProcurementSchema = z.object({
  due_soon_window_days: z.number().int(),
  requirements: z.array(requirementRowSchema),
  purchase_orders: z.array(projectOrderRowSchema),
  ordered_value_by_currency: z.array(
    z.object({ currency: z.string(), total: money, order_count: z.number().int() }),
  ),
  summary: z.object({
    requirement_count: z.number().int(),
    open_order_count: z.number().int(),
    delayed_order_count: z.number().int(),
    received_requirement_count: z.number().int(),
  }),
});
export type ProjectProcurement = z.infer<typeof projectProcurementSchema>;

export const poListItemSchema = z.object({
  id: z.string().uuid(),
  purchase_order_number: z.string().nullable(),
  reference: z.string().nullable(),
  lifecycle_state: z.enum(poLifecycleStates),
  currency: z.string(),
  issue_date: z.string().nullable(),
  expected_delivery_date: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int(),
  supplier: partnerRef,
  project: projectRef,
  total: money,
  delivery_state: z.enum(deliveryStates),
  is_delayed: z.boolean(),
  ordered_quantity: money,
  received_quantity: money,
});
export type PoListItem = z.infer<typeof poListItemSchema>;

export const poListResultSchema = z.object({
  items: z.array(poListItemSchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().nullable(),
});
export type PoListResult = z.infer<typeof poListResultSchema>;

export const poDocumentSchema = z.object({
  id: z.string().uuid(),
  purchase_order_number: z.string().nullable(),
  lifecycle_state: z.enum(poLifecycleStates),
  currency: z.string(),
  tax_rate: money,
  issue_date: z.string().nullable(),
  expected_delivery_date: z.string().nullable(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  issuer: z
    .object({
      name: z.string(),
      email: z.string().optional(),
      whatsapp: z.string().optional(),
      tax_label: z.string().optional(),
    })
    .nullable(),
  supplier: z
    .object({
      display_name: z.string(),
      company_name: z.string().optional(),
      contact_name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .nullable(),
  project: z.object({ title: z.string(), id: z.string().optional() }).nullable(),
  lines: z.array(
    z.object({
      description: z.string(),
      quantity: money,
      unit_label: z.string().nullable(),
      unit_price: money,
      line_total: money,
      received_quantity: money,
    }),
  ),
  subtotal: money,
  tax_amount: money,
  total: money,
  delivery_state: z.enum(deliveryStates),
});
export type PoDocument = z.infer<typeof poDocumentSchema>;

export const poLineReadSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: money,
  unit_label: z.string(),
  unit_price: money,
  line_total: money,
  sort_order: z.number().int(),
  material_requirement_id: z.string().uuid().nullable(),
  material_id: z.string().uuid().nullable(),
  over_order_confirmed: z.boolean(),
  received_quantity: money,
  remaining_quantity: money,
  requirement: z
    .object({
      id: z.string().uuid(),
      item_name: z.string(),
      required_quantity: money,
      unit_label: z.string(),
    })
    .nullable(),
});
export type PoLineRead = z.infer<typeof poLineReadSchema>;

export const poFinancialsSchema = z.object({
  subtotal: money,
  tax_amount: money,
  total: money,
  ordered_quantity: money,
  received_quantity: money,
  remaining_quantity: money,
  delivery_state: z.enum(deliveryStates),
  is_delayed: z.boolean(),
});

export const poDetailSchema = z.object({
  purchase_order: z.object({
    id: z.string().uuid(),
    purchase_order_number: z.string().nullable(),
    reference: z.string().nullable(),
    lifecycle_state: z.enum(poLifecycleStates),
    currency: z.string(),
    tax_rate: money,
    issue_date: z.string().nullable(),
    expected_delivery_date: z.string().nullable(),
    notes: z.string().nullable(),
    terms: z.string().nullable(),
    version: z.number().int().positive(),
    created_at: z.string(),
    updated_at: z.string(),
    issued_at: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    cancel_reason: z.string().nullable(),
    closed_at: z.string().nullable(),
    close_reason: z.string().nullable(),
  }),
  supplier: partnerRef.extend({
    company_name: z.string().nullable(),
    email: z.string().nullable(),
    phone_display: z.string().nullable(),
    archived_at: z.string().nullable(),
    capabilities: z.array(z.string()),
  }),
  project: projectRef.extend({
    status: z.string(),
    archived_at: z.string().nullable(),
    client: z.object({ id: z.string().uuid(), full_name: z.string() }),
  }),
  lines: z.array(poLineReadSchema),
  financials: poFinancialsSchema,
  receipts: z.array(
    z.object({
      id: z.string().uuid(),
      received_at: z.string(),
      delivery_reference: z.string().nullable(),
      note: z.string().nullable(),
      created_at: z.string(),
      received_by: z.string().nullable(),
      reversed_at: z.string().nullable(),
      reversal_reason: z.string().nullable(),
      reversed_by: z.string().nullable(),
      items: z.array(
        z.object({
          line_item_id: z.string().uuid(),
          quantity_received: money,
          description: z.string(),
          unit_label: z.string().nullable(),
        }),
      ),
    }),
  ),
  share: z.object({ created_at: z.string(), created_by: z.string().nullable() }).nullable(),
  document: poDocumentSchema.nullable(),
  activity: z.array(activitySchema),
});
export type PoDetail = z.infer<typeof poDetailSchema>;

const currencyTotal = z.object({ currency: z.string(), total: money });

export const deliveryOverviewSchema = z.object({
  po_soon_window_days: z.number().int(),
  material_soon_window_days: z.number().int(),
  assignment_soon_window_days: z.number().int(),
  active_contractor_count: z.number().int().nullable(),
  active_assignment_count: z.number().int().nullable(),
  assignments_ending_soon: z.number().int().nullable(),
  contractor_outstanding_by_currency: z
    .array(currencyTotal.extend({ assignment_count: z.number().int() }))
    .nullable(),
  open_order_count: z.number().int().nullable(),
  delayed_order_count: z.number().int().nullable(),
  orders_expected_soon: z.number().int().nullable(),
  open_order_value_by_currency: z
    .array(currencyTotal.extend({ order_count: z.number().int() }))
    .nullable(),
  requirements_due_soon: z.number().int().nullable(),
  recent_receipts: z
    .array(
      z.object({
        id: z.string().uuid(),
        purchase_order_id: z.string().uuid(),
        purchase_order_number: z.string().nullable(),
        received_at: z.string(),
        supplier: z.string(),
        project: z.string(),
      }),
    )
    .nullable(),
});
export type DeliveryOverview = z.infer<typeof deliveryOverviewSchema>;

export const deliveryQueueKinds = [
  "po_delayed",
  "po_expected_soon",
  "material_due_soon",
  "assignment_ending_soon",
  "assignment_unrated",
  "assignment_balance_remaining",
] as const;
export type DeliveryQueueKind = (typeof deliveryQueueKinds)[number];
export const deliveryQueueLabels: Readonly<Record<DeliveryQueueKind, string>> = {
  po_delayed: "Purchase order delayed",
  po_expected_soon: "Delivery expected soon",
  material_due_soon: "Material required soon",
  assignment_ending_soon: "Assignment ending soon",
  assignment_unrated: "Completed — rate performance",
  assignment_balance_remaining: "Completed with balance remaining",
};

export const deliveryQueueSchema = z.array(
  z.object({
    kind: z.enum(deliveryQueueKinds),
    entity: z.enum(["purchase_order", "operational_project", "contractor_assignment"]),
    id: z.string().uuid(),
    label: z.string().nullable(),
    detail: z.string().nullable(),
  }),
);
export type DeliveryQueueItem = z.infer<typeof deliveryQueueSchema>[number];

export function deliveryQueueHref(item: DeliveryQueueItem): string {
  switch (item.entity) {
    case "purchase_order":
      return `/admin/procurement/orders/${item.id}`;
    case "operational_project":
      return `/admin/operations/projects/${item.id}?tab=procurement`;
    case "contractor_assignment":
      return `/admin/operations/assignments/${item.id}`;
  }
}

export const projectDeliverySummarySchema = z.object({
  by_currency: z.array(
    z.object({
      currency: z.string(),
      budget: money.nullable(),
      client_invoiced: money.nullable(),
      client_paid: money.nullable(),
      contractor_committed: money.nullable(),
      contractor_paid: money.nullable(),
      material_ordered: money.nullable(),
    }),
  ),
  active_contractor_count: z.number().int().nullable(),
  requirement_count: z.number().int().nullable(),
  open_order_count: z.number().int().nullable(),
  delayed_order_count: z.number().int().nullable(),
  received_requirement_count: z.number().int().nullable(),
});
export type ProjectDeliverySummary = z.infer<typeof projectDeliverySummarySchema>;

export const procurementActivityLabels: Readonly<Record<string, string>> = {
  "material.create": "Material created",
  "material.update": "Material updated",
  "material.archive": "Material archived",
  "material_requirement.create": "Requirement added",
  "material_requirement.update": "Requirement updated",
  "purchase_order.create": "Purchase order created",
  "purchase_order.update": "Draft updated",
  "purchase_order.issue": "Purchase order issued",
  "purchase_order.cancel": "Purchase order cancelled",
  "purchase_order.close": "Purchase order closed",
  "purchase_order.share_create": "Supplier link generated",
  "purchase_order.share_revoke": "Supplier link revoked",
  "goods_receipt.record": "Delivery received",
  "goods_receipt.reverse": "Delivery receipt reversed",
};

export { zodFieldErrors };
