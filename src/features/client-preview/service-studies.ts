/**
 * Service ↔ concept-study relationship (D1 §61). Preview-only: which
 * concept studies illustrate each service. Terraced Housing (study #7) is
 * not produced yet (see docs/RENZ_FINAL_MEDIA_QUEUE.md) so it is omitted.
 */
export const serviceStudyMap: Readonly<Record<string, readonly string[]>> = {
  design: ["ridge-residence", "courtyard-house"],
  executions: ["urban-workspace", "community-pavilion", "industrial-campus"],
  "hybrid-service": ["ridge-residence", "courtyard-house", "lake-retreat"],
  supervision: ["ridge-residence", "urban-workspace", "industrial-campus"],
  consultations: ["lake-retreat", "community-pavilion"],
};
