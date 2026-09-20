import type { RenderContext } from "../../src/components/site/sections/types";
import type { PageSnapshot, SnapshotSection } from "../../src/features/website/contracts";
import type { ProjectCardData } from "../../src/features/public-content/data";
import { globalsFromSnapshots } from "../../src/features/website/data";
import { buildTokenContext } from "../../src/features/website/public-context";
import { tokenTable } from "../../src/features/website/tokens";
import { siteIdentityFrom } from "../../src/lib/site/public-configuration";

/** Component-test fixtures for the CR1 page renderer (no database, no network). */
export function section(
  type: string,
  config: Record<string, unknown>,
  overrides: Partial<SnapshotSection> = {},
): SnapshotSection {
  return {
    id:
      overrides.id ??
      `00000000-0000-4000-8000-${type
        .padEnd(12, "0")
        .slice(0, 12)
        .replace(/[^a-f0-9]/gu, "0")}`,
    type,
    variant: "default",
    tone: "paper",
    spacing: "standard",
    motion: "none",
    hidden: false,
    locked: false,
    label: null,
    config,
    ...overrides,
  };
}

export function snapshot(
  sections: readonly SnapshotSection[],
  page: Partial<PageSnapshot["page"]> = {},
): PageSnapshot {
  return {
    page: {
      id: "00000000-0000-4000-8000-000000000001",
      page_key: "home",
      page_type: "system",
      path: "/",
      title: "Home",
      seo: {},
      ...page,
    },
    sections: [...sections],
    revision: { no: 1, published_at: "2026-09-15T00:00:00.000Z", preview: false },
  };
}

export function conceptProject(overrides: Partial<ProjectCardData> = {}): ProjectCardData {
  return {
    id: "00000000-0000-4000-8000-0000000000a1",
    slug: "ridge-residence",
    title: "Ridge Residence",
    summary: "A house that meets the ridge quietly.",
    projectType: "Hillside residential concept",
    publicLocation: null,
    completionYear: null,
    evidenceClass: "concept_study",
    layoutHint: "auto",
    homeFeatured: true,
    featured: true,
    sortOrder: 10,
    materials: "Concrete / timber / stone",
    tags: [],
    media: {
      projectMediaId: "00000000-0000-4000-8000-0000000000b1",
      alt: "Generated concept study; not RENZ project evidence",
      focalX: 0.5,
      focalY: 0.5,
      provenanceClass: "generated_reference",
      width: 1600,
      height: 1000,
    },
    ...overrides,
  };
}

export function renderContext(overrides: Partial<RenderContext> = {}): RenderContext {
  const identity = siteIdentityFrom({});
  const globals = globalsFromSnapshots(null, null);
  const base = {
    identity,
    previewEnabled: false,
    services: [],
    projects: [],
    projectServiceLinks: [],
    posts: [],
    testimonials: [],
    team: [],
    credentials: [],
    globals,
    service: null,
    draftPreview: false,
    ...overrides,
  };
  return {
    ...base,
    tokens: tokenTable(buildTokenContext(base)),
    media: overrides.media ?? new Map(),
    route: overrides.route ?? { searchParams: {}, intake: null },
    pageKey: overrides.pageKey ?? null,
  };
}
