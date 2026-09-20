import { z } from "zod";

import {
  formNumber,
  formOptionalText,
  formText,
  optionalText,
  requiredText,
} from "@/features/admin-shared/action-state";

export const projectStatuses = ["planning", "in_progress", "on_hold", "completed"] as const;
export type OperationalProjectStatus = (typeof projectStatuses)[number];
export const projectStatusLabels: Readonly<Record<OperationalProjectStatus, string>> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
};

export const projectPhases = [
  "design",
  "planning",
  "procurement",
  "structural",
  "execution",
  "finishing",
  "completed",
] as const;
export type OperationalProjectPhase = (typeof projectPhases)[number];
export const projectPhaseLabels: Readonly<Record<OperationalProjectPhase, string>> = {
  design: "Design",
  planning: "Planning",
  procurement: "Procurement",
  structural: "Structural",
  execution: "Execution",
  finishing: "Finishing",
  completed: "Completed",
};

export const projectPriorities = ["low", "medium", "high"] as const;
export type OperationalProjectPriority = (typeof projectPriorities)[number];
export const projectPriorityLabels: Readonly<Record<OperationalProjectPriority, string>> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

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

const currencyOrNull = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value.toUpperCase()))
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{3}$/u, "Use a 3-letter currency code.")
      .nullable(),
  );

const budgetAmountOrNull = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/u, "Enter a non-negative amount.")
      .nullable(),
  );

export const projectCreateSchema = z
  .object({
    clientId: z.string().uuid("Select a client."),
    title: requiredText(1, 200),
    description: optionalText(4000),
    status: z.enum(projectStatuses),
    phase: z.enum(projectPhases),
    priority: z.enum(projectPriorities),
    startDate: dateOrNull,
    endDate: dateOrNull,
    budgetAmount: budgetAmountOrNull,
    budgetCurrency: currencyOrNull,
  })
  .strict()
  .refine((value) => (value.budgetAmount === null) === (value.budgetCurrency === null), {
    message: "A budget amount requires a currency, and a currency requires an amount.",
    path: ["budgetCurrency"],
  })
  .refine(
    (value) =>
      value.startDate === null || value.endDate === null || value.endDate >= value.startDate,
    { message: "End date cannot precede the start date.", path: ["endDate"] },
  );

export const projectEditSchema = z
  .object({
    projectId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: requiredText(1, 200),
    description: optionalText(4000),
    startDate: dateOrNull,
    endDate: dateOrNull,
    budgetAmount: budgetAmountOrNull,
    budgetCurrency: currencyOrNull,
  })
  .strict()
  .refine((value) => (value.budgetAmount === null) === (value.budgetCurrency === null), {
    message: "A budget amount requires a currency, and a currency requires an amount.",
    path: ["budgetCurrency"],
  })
  .refine(
    (value) =>
      value.startDate === null || value.endDate === null || value.endDate >= value.startDate,
    { message: "End date cannot precede the start date.", path: ["endDate"] },
  );

export const projectStatusChangeSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  nextStatus: z.enum(projectStatuses),
});

export const projectPhaseChangeSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  nextPhase: z.enum(projectPhases),
});

export const projectPriorityChangeSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  nextPriority: z.enum(projectPriorities),
});

export const projectArchiveSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const projectNoteCreateSchema = z.object({
  projectId: z.string().uuid(),
  body: requiredText(1, 4000),
});

export const caseStudyLinkSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  caseStudyId: z.string().uuid(),
});

export const caseStudyUnlinkSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
});

export const caseStudyDraftFromProjectSchema = z.object({
  projectId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
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
});

export function projectCreateInput(formData: FormData) {
  return projectCreateSchema.safeParse({
    clientId: formText(formData, "clientId"),
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    status: formText(formData, "status") || "planning",
    phase: formText(formData, "phase") || "design",
    priority: formText(formData, "priority") || "medium",
    startDate: formText(formData, "startDate"),
    endDate: formText(formData, "endDate"),
    budgetAmount: formText(formData, "budgetAmount"),
    budgetCurrency: formText(formData, "budgetCurrency"),
  });
}

