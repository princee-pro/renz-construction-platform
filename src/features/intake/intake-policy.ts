/**
 * Centralized public-intake policy (C8). Technical safety limits — not
 * business promises. Shared by the public forms, the server actions, the
 * upload route and the verification scripts.
 */

export const intakeRateLimits = {
  contact: { maxHits: 5, windowSeconds: 3600 },
  service: { maxHits: 5, windowSeconds: 3600 },
  project: { maxHits: 3, windowSeconds: 3600 },
  material: { maxHits: 3, windowSeconds: 3600 },
  upload: { maxHits: 30, windowSeconds: 3600 },
  // C9 first-party analytics beacon: batches of up to 20 events per hit.
  analytics: { maxHits: 120, windowSeconds: 3600 },
} as const;
export type IntakeScope = keyof typeof intakeRateLimits;

export const intakeFileLimits = {
  maxFiles: 5,
  maxBytes: 10 * 1024 * 1024,
  sessionTtlSeconds: 2 * 60 * 60,
} as const;

/** Accepted types by detected signature; extension and browser MIME are never trusted. */
export const intakeFileTypes = {
  "image/jpeg": { extension: "jpg", label: "JPEG" },
  "image/png": { extension: "png", label: "PNG" },
  "image/webp": { extension: "webp", label: "WebP" },
  "application/pdf": { extension: "pdf", label: "PDF" },
} as const;
export type IntakeMimeType = keyof typeof intakeFileTypes;

export const intakeUploadPolicies = ["disabled", "images_only", "images_and_pdf"] as const;
export type IntakeUploadPolicy = (typeof intakeUploadPolicies)[number];

export function acceptedMimeTypes(policy: IntakeUploadPolicy): readonly IntakeMimeType[] {
  if (policy === "disabled") return [];
  if (policy === "images_only") return ["image/jpeg", "image/png", "image/webp"];
  return ["image/jpeg", "image/png", "image/webp", "application/pdf"];
}

/** Form token: issued at render, minimum interaction time, maximum age. */
export const intakeFormToken = {
  minimumSeconds: 3,
  maximumSeconds: 24 * 60 * 60,
} as const;

export const honeypotFieldName = "website_url";

export const leadTypes = ["general", "project", "service", "material"] as const;
export type LeadType = (typeof leadTypes)[number];
export const leadTypeLabels: Readonly<Record<LeadType, string>> = {
  general: "General Enquiry",
  project: "Project Enquiry",
  service: "Service Enquiry",
  material: "Material Enquiry",
};

export const needKeys = [
  "design",
  "executions",
  "hybrid-service",
  "supervision",
  "consultations",
  "not_sure",
  "other",
] as const;
export type NeedKey = (typeof needKeys)[number];
export const needLabels: Readonly<Record<NeedKey, string>> = {
  design: "Design",
  executions: "Executions",
  "hybrid-service": "Hybrid Service (Designs & Execution)",
  supervision: "Supervision",
  consultations: "Consultations",
  not_sure: "Not sure yet",
  other: "Something else",
};
/** Visitor-facing wording for the same keys (D1.6 plain English); staff keep the canonical labels. */
export const publicNeedLabels: Readonly<Record<NeedKey, string>> = {
  design: "Design — drawings for my project",
  executions: "Executions — build from my drawings",
  "hybrid-service": "Hybrid Service — one team to design and build",
  supervision: "Supervision — check my builder's work",
  consultations: "Consultations — advice before I decide",
  not_sure: "Not sure yet",
  other: "Something else",
};
export const serviceKeys = needKeys.filter((key) => key !== "not_sure" && key !== "other");

export const projectTypes = [
  "residential",
  "commercial",
  "hospitality",
  "community",
  "industrial",
  "renovation",
  "other",
] as const;
export type ProjectType = (typeof projectTypes)[number];
export const projectTypeLabels: Readonly<Record<ProjectType, string>> = {
  residential: "Residential",
  commercial: "Commercial",
  hospitality: "Hospitality",
  community: "Community / Institutional",
  industrial: "Industrial",
  renovation: "Renovation / Existing Building",
  other: "Other",
};
export const publicProjectTypeLabels: Readonly<Record<ProjectType, string>> = {
  residential: "Residential — a home",
  commercial: "Commercial — offices or shops",
  hospitality: "Hospitality — hotel, lodge or restaurant",
  community: "Community — school, church, clinic or hall",
  industrial: "Industrial — workshop, factory or warehouse",
  renovation: "Renovation — changing an existing building",
  other: "Other",
};

export const scaleBands = ["small", "medium", "large", "not_sure"] as const;
export type ScaleBand = (typeof scaleBands)[number];
export const scaleBandLabels: Readonly<Record<ScaleBand, string>> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  not_sure: "Not sure",
};

export const currentStages = [
  "idea",
  "site_identified",
  "design_started",
  "drawings_available",
  "ready_for_execution",
  "construction_underway",
  "renovation",
  "not_sure",
] as const;
export type CurrentStage = (typeof currentStages)[number];
export const currentStageLabels: Readonly<Record<CurrentStage, string>> = {
  idea: "Idea / Early planning",
  site_identified: "Site identified",
  design_started: "Design started",
  drawings_available: "Drawings available",
  ready_for_execution: "Ready for execution",
  construction_underway: "Construction underway",
  renovation: "Renovation / Existing structure",
  not_sure: "Not sure",
};
export const publicCurrentStageLabels: Readonly<Record<CurrentStage, string>> = {
  idea: "Just an idea",
  site_identified: "I have a site",
  design_started: "Design has started",
  drawings_available: "I have drawings",
  ready_for_execution: "Ready to build",
  construction_underway: "Building has started",
  renovation: "Changing an existing building",
  not_sure: "Not sure",
};

export const budgetPreferences = ["not_sure", "prefer_not", "range"] as const;
export type BudgetPreference = (typeof budgetPreferences)[number];
export const budgetPreferenceLabels: Readonly<Record<BudgetPreference, string>> = {
  not_sure: "Not sure yet",
  prefer_not: "Prefer not to say",
  range: "I have a range in mind",
};
export const budgetCurrencies = ["RWF", "USD", "EUR", "GBP"] as const;

export const preferredContacts = ["whatsapp", "email", "phone", "none"] as const;
export type PreferredContact = (typeof preferredContacts)[number];
export const preferredContactLabels: Readonly<Record<PreferredContact, string>> = {
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone",
  none: "No preference",
};

export const intakeSteps = [
  "need",
  "context",
  "scale",
  "parameters",
  "material",
  "contact",
  "review",
] as const;
export type IntakeStep = (typeof intakeSteps)[number];
export const intakeStepLabels: Readonly<Record<IntakeStep, string>> = {
  need: "What you need",
  context: "Your project",
  scale: "Size",
  parameters: "Timing and budget",
  material: "Files",
  contact: "Your details",
  review: "Check and send",
};

/** Prefilled WhatsApp follow-up after a successful submission (wa.me only). */
export function continueOnWhatsAppMessage(reference: string, shortName: string): string {
  return `Hello ${shortName}, I submitted enquiry ${reference} and would like to continue the conversation.`;
}
