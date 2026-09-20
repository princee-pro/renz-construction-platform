/**
 * Content tokens (CR1 §47, §99). Owner copy may reference live counts and
 * business facts so wording never becomes false when content is added:
 *
 *   {{services.count}}              5
 *   {{services.count_words}}        Five
 *   {{services.count_words_lower}}  five
 *   {{services.names}}              Design · Execution · …
 *   {{projects.count}} / concept_count / real_count (+ _words variants)
 *   {{insights.count}} / {{insights.topics}}
 *   {{process.count}} / {{process.count_words}} / {{process.count_words_lower}}
 *   {{business.display_name}} / short_name / region / service_area
 *   {{contact.email}}
 *   {{service.name}}                the preselected service (enquiry pages)
 *
 * Unknown tokens render as empty text. Interpolation is plain string
 * substitution; the result is still data (React escapes it).
 */

export type TokenContext = Readonly<{
  services: Readonly<{ count: number; names: readonly string[] }>;
  projects: Readonly<{ count: number; conceptCount: number; realCount: number }>;
  insights: Readonly<{ count: number; topics: readonly string[] }>;
  process: Readonly<{ count: number }>;
  business: Readonly<{
    displayName: string;
    shortName: string;
    region: string | null;
    serviceArea: string | null;
  }>;
  contact: Readonly<{ email: string }>;
  service?: Readonly<{ name: string }> | null;
}>;

const words = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

export function countWords(count: number): string {
  return count >= 0 && count < words.length ? (words[count] ?? String(count)) : String(count);
}

function countTokens(prefix: string, count: number, target: Record<string, string>): void {
  target[`${prefix}.count`] = String(count);
  target[`${prefix}.count_words`] = countWords(count);
  target[`${prefix}.count_words_lower`] = countWords(count).toLowerCase();
}

export function tokenTable(context: TokenContext): Readonly<Record<string, string>> {
  const table: Record<string, string> = {};
  countTokens("services", context.services.count, table);
  table["services.names"] = context.services.names.join(" · ");
  countTokens("projects", context.projects.count, table);
  countTokens("projects.concept", context.projects.conceptCount, table);
  countTokens("projects.real", context.projects.realCount, table);
  table["projects.concept_count"] = String(context.projects.conceptCount);
  table["projects.concept_count_words"] = countWords(context.projects.conceptCount);
  table["projects.concept_count_words_lower"] = countWords(
    context.projects.conceptCount,
  ).toLowerCase();
  table["projects.real_count"] = String(context.projects.realCount);
  table["projects.real_count_words"] = countWords(context.projects.realCount);
  countTokens("insights", context.insights.count, table);
  table["insights.topics"] = context.insights.topics.join(" · ");
  countTokens("process", context.process.count, table);
  table["business.display_name"] = context.business.displayName;
  table["business.short_name"] = context.business.shortName;
  table["business.region"] = context.business.region ?? "";
  table["business.service_area"] = context.business.serviceArea ?? "";
  table["contact.email"] = context.contact.email;
  table["service.name"] = context.service?.name ?? "";
  return table;
}

const tokenPattern = /\{\{\s*([a-z_.]+)\s*\}\}/gu;

export function interpolate(text: string, table: Readonly<Record<string, string>>): string {
  return text.replace(tokenPattern, (_match, key: string) => table[key] ?? "");
}

/** Interpolates every string in a section configuration (deep). */
export function interpolateConfig<T>(value: T, table: Readonly<Record<string, string>>): T {
  if (typeof value === "string") return interpolate(value, table) as T;
  if (Array.isArray(value)) {
    const items: unknown[] = value.map((entry: unknown) => interpolateConfig(entry, table));
    return items as T;
  }
  if (value !== null && typeof value === "object") {
    const entries: Record<string, unknown> = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        interpolateConfig(entry, table),
      ]),
    );
    return entries as T;
  }
  return value;
}

/** Facts whose value resolves to nothing are dropped (no empty placeholders). */
export function compactFacts<T extends Readonly<{ label: string; value: string }>>(
  facts: readonly T[],
): T[] {
  return facts.filter((fact) => fact.value.trim() !== "" && fact.label.trim() !== "");
}