export function projectEditInput(formData: FormData) {
  return projectEditSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    title: formText(formData, "title"),
    description: formText(formData, "description"),
    startDate: formText(formData, "startDate"),
    endDate: formText(formData, "endDate"),
    budgetAmount: formText(formData, "budgetAmount"),
    budgetCurrency: formText(formData, "budgetCurrency"),
  });
}

export function projectStatusChangeInput(formData: FormData) {
  return projectStatusChangeSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    nextStatus: formText(formData, "nextStatus"),
  });
}

export function projectPhaseChangeInput(formData: FormData) {
  return projectPhaseChangeSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    nextPhase: formText(formData, "nextPhase"),
  });
}

export function projectPriorityChangeInput(formData: FormData) {
  return projectPriorityChangeSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    nextPriority: formText(formData, "nextPriority"),
  });
}

export function projectArchiveInput(formData: FormData) {
  return projectArchiveSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export function projectNoteCreateInput(formData: FormData) {
  return projectNoteCreateSchema.safeParse({
    projectId: formText(formData, "projectId"),
    body: formText(formData, "body"),
  });
}

export function caseStudyLinkInput(formData: FormData) {
  return caseStudyLinkSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    caseStudyId: formText(formData, "caseStudyId"),
  });
}

export function caseStudyUnlinkInput(formData: FormData) {
  return caseStudyUnlinkSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
  });
}

export type ProjectHealth = "on_track" | "attention" | "overdue";

export const projectHealthLabels: Readonly<Record<ProjectHealth, string>> = {
  on_track: "On track",
  attention: "Attention",
  overdue: "Overdue",
};

/**
 * Deterministic, no AI scoring — mirrors the same plain rules
 * admin_action_queue uses server-side (past-due date, high priority while
 * active). Defined once here so the register and the Command Center render
 * an identical label instead of each re-deriving their own.
 */
export function projectHealth(
  project: Readonly<{
    status: OperationalProjectStatus;
    priority: OperationalProjectPriority;
    end_date: string | null;
    archived_at?: string | null;
  }>,
): ProjectHealth | null {
  if (project.status === "completed" || project.archived_at) return null;
  if (project.end_date && project.end_date < new Date().toISOString().slice(0, 10)) {
    return "overdue";
  }
  if (project.priority === "high") return "attention";
  return "on_track";
}

export function caseStudyDraftFromProjectInput(formData: FormData) {
  return caseStudyDraftFromProjectSchema.safeParse({
    projectId: formText(formData, "projectId"),
    expectedVersion: formNumber(formData, "expectedVersion"),
    locale: formText(formData, "locale") || "en",
    slug: formText(formData, "slug"),
    title: formText(formData, "title"),
  });
}

const clientRefSchema = z.object({ id: z.string().uuid(), full_name: z.string() });
const caseStudyRefSchema = z.object({
  id: z.string().uuid(),
  publication_status: z.string().nullable(),
});

const projectListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.enum(projectStatuses),
  current_phase: z.enum(projectPhases),
  priority: z.enum(projectPriorities),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  budget_amount: z.union([z.string(), z.number()]).nullable(),
  budget_currency: z.string().nullable(),
  updated_at: z.string(),
  version: z.number().int(),
  archived_at: z.string().nullable(),
  client: clientRefSchema,
  case_study: caseStudyRefSchema.nullable(),
});
export type OperationalProjectListItem = z.infer<typeof projectListItemSchema>;

export const projectListResultSchema = z.object({
  items: z.array(projectListItemSchema),
  has_more: z.boolean(),
  next_cursor_updated_at: z.string().nullable(),
  next_cursor_id: z.string().uuid().nullable(),
});
export type OperationalProjectListResult = z.infer<typeof projectListResultSchema>;

const projectNoteSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  created_at: z.string(),
  version: z.number().int(),
  author: z.string().nullable(),
});

