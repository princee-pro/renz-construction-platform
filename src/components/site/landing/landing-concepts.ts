/**
 * Landing concepts (D1.6 brief §41–70). Each major route opens with its own
 * idea, composition and motion, all inside "Datum & Mass". The concept is
 * chosen by the owner on a page's masthead (or derived for domain pages);
 * the copy and media stay CMS content, the motion and layout are code.
 */
export const landingConcepts = [
  "land",
  "stages",
  "drawing-form",
  "plan-build",
  "split-morph",
  "checkpoints",
  "site-decision",
  "film-archive",
  "project",
  "how-we-work",
  "drawing-board",
  "direct-line",
  "first-brief",
  "service-cue",
  "material-register",
  "calm",
] as const;
export type LandingConcept = (typeof landingConcepts)[number];

export const landingHeights = ["full", "tall", "standard", "compact", "editorial"] as const;
export type LandingHeight = (typeof landingHeights)[number];

export type LandingLayout = "left" | "split" | "centered" | "strip" | "editorial";

export type LandingSpec = Readonly<{
  label: string;
  description: string;
  height: LandingHeight;
  layout: LandingLayout;
  /** Whether the scene sits over the media (true) or in its own right-hand plane. */
  overlay: boolean;
}>;

export const landingSpecs: Readonly<Record<LandingConcept, LandingSpec>> = {
  land: {
    label: "Land → Structure (Home)",
    description: "Cinematic site media, survey point, drawn datum, headline assembles.",
    height: "full",
    layout: "left",
    overlay: true,
  },
  stages: {
    label: "One project, different ways to help (Services)",
    description: "Drawing → structure → built mass as a measured stage strip.",
    height: "tall",
    layout: "split",
    overlay: false,
  },
  "drawing-form": {
    label: "Drawing → Form (Design)",
    description: "Plan lines and dimensions resolve into a building form.",
    height: "tall",
    layout: "split",
    overlay: false,
  },
  "plan-build": {
    label: "Plan → Build (Execution)",
    description: "Formwork, rebar and staged progress over construction media.",
    height: "tall",
    layout: "left",
    overlay: true,
  },
  "split-morph": {
    label: "One team from drawing to build (Hybrid)",
    description: "A moving datum reveals the built structure through the drawing.",
    height: "tall",
    layout: "left",
    overlay: true,
  },
  checkpoints: {
    label: "Check every stage (Supervision)",
    description: "Crosshair, level and numbered checkpoints over detail media.",
    height: "tall",
    layout: "left",
    overlay: true,
  },
  "site-decision": {
    label: "Site → Decision (Consultation)",
    description: "Contours, orientation, access and light drawn over the site.",
    height: "tall",
    layout: "split",
    overlay: false,
  },
  "film-archive": {
    label: "Project film archive (Projects)",
    description: "A film-strip sequence of the published studies.",
    height: "tall",
    layout: "strip",
    overlay: false,
  },
  project: {
    label: "Project media (Project detail)",
    description: "Media-driven hero from the project's own media.",
    height: "tall",
    layout: "left",
    overlay: true,
  },
  "how-we-work": {
    label: "How RENZ works (About)",
    description: "Four connected stage marks: plan, build, check, advise.",
    height: "standard",
    layout: "split",
    overlay: false,
  },
  "drawing-board": {
    label: "Drawing board (Insights)",
    description: "Editorial sheets, notebook lines, a material sample.",
    height: "editorial",
    layout: "editorial",
    overlay: false,
  },
  "direct-line": {
    label: "Direct line (Contact)",
    description: "Calm dusk field; lines converge on the message point.",
    height: "compact",
    layout: "left",
    overlay: true,
  },
  "first-brief": {
    label: "First brief (Start a Project)",
    description: "Blank frame → site outline → project mass.",
    height: "standard",
    layout: "split",
    overlay: false,
  },
  "service-cue": {
    label: "Service cue (Service enquiry)",
    description: "Lighter opening that names the selected service.",
    height: "compact",
    layout: "left",
    overlay: true,
  },
  "material-register": {
    label: "Material register (Material enquiry)",
    description: "Material samples and quantity marks in a structured grid.",
    height: "compact",
    layout: "split",
    overlay: false,
  },
  calm: {
    label: "Calm header (legal, utility pages)",
    description: "Restrained RENZ header, no media.",
    height: "compact",
    layout: "left",
    overlay: false,
  },
};

export const landingConceptOptions = landingConcepts.map((value) => ({
  value,
  label: landingSpecs[value].label,
}));

export const landingHeightOptions: readonly Readonly<{ value: LandingHeight; label: string }>[] = [
  { value: "full", label: "Full screen (home only)" },
  { value: "tall", label: "Tall (about 80% of the screen)" },
  { value: "standard", label: "Standard (about 65%)" },
  { value: "compact", label: "Compact (about 45%)" },
  { value: "editorial", label: "Editorial (fits the text)" },
];

/** The approved concept for the original five services; later services cycle. */
const serviceConcepts: Readonly<Record<string, LandingConcept>> = {
  design: "drawing-form",
  executions: "plan-build",
  "hybrid-service": "split-morph",
  supervision: "checkpoints",
  consultations: "site-decision",
};
const serviceCycle: readonly LandingConcept[] = [
  "drawing-form",
  "plan-build",
  "split-morph",
  "checkpoints",
  "site-decision",
];
export function serviceLandingConcept(slug: string, index: number): LandingConcept {
  return serviceConcepts[slug] ?? serviceCycle[index % serviceCycle.length] ?? "stages";
}

export function isLandingConcept(value: string | null | undefined): value is LandingConcept {
  return typeof value === "string" && (landingConcepts as readonly string[]).includes(value);
}
export function isLandingHeight(value: string | null | undefined): value is LandingHeight {
  return typeof value === "string" && (landingHeights as readonly string[]).includes(value);
}
