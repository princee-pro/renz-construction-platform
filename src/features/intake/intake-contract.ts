import { z } from "zod";

import {
  formText,
  optionalText,
  requiredText,
  zodFieldErrors,
} from "@/features/admin-shared/action-state";
import {
  budgetCurrencies,
  budgetPreferences,
  currentStages,
  honeypotFieldName,
  needKeys,
  preferredContacts,
  projectTypes,
  scaleBands,
  serviceKeys,
} from "@/features/intake/intake-policy";

export { zodFieldErrors };

// ---------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------

const email = z
  .string()
  .trim()
  .max(254, "Email is too long.")
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value),
    "Enter a valid email address.",
  )
  .transform((value) => (value === "" ? null : value));

const phone = z
  .string()
  .trim()
  .max(40, "Phone number is too long.")
  .refine(
    (value) => value === "" || value.replace(/[^0-9]/gu, "").length >= 6,
    "Enter a valid phone or WhatsApp number.",
  )
  .transform((value) => (value === "" ? null : value));

const contactCore = {
  fullName: requiredText(2, 200),
  email,
  phone,
  company: optionalText(200),
  privacy: z.literal("on", {
    message: "Please tick the box to confirm you have read the privacy notice.",
  }),
  formToken: z.string().min(1, "Reload the page and try again."),
  turnstileToken: z.string().max(4096).optional(),
  [honeypotFieldName]: z.string().max(400).optional(),
};

function requireContactMethod<T extends { email: string | null; phone: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
): void {
  if (!value.email && !value.phone) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "Enter your email address or your phone / WhatsApp number.",
    });
  }
}

function formObject(formData: FormData, keys: readonly string[]): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const key of keys) entries[key] = formText(formData, key);
  return entries;
}

const baseKeys = [
  "fullName",
  "email",
  "phone",
  "company",
  "privacy",
  "formToken",
  "turnstileToken",
  honeypotFieldName,
] as const;

// ---------------------------------------------------------------------
// General contact
// ---------------------------------------------------------------------

export const contactSchema = z
  .object({
    ...contactCore,
    subject: requiredText(2, 200),
    message: requiredText(10, 4000),
  })
  .superRefine(requireContactMethod);
export type ContactInput = z.infer<typeof contactSchema>;

export function contactInput(formData: FormData) {
  return contactSchema.safeParse(formObject(formData, [...baseKeys, "subject", "message"]));
}

// ---------------------------------------------------------------------
// Service enquiry
// ---------------------------------------------------------------------

export const serviceEnquirySchema = z
  .object({
    ...contactCore,
    serviceKey: z.enum(serviceKeys as unknown as [string, ...string[]], {
      message: "Choose one service.",
    }),
    context: optionalText(1000),
    requirement: requiredText(10, 2000),
    timing: optionalText(120),
  })
  .superRefine(requireContactMethod);
export type ServiceEnquiryInput = z.infer<typeof serviceEnquirySchema>;

export function serviceEnquiryInput(formData: FormData) {
  return serviceEnquirySchema.safeParse(
    formObject(formData, [...baseKeys, "serviceKey", "context", "requirement", "timing"]),
  );
}

// ---------------------------------------------------------------------
// Material enquiry
// ---------------------------------------------------------------------

const materialItem = z.object({
  description: requiredText(2, 300),
  quantity: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (Number.isFinite(Number(value)) && Number(value) > 0),
      "Enter a positive quantity.",
    )
    .transform((value) => (value === "" ? null : Number(value))),
  unit: optionalText(40),
  specification: optionalText(1000),
});

export const materialEnquirySchema = z
  .object({
    ...contactCore,
    location: optionalText(400),
    notes: optionalText(2000),
    items: z
      .array(materialItem)
      .min(1, "Add at least one material.")
      .max(20, "Keep to twenty items."),
  })
  .superRefine(requireContactMethod);
export type MaterialEnquiryInput = z.infer<typeof materialEnquirySchema>;

export function materialEnquiryInput(formData: FormData) {
  const items: Record<string, string>[] = [];
  for (let index = 0; index < 20; index += 1) {
    const description = formText(formData, `item_${index}_description`);
    const quantity = formText(formData, `item_${index}_quantity`);
    const unit = formText(formData, `item_${index}_unit`);
    const specification = formText(formData, `item_${index}_specification`);
    if (description.trim() === "" && quantity.trim() === "" && specification.trim() === "")
      continue;
    items.push({ description, quantity, unit, specification });
  }
  return materialEnquirySchema.safeParse({
    ...formObject(formData, [...baseKeys, "location", "notes"]),
    items,
  });
}

// ---------------------------------------------------------------------
// Start-a-Project intake (seven steps, one submission)
// ---------------------------------------------------------------------

const optionalNumber = (maximum: number, label: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= maximum),
      `${label} must be a positive number.`,
    )
    .transform((value) => (value === "" ? null : Number(value)));

