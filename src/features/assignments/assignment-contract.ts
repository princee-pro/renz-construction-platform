import { z } from "zod";

import {
  formNumber,
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";
import { paymentMethods } from "@/features/invoices/invoice-contract";
import {
  assignmentStatuses,
  availabilityStatuses,
  type AssignmentStatus,
} from "@/features/partners/partner-contract";

export { assignmentStatuses, assignmentStatusLabels } from "@/features/partners/partner-contract";

export const rateTypes = ["fixed_project", "hourly", "daily", "monthly"] as const;
export type RateType = (typeof rateTypes)[number];
export const rateTypeLabels: Readonly<Record<RateType, string>> = {
  fixed_project: "Fixed Project",
  hourly: "Per Hour",
  daily: "Per Day",
  monthly: "Per Month",
};
export const rateUnitLabels: Readonly<Record<RateType, string>> = {
  fixed_project: "project",
  hourly: "hour",
  daily: "day",
  monthly: "month",
};

const money = z.union([z.string(), z.number()]);
const dateOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date.")
      .nullable(),
  );
const decimalOrNull = (message: string, decimals: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(new RegExp(`^\\d{1,12}(\\.\\d{1,${decimals}})?$`, "u"), message)
        .nullable(),
    );
const currencyOrNull = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toUpperCase()))
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code.")
      .nullable(),
  );

const assignmentFields = {
  scope: requiredText(1, 500),
  specialization: optionalText(80),
  startDate: dateOrNull,
  endDate: dateOrNull,
  rateType: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.enum(rateTypes).nullable()),
  rateAmount: decimalOrNull("Enter a non-negative rate.", 2),
  currency: currencyOrNull,
  plannedUnits: decimalOrNull("Enter planned units greater than zero.", 3),
  agreedAmount: decimalOrNull("Enter a non-negative agreed amount.", 2),
  paymentTerms: optionalText(2000),
};

type FinanceShape = {
  startDate: string | null;
  endDate: string | null;
  rateType: RateType | null;
  rateAmount: string | null;
  currency: string | null;
  agreedAmount: string | null;
};

const financeRefinements = <T extends FinanceShape>(schema: z.ZodType<T>) =>
  schema
    .refine((v) => v.startDate === null || v.endDate === null || v.endDate >= v.startDate, {
      message: "End date cannot precede the start date.",
      path: ["endDate"],
    })
    .refine((v) => (v.rateAmount === null && v.agreedAmount === null) || v.currency !== null, {
      message: "A currency is required when a rate or agreed amount is set.",
      path: ["currency"],
    })
    .refine((v) => v.rateAmount === null || v.rateType !== null, {
      message: "Choose a rate type for the rate.",
      path: ["rateType"],
    });

export const assignmentCreateSchema = financeRefinements(
  z
    .object({
      projectId: z.string().uuid("Select a project."),
      partnerId: z.string().uuid("Select a contractor."),
      status: z.enum(assignmentStatuses),
      ...assignmentFields,
    })
    .strict(),
);

export const assignmentEditSchema = financeRefinements(
  z
    .object({
      assignmentId: z.string().uuid(),
      expectedVersion: z.number().int().positive(),
      ...assignmentFields,
    })
    .strict(),
);

export const assignmentStatusSchema = z
  .object({
    assignmentId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    nextStatus: z.enum(assignmentStatuses),
  })
  .strict();
export const assignmentAdjustSchema = z
  .object({
    assignmentId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    newAmount: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/u, "Enter a non-negative amount."),
    reason: requiredText(3, 1000),
  })
  .strict();
export const assignmentRateSchema = z
  .object({
    assignmentId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    rating: z.number().int().min(1, "Choose a rating.").max(5),
    note: optionalText(2000),
  })
  .strict();
export const contractorPaymentSchema = z
  .object({
    assignmentId: z.string().uuid(),
    amount: z
      .string()
      .trim()
      .regex(/^\d{1,12}(\.\d{1,2})?$/u, "Enter an amount with at most two decimals.")
      .refine((v) => Number.parseFloat(v) > 0, "Amount must be greater than zero."),
    paymentDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/u, "Enter a valid date."),
    paymentMethod: z.enum(paymentMethods),
    reference: optionalText(120),
    note: optionalText(2000),
  })
  .strict();
