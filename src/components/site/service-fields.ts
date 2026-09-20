import type { FieldVariant } from "@/components/site/fields";

/**
 * The technical field drawn behind a service (panel, index, intake frame).
 * Plain data shared by server and client components — it must not live in
 * a "use client" module, which the server cannot call into.
 */
export const serviceFieldVariants: Readonly<Record<string, FieldVariant>> = {
  design: "plan",
  executions: "structure",
  "hybrid-service": "datum",
  supervision: "survey",
  consultations: "quiet",
};

const fieldCycle: readonly FieldVariant[] = [
  "plan",
  "structure",
  "datum",
  "survey",
  "quiet",
  "material",
];

/** The approved mapping for the original five services, a stable cycle for any service added later. */
export function serviceField(slug: string, index: number): FieldVariant {
  return serviceFieldVariants[slug] ?? fieldCycle[index % fieldCycle.length] ?? "survey";
}
