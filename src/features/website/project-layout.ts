import type { ProjectCardData } from "@/features/public-content/data";

/**
 * Project auto-placement (CR1 §39–41, §80). The owner chooses content,
 * relationships, priority and an optional layout hint; the renderer owns
 * placement. The editorial cycle from D1 §29 (monument, portrait, landscape,
 * technical, strip, wide) repeats for any count, hints are honoured when
 * they are safe, and unsafe combinations are normalised:
 *
 * - a project without media never takes an image-led composition;
 * - two consecutive cards never share a composition;
 * - a monument is never followed by a wide (both full-bleed).
 */
export type ProjectComposition =
  "monument" | "portrait" | "landscape" | "technical" | "strip" | "wide";

export const compositionCycle: readonly ProjectComposition[] = [
  "monument",
  "portrait",
  "landscape",
  "technical",
  "strip",
  "wide",
];

const fullBleed = new Set<ProjectComposition>(["monument", "wide"]);
const imageLed = new Set<ProjectComposition>([
  "monument",
  "portrait",
  "landscape",
  "strip",
  "wide",
]);

export type PlacedProject = Readonly<{
  project: ProjectCardData;
  composition: ProjectComposition;
  index: number;
}>;

function next(cycleIndex: number): ProjectComposition {
  return compositionCycle[cycleIndex % compositionCycle.length] ?? "landscape";
}

export function placeProjects(projects: readonly ProjectCardData[]): readonly PlacedProject[] {
  const placed: PlacedProject[] = [];
  let previous: ProjectComposition | null = null;
  projects.forEach((project, index) => {
    let candidate: ProjectComposition =
      project.layoutHint !== "auto" ? project.layoutHint : next(index);
    let attempts = 0;
    while (
      attempts < compositionCycle.length &&
      ((project.media === null && imageLed.has(candidate)) ||
        (previous !== null && candidate === previous) ||
        (previous !== null && fullBleed.has(previous) && fullBleed.has(candidate)))
    ) {
      candidate = project.media === null ? "technical" : next(index + attempts + 1);
      attempts += 1;
      if (project.media === null) break;
    }
    placed.push({ project, composition: candidate, index });
    previous = candidate;
  });
  return placed;
}

/** Home / showcase selection: explicit home feature → featured → display order. */
export function selectShowcase(
  projects: readonly ProjectCardData[],
  mode: "home" | "selected" | "recent",
  limit: number,
): readonly ProjectCardData[] {
  const ordered = [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
  if (mode === "home") {
    const home = ordered.filter((project) => project.homeFeatured);
    const featured = ordered.filter((project) => project.featured);
    return (home.length > 0 ? home : featured.length > 0 ? featured : ordered).slice(0, limit);
  }
  if (mode === "selected") {
    const featured = ordered.filter((project) => project.featured);
    const rest = ordered.filter((project) => !project.featured);
    return [...featured, ...rest].slice(0, limit);
  }
  return ordered.slice(0, limit);
}

/** Filter groups derived from the published projects' own types (no invented taxonomy). */
export function deriveProjectFilters(
  projects: readonly ProjectCardData[],
): readonly Readonly<{ key: string; label: string; count: number }>[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const label = project.projectType?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const filters = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/gu, "-"),
      label,
      count,
    }));
  return [{ key: "all", label: "All", count: projects.length }, ...filters];
}
