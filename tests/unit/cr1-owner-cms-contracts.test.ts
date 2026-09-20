import { describe, expect, it } from "vitest";

import {
  isRenderableHref,
  parseInline,
  parseRichText,
  serializeRichText,
  stripInline,
} from "../../src/lib/content/rich-text";
import {
  compositionCycle,
  deriveProjectFilters,
  placeProjects,
  selectShowcase,
} from "../../src/features/website/project-layout";
import { isAdmittedCustomSlug, reservedSlugs, slugify } from "../../src/features/website/routes";
import {
  addableSectionTypes,
  defaultSectionConfig,
  getSectionType,
  sectionTypes,
  validateSectionConfig,
} from "../../src/features/website/section-registry";
import {
  compactFacts,
  countWords,
  interpolate,
  interpolateConfig,
  tokenTable,
} from "../../src/features/website/tokens";
import type { ProjectCardData } from "../../src/features/public-content/data";

// CR1 §14–24, §42, §47, §12, §111: the pure contracts behind the owner CMS.

function conceptProject(overrides: Partial<ProjectCardData> = {}): ProjectCardData {
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

describe("section registry", () => {
  it("has a static, curated set of types with a schema each", () => {
    expect(sectionTypes.length).toBeGreaterThanOrEqual(30);
    for (const definition of sectionTypes) {
      expect(definition.key).toMatch(/^[a-z_]+$/u);
      const defaults = defaultSectionConfig(definition.key);
      expect(Object.keys(defaults).sort()).toEqual(
        definition.fields.map((field) => field.key).sort(),
      );
      // Validation always answers with field-level guidance, never a throw.
      const result = validateSectionConfig(definition.key, defaults);
      if (!result.ok) expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }
  });

  it("never offers system modules or global sections to the page builder", () => {
    const keys = addableSectionTypes("custom").map((definition) => definition.key);
    expect(keys).toContain("faq");
    expect(keys).toContain("cta");
    expect(keys).not.toContain("contact_form");
    expect(keys).not.toContain("start_project_wizard");
    expect(keys).not.toContain("global_copy");
    expect(addableSectionTypes("global")).toEqual([]);
  });

  it("refuses markup and executable links at the schema boundary", () => {
    const hero = validateSectionConfig("hero", {
      ...defaultSectionConfig("hero"),
      headline_lines: "<script>alert(1)</script>",
    });
    expect(hero.ok).toBe(false);
    const ctaField = getSectionType("cta")?.fields.find((field) => field.kind === "cta");
    expect(ctaField).toBeDefined();
    const key = ctaField?.key ?? "primary";
    const base = { ...defaultSectionConfig("cta"), heading: "Talk to RENZ" };
    const cta = validateSectionConfig("cta", {
      ...base,
      [key]: { label: "Go", destination_type: "external", destination: "javascript:alert(1)" },
    });
    expect(cta.ok).toBe(false);
    const http = validateSectionConfig("cta", {
      ...base,
      [key]: { label: "Go", destination_type: "external", destination: "http://example.test" },
    });
    expect(http.ok).toBe(false);
    const external = validateSectionConfig("cta", {
      ...base,
      [key]: { label: "Go", destination_type: "external", destination: "https://example.test" },
    });
    expect(external.ok).toBe(true);
    const admin = validateSectionConfig("cta", {
      ...base,
      [key]: { label: "Go", destination_type: "internal", destination: "/admin" },
    });
    expect(admin.ok).toBe(false);
  });

  it("rejects unknown keys so raw style / html can never ride along", () => {
    const result = validateSectionConfig("rich_text", {
      ...defaultSectionConfig("rich_text"),
      style: "color:red",
    });
    expect(result.ok).toBe(false);
    expect(getSectionType("nope")).toBeNull();
    expect(validateSectionConfig("nope", {}).ok).toBe(false);
  });
});

describe("rich text", () => {
  it("parses headings, paragraphs, lists, quotes and inline marks", () => {
    const blocks = parseRichText(
      "## Heading\n\nA **bold** and *quiet* line with [a link](https://renz.test).\n\n- one\n- two\n\n> A quote\n> — Someone",
      { allowQuote: true },
    );
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "quote"]);
    expect(serializeRichText(blocks)).toContain("## Heading");
    const inline = parseInline("A **bold** and *quiet* line with [a link](https://renz.test).");
    expect(inline.map((node) => node.kind)).toEqual([
      "text",
      "strong",
      "text",
      "em",
      "text",
      "link",
      "text",
    ]);
    expect(stripInline("**bold** [label](https://renz.test)")).toBe("bold label");
  });

  it("only renders http(s), mailto, wa.me and public internal links", () => {
    expect(isRenderableHref("https://wa.me/447412853143")).toBe(true);
    expect(isRenderableHref("mailto:hello@renz.test")).toBe(true);
    expect(isRenderableHref("/services/design")).toBe(true);
    expect(isRenderableHref("javascript:alert(1)")).toBe(false);
    expect(isRenderableHref("data:text/html,hi")).toBe(false);
    expect(isRenderableHref("/admin/website")).toBe(false);
    expect(isRenderableHref("//evil.test")).toBe(false);
    const nodes = parseInline("[x](javascript:alert(1))");
    expect(nodes.some((node) => node.kind === "link")).toBe(false);
    expect(nodes[0]).toEqual({ kind: "text", text: "x" });
  });
});