const statusHistorySchema = z.object({
  from_status: z.string().nullable(),
  to_status: z.string(),
  created_at: z.string(),
  actor: z.string().nullable(),
});

const phaseHistorySchema = z.object({
  from_phase: z.string().nullable(),
  to_phase: z.string(),
  created_at: z.string(),
  actor: z.string().nullable(),
});

const projectActivitySchema = z.object({
  action: z.string(),
  outcome: z.string(),
  occurred_at: z.string(),
  actor: z.string().nullable(),
});

export const projectDetailSchema = z.object({
  project: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(projectStatuses),
    current_phase: z.enum(projectPhases),
    priority: z.enum(projectPriorities),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    budget_amount: z.union([z.string(), z.number()]).nullable(),
    budget_currency: z.string().nullable(),
    version: z.number().int(),
    created_at: z.string(),
    updated_at: z.string(),
    archived_at: z.string().nullable(),
  }),
  client: z.object({
    id: z.string().uuid(),
    full_name: z.string(),
    company: z.string().nullable(),
    client_tier: z.string(),
    archived_at: z.string().nullable(),
  }),
  case_study: z
    .object({
      id: z.string().uuid(),
      publication_status: z.string().nullable(),
      slug: z.string().nullable(),
      title: z.string().nullable(),
    })
    .nullable(),
  notes: z.array(projectNoteSchema),
  status_history: z.array(statusHistorySchema),
  phase_history: z.array(phaseHistorySchema),
  activity: z.array(projectActivitySchema),
});
export type OperationalProjectDetail = z.infer<typeof projectDetailSchema>;

export const operationsOverviewSchema = z.object({
  active_count: z.number().int(),
  archived_count: z.number().int(),
  client_count: z.number().int(),
  status_counts: z.record(z.string(), z.number().int()),
  phase_counts: z.record(z.string(), z.number().int()),
  priority_counts: z.record(z.string(), z.number().int()),
  ending_soon_count: z.number().int(),
  past_due_count: z.number().int(),
  without_case_study_count: z.number().int(),
  ending_soon_window_days: z.number().int(),
  budget_by_currency: z.array(
    z.object({ currency: z.string(), total: z.union([z.string(), z.number()]) }),
  ),
});
export type OperationsOverview = z.infer<typeof operationsOverviewSchema>;

export const actionQueueItemSchema = z.object({
  kind: z.string(),
  project_id: z.string().uuid(),
  title: z.string(),
  detail: z.string(),
});
export const actionQueueSchema = z.array(actionQueueItemSchema);
export type ActionQueueItem = z.infer<typeof actionQueueItemSchema>;

export const recentActivityItemSchema = z.object({
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  outcome: z.string(),
  occurred_at: z.string(),
  actor: z.string().nullable(),
  label: z.string().nullable().optional(),
});
export const recentActivitySchema = z.array(recentActivityItemSchema);
export type RecentActivityItem = z.infer<typeof recentActivityItemSchema>;

export const quickFindResultSchema = z.array(
  z.object({
    kind: z.enum([
      "lead",
      "client",
      "project",
      "invoice",
      "contractor",
      "supplier",
      "material",
      "purchase_order",
      "case_study",
      "setting",
      "page",
      "service",
      "insight",
    ]),
    id: z.string().uuid(),
    label: z.string(),
    detail: z.string().nullable(),
  }),
);
export type QuickFindResult = z.infer<typeof quickFindResultSchema>;

// Case Studies editor reverse lookup (C4 §56). Null when the case study is
// not the public representation of any operational project, or when the
// caller lacks operations.projects.read — the facade omits rather than denies.
export const caseStudyOperationalProjectSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.enum(projectStatuses),
    current_phase: z.enum(projectPhases),
    priority: z.enum(projectPriorities),
    archived_at: z.string().nullable(),
  })
  .nullable();
export type CaseStudyOperationalProject = z.infer<typeof caseStudyOperationalProjectSchema>;

export {
  zodFieldErrors,
  type AdminActionState,
  initialAdminActionState,
} from "@/features/admin-shared/action-state";
export { formOptionalText };
