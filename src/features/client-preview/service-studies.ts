/**
 * Service ↔ concept-study relationship (D1 §61). Preview-only: which
 * concept studies illustrate each service; D1.7 adds the six Rwanda-context
 * studies (07–12).
 */
export const serviceStudyMap: Readonly<Record<string, readonly string[]>> = {
  design: [
    "ridge-residence",
    "courtyard-house",
    "kigali-infill-apartments",
    "huye-learning-courtyard",
  ],
  executions: [
    "urban-workspace",
    "community-pavilion",
    "industrial-campus",
    "bugesera-logistics-hub",
    "rwamagana-production-yard",
  ],
  "hybrid-service": [
    "ridge-residence",
    "courtyard-house",
    "lake-retreat",
    "musanze-highlands-lodge",
    "rubavu-lakeside-residences",
  ],
  supervision: [
    "ridge-residence",
    "urban-workspace",
    "industrial-campus",
    "bugesera-logistics-hub",
    "kigali-infill-apartments",
  ],
  consultations: [
    "lake-retreat",
    "community-pavilion",
    "musanze-highlands-lodge",
    "huye-learning-courtyard",
    "rubavu-lakeside-residences",
  ],
};
