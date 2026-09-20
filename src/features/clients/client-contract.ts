import { z } from "zod";

import {
  formNumber,
  formOptionalText,
  formText,
  optionalText,
  requiredText,
} from "@/features/admin-shared/action-state";

export const clientTiers = ["standard", "vip", "premium"] as const;
export type ClientTier = (typeof clientTiers)[number];

export const clientTierLabels: Readonly<Record<ClientTier, string>> = {
  standard: "Standard",
  vip: "VIP",
  premium: "Premium",
};

export const clientCreateSchema = z
  .object({
    fullName: requiredText(1, 200),
    email: optionalText(254),
    phone: optionalText(40),
    address: optionalText(400),
    company: optionalText(200),
    clientTier: z.enum(clientTiers),
    referralSource: optionalText(200),
    externalReference: optionalText(120),
    initialNote: optionalText(4000),
  })
  .strict()
  .refine((value) => value.email !== null || value.phone !== null, {
    message: "Enter an email or phone number.",
    path: ["email"],
  });

export const clientEditSchema = z
  .object({
    clientId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    fullName: requiredText(1, 200),
    email: optionalText(254),
    phone: optionalText(40),
    address: optionalText(400),
    company: optionalText(200),
    clientTier: z.enum(clientTiers),
    referralSource: optionalText(200),
    externalReference: optionalText(120),
  })
  .strict()
  .refine((value) => value.email !== null || value.phone !== null, {
    message: "Enter an email or phone number.",
    path: ["email"],
  });

export const clientArchiveSchema = z.object({
  clientId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const clientNoteCreateSchema = z.object({
  clientId: z.string().uuid(),
  body: requiredText(1, 4000),
});

export function clientCreateInput(formData: FormData) {
  return clientCreateSchema.safeParse({
    fullName: formText(formData, "fullName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    address: formText(formData, "address"),
    company: formText(formData, "company"),
    clientTier: formText(formData, "clientTier") || "standard",
    referralSource: formText(formData, "referralSource"),
    externalReference: formText(formData, "externalReference"),
    initialNote: formText(formData, "initialNote"),
  });
}

export function clientEditInput(formData: FormData) {
  return clientEditSchema.safeParse({
    clientId: formText(formData, "clientId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    fullName: formText(formData, "fullName"),
    email: formText(formData, "email"),
    phone: formText(formData, "phone"),
    address: formText(formData, "address"),
    company: formText(formData, "company"),
    clientTier: formText(formData, "clientTier") || "standard",
    referralSource: formText(formData, "referralSource"),
    externalReference: formText(formData, "externalReference"),
  });
}

export function clientArchiveInput(formData: FormData) {
  return clientArchiveSchema.safeParse({
    clientId: formText(formData, "clientId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function clientNoteCreateInput(formData: FormData) {
  return clientNoteCreateSchema.safeParse({
    clientId: formText(formData, "clientId"),
    body: formText(formData, "body"),
  });
}

const clientListItemSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  company: z.string().nullable(),
  client_tier: z.enum(clientTiers),
  email: z.string().nullable(),
  phone_display: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int(),
  archived_at: z.string().nullable(),
  project_count: z.number().int(),
  active_project_count: z.number().int(),
});
export type ClientListItem = z.infer<typeof clientListItemSchema>;

export const clientListResultSchema = z.object({
  items: z.array(clientListItemSchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().uuid().nullable(),
});
export type ClientListResult = z.infer<typeof clientListResultSchema>;

export const clientOverviewSchema = z.object({
  total: z.number().int(),
  active: z.number().int(),
  archived: z.number().int(),
  standard: z.number().int(),
  vip: z.number().int(),
  premium: z.number().int(),
});
export type ClientOverview = z.infer<typeof clientOverviewSchema>;

const clientNoteSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  created_at: z.string(),
  version: z.number().int(),
  author: z.string().nullable(),
});

const clientProjectSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
  current_phase: z.string(),
  priority: z.string(),
  updated_at: z.string(),
  archived_at: z.string().nullable(),
});

const clientActivitySchema = z.object({
  action: z.string(),
  outcome: z.string(),
  occurred_at: z.string(),
  actor: z.string().nullable(),
});

export const clientDetailSchema = z.object({
  client: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    email: z.string().nullable(),
    phone_display: z.string().nullable(),
    address: z.string().nullable(),
    company: z.string().nullable(),
    client_tier: z.enum(clientTiers),
    referral_source: z.string().nullable(),
    external_reference: z.string().nullable(),
    version: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
  }),
  projects: z.array(clientProjectSummarySchema),
  notes: z.array(clientNoteSchema),
  activity: z.array(clientActivitySchema),
});
export type ClientDetail = z.infer<typeof clientDetailSchema>;

const duplicateClientSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone_display: z.string().nullable(),
  archived_at: z.string().nullable(),
  match_reason: z.string(),
});
export const duplicateClientListSchema = z.array(duplicateClientSchema);
export type DuplicateClient = z.infer<typeof duplicateClientSchema>;

const clientPickerEntrySchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  company: z.string().nullable(),
});
export const clientPickerListSchema = z.array(clientPickerEntrySchema);
export type ClientPickerEntry = z.infer<typeof clientPickerEntrySchema>;

export {
  zodFieldErrors,
  type AdminActionState,
  initialAdminActionState,
} from "@/features/admin-shared/action-state";
export { formOptionalText };