export const contractorReverseSchema = z
  .object({ paymentId: z.string().uuid(), reason: requiredText(3, 1000) })
  .strict();

function assignmentFieldsFromForm(formData: FormData) {
  return {
    scope: formText(formData, "scope"),
    specialization: formText(formData, "specialization"),
    startDate: formText(formData, "startDate"),
    endDate: formText(formData, "endDate"),
    rateType: formText(formData, "rateType"),
    rateAmount: formText(formData, "rateAmount"),
    currency: formText(formData, "currency"),
    plannedUnits: formText(formData, "plannedUnits"),
    agreedAmount: formText(formData, "agreedAmount"),
    paymentTerms: formText(formData, "paymentTerms"),
  };
}

export function assignmentCreateInput(formData: FormData) {
  return assignmentCreateSchema.safeParse({
    projectId: formText(formData, "projectId"),
    partnerId: formText(formData, "partnerId"),
    status: formText(formData, "status") || "planned",
    ...assignmentFieldsFromForm(formData),
  });
}
export function assignmentEditInput(formData: FormData) {
  return assignmentEditSchema.safeParse({
    assignmentId: formText(formData, "assignmentId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    ...assignmentFieldsFromForm(formData),
  });
}
export function assignmentStatusInput(formData: FormData) {
  return assignmentStatusSchema.safeParse({
    assignmentId: formText(formData, "assignmentId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    nextStatus: formText(formData, "nextStatus"),
  });
}
export function assignmentAdjustInput(formData: FormData) {
  return assignmentAdjustSchema.safeParse({
    assignmentId: formText(formData, "assignmentId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    newAmount: formText(formData, "newAmount"),
    reason: formText(formData, "reason"),
  });
}
export function assignmentRateInput(formData: FormData) {
  return assignmentRateSchema.safeParse({
    assignmentId: formText(formData, "assignmentId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    rating: formNumber(formData, "rating"),
    note: formText(formData, "note"),
  });
}
export function contractorPaymentInput(formData: FormData) {
  return contractorPaymentSchema.safeParse({
    assignmentId: formText(formData, "assignmentId"),
    amount: formText(formData, "amount"),
    paymentDate: formText(formData, "paymentDate"),
    paymentMethod: formText(formData, "paymentMethod"),
    reference: formText(formData, "reference"),
    note: formText(formData, "note"),
  });
}
export function contractorReverseInput(formData: FormData) {
  return contractorReverseSchema.safeParse({
    paymentId: formText(formData, "paymentId"),
    reason: formText(formData, "reason"),
  });
}

/** Suggested planned value = rate × planned units (display only; the agreed amount is the obligation). */
export function suggestedPlannedValue(
  rateAmount: string,
  plannedUnits: string,
  rateType: string,
): number | null {
  if (rateType === "fixed_project") return Number.parseFloat(rateAmount) || null;
  const rate = Number.parseFloat(rateAmount);
  const units = Number.parseFloat(plannedUnits);
  if (!Number.isFinite(rate) || !Number.isFinite(units)) return null;
  return Math.round((rate * units + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------
// Read projections
// ---------------------------------------------------------------------

const financialsSchema = z.object({
  agreed_amount: money.nullable(),
  paid_amount: money,
  remaining_amount: money.nullable(),
  payment_state: z.enum(["unpaid", "partially_paid", "paid"]),
});

export const assignmentDetailSchema = z.object({
  assignment: z.object({
    id: z.string().uuid(),
    scope: z.string(),
    specialization: z.string().nullable(),
    status: z.enum(assignmentStatuses),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    rate_type: z.enum(rateTypes).nullable(),
    rate_amount: money.nullable(),
    currency: z.string().nullable(),
    planned_units: money.nullable(),
    agreed_amount: money.nullable(),
    payment_terms: z.string().nullable(),
    performance_rating: z.number().int().nullable(),
    performance_note: z.string().nullable(),
    version: z.number().int().positive(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
  }),
  project: z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    archived_at: z.string().nullable(),
  }),
  partner: z.object({
    id: z.string().uuid(),
    display_name: z.string(),
    company_name: z.string().nullable(),
    availability_status: z.enum(availabilityStatuses),
    archived_at: z.string().nullable(),
  }),
  financials: financialsSchema,
  payments: z.array(
    z.object({
      id: z.string().uuid(),
      amount: money,
      payment_date: z.string(),
      payment_method: z.enum(paymentMethods),
      reference: z.string().nullable(),
      note: z.string().nullable(),
      created_at: z.string(),
      recorded_by: z.string().nullable(),
      reversed_at: z.string().nullable(),
      reversal_reason: z.string().nullable(),
      reversed_by: z.string().nullable(),
    }),
  ),
  adjustments: z.array(
    z.object({
      id: z.string().uuid(),
      previous_amount: money.nullable(),
      new_amount: money,
      reason: z.string(),
      created_at: z.string(),
      actor: z.string().nullable(),
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
export type AssignmentDetail = z.infer<typeof assignmentDetailSchema>;

export const projectContractorsSchema = z.object({
  assignments: z.array(
    z.object({
      id: z.string().uuid(),
      scope: z.string(),
      specialization: z.string().nullable(),
      status: z.enum(assignmentStatuses),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      rate_type: z.enum(rateTypes).nullable(),
      rate_amount: money.nullable(),
      currency: z.string().nullable(),
      planned_units: money.nullable(),
      agreed_amount: money.nullable(),
      paid_amount: money,
      remaining_amount: money.nullable(),
      payment_state: z.enum(["unpaid", "partially_paid", "paid"]),
      performance_rating: z.number().int().nullable(),
      version: z.number().int(),
      updated_at: z.string(),
      partner: z.object({
        id: z.string().uuid(),
        display_name: z.string(),
        company_name: z.string().nullable(),
        availability_status: z.enum(availabilityStatuses),
      }),
    }),
  ),
  summary_by_currency: z.array(
    z.object({
      currency: z.string(),
      committed: money,
      paid: money,
      remaining: money,
      assignment_count: z.number().int(),
    }),
  ),
  active_count: z.number().int(),
});
export type ProjectContractors = z.infer<typeof projectContractorsSchema>;

export const payablesResultSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      scope: z.string(),
      status: z.enum(assignmentStatuses),
      currency: z.string().nullable(),
      updated_at: z.string(),
      version: z.number().int(),
      agreed_amount: money.nullable(),
      paid_amount: money,
      remaining_amount: money.nullable(),
      payment_state: z.enum(["unpaid", "partially_paid", "paid"]),
      partner: z.object({ id: z.string().uuid(), display_name: z.string() }),
      project: z.object({ id: z.string().uuid(), title: z.string() }),
      last_payment_date: z.string().nullable(),
    }),
  ),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().nullable(),
});
export type PayablesResult = z.infer<typeof payablesResultSchema>;

export function assignmentStatusTone(
  status: AssignmentStatus,
): "neutral" | "draft" | "ready" | "review" | "blocked" | "archived" {
  switch (status) {
    case "planned":
      return "draft";
    case "active":
      return "ready";
    case "on_hold":
      return "review";
    case "completed":
      return "neutral";
    case "cancelled":
      return "archived";
  }
}

export function paymentStateTone(state: string): "neutral" | "review" | "ready" {
  return state === "paid" ? "ready" : state === "partially_paid" ? "review" : "neutral";
}

export const paymentStateLabels: Readonly<Record<string, string>> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
};

export const assignmentActivityLabels: Readonly<Record<string, string>> = {
  "assignment.create": "Assignment created",
  "assignment.update": "Assignment updated",
  "assignment.status_change": "Status changed",
  "assignment.finance_adjustment": "Agreed amount adjusted",
  "assignment.performance_rate": "Performance review added",
  "contractor.payment_record": "Payment recorded",
  "contractor.payment_reverse": "Payment reversed",
};

export { zodFieldErrors };