export const projectIntakeSchema = z
  .object({
    ...contactCore,
    needKey: z.enum(needKeys, { message: "Choose one option." }),
    projectType: z.enum(projectTypes, { message: "Choose the closest project type." }),
    location: optionalText(400),
    siteState: optionalText(400),
    description: requiredText(10, 4000),
    floorArea: optionalNumber(10_000_000, "Floor area"),
    floors: optionalNumber(200, "Number of floors"),
    units: optionalNumber(100_000, "Number of units"),
    siteArea: optionalNumber(1_000_000_000, "Site area"),
    scaleBand: z
      .enum(scaleBands)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    startTiming: optionalText(120),
    completionTiming: optionalText(120),
    budgetPreference: z.enum(budgetPreferences),
    budgetCurrency: z.enum(budgetCurrencies).or(z.literal("")),
    budgetMin: optionalNumber(1e12, "Budget minimum"),
    budgetMax: optionalNumber(1e12, "Budget maximum"),
    currentStage: z
      .enum(currentStages)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    specialRequirements: optionalText(2000),
    preferredContact: z
      .enum(preferredContacts)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    sourceContext: optionalText(200),
    uploadSessionId: z.string().uuid().or(z.literal("")),
    uploadSessionToken: z
      .string()
      .regex(/^[0-9a-f]{64}$/u)
      .or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    requireContactMethod(value, ctx);
    if (value.budgetPreference === "range") {
      if (!value.budgetCurrency) {
        ctx.addIssue({
          code: "custom",
          path: ["budgetCurrency"],
          message: "Choose a currency.",
        });
      }
      if (value.budgetMin === null && value.budgetMax === null) {
        ctx.addIssue({
          code: "custom",
          path: ["budgetMin"],
          message: "Enter a lowest or a highest amount.",
        });
      }
      if (
        value.budgetMin !== null &&
        value.budgetMax !== null &&
        value.budgetMax < value.budgetMin
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["budgetMax"],
          message: "The highest amount must not be lower than the lowest amount.",
        });
      }
    }
    if ((value.uploadSessionId === "") !== (value.uploadSessionToken === "")) {
      ctx.addIssue({
        code: "custom",
        path: ["uploadSessionId"],
        message: "We could not check your files. Please remove them and add them again.",
      });
    }
  });
export type ProjectIntakeInput = z.infer<typeof projectIntakeSchema>;

export const projectIntakeKeys = [
  ...baseKeys,
  "needKey",
  "projectType",
  "location",
  "siteState",
  "description",
  "floorArea",
  "floors",
  "units",
  "siteArea",
  "scaleBand",
  "startTiming",
  "completionTiming",
  "budgetPreference",
  "budgetCurrency",
  "budgetMin",
  "budgetMax",
  "currentStage",
  "specialRequirements",
  "preferredContact",
  "sourceContext",
  "uploadSessionId",
  "uploadSessionToken",
] as const;

export function projectIntakeInput(formData: FormData) {
  return projectIntakeSchema.safeParse(formObject(formData, projectIntakeKeys));
}

/** Safe URL preselection for /start-a-project (strictly validated, never trusted). */
export function parseIntakePreselection(
  raw: Readonly<Record<string, string | string[] | undefined>>,
): Readonly<{
  needKey: (typeof needKeys)[number] | null;
  projectType: (typeof projectTypes)[number] | null;
  sourceContext: string | null;
}> {
  const first = (key: string) => {
    const value = raw[key];
    return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  };
  const service = first("service");
  const type = first("project_type");
  const source = first("source").slice(0, 120);
  return {
    needKey: (needKeys as readonly string[]).includes(service)
      ? (service as (typeof needKeys)[number])
      : null,
    projectType: (projectTypes as readonly string[]).includes(type)
      ? (type as (typeof projectTypes)[number])
      : null,
    sourceContext: /^[a-z0-9][a-z0-9/_-]{0,119}$/u.test(source) ? source : null,
  };
}

// ---------------------------------------------------------------------
// Action state shared by every public form
// ---------------------------------------------------------------------

export type IntakeActionState = Readonly<{
  status: "idle" | "error" | "rate_limited" | "unavailable" | "success";
  message: string;
  fieldErrors: Readonly<Record<string, string>>;
  reference: string | null;
  leadType: string | null;
  retryAfterSeconds: number | null;
  /** True when the visitor should be shown the WhatsApp / email fallback. */
  fallback: boolean;
}>;

export const initialIntakeActionState: IntakeActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
  reference: null,
  leadType: null,
  retryAfterSeconds: null,
  fallback: false,
};

export function intakeState(
  status: IntakeActionState["status"],
  message: string,
  extra: Partial<IntakeActionState> = {},
): IntakeActionState {
  return { ...initialIntakeActionState, status, message, ...extra };
}