describe("custom page routes", () => {
  it("mirrors the reserved list the database enforces", () => {
    for (const slug of [
      "admin",
      "api",
      "services",
      "projects",
      "insights",
      "contact",
      "start-a-project",
      "privacy",
      "terms",
      "i",
      "po",
    ]) {
      expect(reservedSlugs).toContain(slug);
      expect(isAdmittedCustomSlug(slug)).toBe(false);
    }
    expect(isAdmittedCustomSlug("synthetic-approach")).toBe(true);
    expect(isAdmittedCustomSlug("Synthetic Approach")).toBe(false);
    expect(isAdmittedCustomSlug("../etc")).toBe(false);
    expect(isAdmittedCustomSlug("_hidden")).toBe(false);
    expect(isAdmittedCustomSlug("a")).toBe(false);
  });

  it("slugifies titles safely", () => {
    expect(slugify("Synthetic Approach — Édition 2026!")).toBe("synthetic-approach-edition-2026");
  });
});

describe("content tokens", () => {
  const table = tokenTable({
    services: { count: 6, names: ["Design", "Execution"] },
    projects: { count: 7, conceptCount: 7, realCount: 0 },
    insights: { count: 3, topics: ["Planning"] },
    process: { count: 5 },
    business: {
      displayName: "RENZ Construction Services Ltd",
      shortName: "RENZ",
      region: "Kigali",
      serviceArea: null,
    },
    contact: { email: "hello@renz.test" },
  });

  it("keeps counts truthful when content is added", () => {
    expect(countWords(5)).toBe("Five");
    expect(interpolate("{{services.count_words}} ways ({{services.count}})", table)).toBe(
      "Six ways (6)",
    );
    expect(interpolate("{{services.names}}", table)).toBe("Design · Execution");
    expect(interpolate("{{unknown.token}}", table)).toBe("");
    expect(interpolate("{{business.service_area}}", table)).toBe("");
  });

  it("interpolates deep configuration and drops empty facts", () => {
    const config = interpolateConfig(
      {
        facts: [
          { label: "Based in", value: "{{business.region}}" },
          { label: "Area", value: "{{business.service_area}}" },
        ],
      },
      table,
    );
    expect(compactFacts(config.facts)).toEqual([{ label: "Based in", value: "Kigali" }]);
  });
});

describe("project auto-placement", () => {
  const studies = (count: number) =>
    Array.from({ length: count }, (_, index) =>
      conceptProject({
        id: `00000000-0000-4000-8000-0000000000${(index + 10).toString(16).padStart(2, "0")}`,
        slug: `study-${index}`,
        sortOrder: index,
      }),
    );

  it("cycles compositions for 6, 7, 8, 9 and 12 projects without adjacent repeats", () => {
    for (const count of [6, 7, 8, 9, 12]) {
      const placed = placeProjects(studies(count));
      expect(placed).toHaveLength(count);
      for (let index = 1; index < placed.length; index += 1) {
        expect(placed[index]?.composition).not.toBe(placed[index - 1]?.composition);
      }
      expect(new Set(placed.map((entry) => entry.composition)).size).toBe(
        Math.min(count, compositionCycle.length),
      );
    }
  });

  it("honours a layout hint but never lets an image-led composition run without media", () => {
    const [first, second] = placeProjects([
      conceptProject({ layoutHint: "strip" }),
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000b2",
        slug: "no-media",
        media: null,
        sortOrder: 20,
      }),
    ]);
    expect(first?.composition).toBe("strip");
    expect(second?.composition).toBe("technical");
  });

  it("selects the home showcase from Feature on Home, then featured, then all", () => {
    const list = [
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000c1",
        slug: "a",
        homeFeatured: false,
        featured: false,
        sortOrder: 1,
      }),
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000c2",
        slug: "b",
        homeFeatured: false,
        featured: true,
        sortOrder: 2,
      }),
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000c3",
        slug: "c",
        homeFeatured: true,
        featured: false,
        sortOrder: 3,
      }),
    ];
    expect(selectShowcase(list, "home", 4).map((project) => project.slug)).toEqual(["c"]);
    expect(
      selectShowcase(
        list.map((project) => ({ ...project, homeFeatured: false })),
        "home",
        4,
      ).map((project) => project.slug),
    ).toEqual(["b"]);
    expect(
      selectShowcase(
        list.map((project) => ({ ...project, homeFeatured: false, featured: false })),
        "home",
        2,
      ).map((project) => project.slug),
    ).toEqual(["a", "b"]);
  });

  it("derives filters from the projects' own types", () => {
    const filters = deriveProjectFilters([
      conceptProject({ projectType: "Hillside residential concept" }),
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000d2",
        slug: "d",
        projectType: "Civic study",
      }),
      conceptProject({
        id: "00000000-0000-4000-8000-0000000000d3",
        slug: "e",
        projectType: "Civic study",
      }),
    ]);
    expect(filters[0]).toEqual({ key: "all", label: "All", count: 3 });
    expect(filters[1]).toEqual({ key: "civic-study", label: "Civic study", count: 2 });
  });
});
