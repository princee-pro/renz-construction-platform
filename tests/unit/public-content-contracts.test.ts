import { describe, expect, it } from "vitest";

import {
  mapPublicService,
  normalizePublicHttpsUrl,
} from "../../src/features/public-content/contracts";

const publishedServiceRow = {
  body_blocks: [{ type: "paragraph", text: "Synthetic approved body." }],
  client_inputs: "Synthetic inputs",
  deliverables: "Synthetic deliverables",
  delivery_wording: "Synthetic delivery wording",
  exclusions: "Synthetic exclusions",
  featured: true,
  id: "00000000-0000-4000-8000-000000000601",
  locale: "en",
  name: "Synthetic service",
  published_at: "2026-09-07T00:00:00.000Z",
  schema_version: 1,
  scope: "Synthetic scope",
  seo_description: "Synthetic SEO description",
  seo_title: "Synthetic SEO title",
  slug: "synthetic-service",
  sort_order: 10,
  summary: "Synthetic approved summary.",
  positioning: "Synthetic positioning",
  sub_services: ["Synthetic sub-service"],
  use_cases: ["Synthetic use case"],
  process_steps: ["Synthetic step"],
  coordination: "Synthetic coordination",
  faqs: [{ question: "Synthetic question?", answer: "Synthetic answer." }],
  hero_asset_id: null,
};

describe("public projection contracts", () => {
  it("maps a complete published service into the public rendering contract", () => {
    const service = mapPublicService(publishedServiceRow);

    expect(service).toMatchObject({
      id: publishedServiceRow.id,
      slug: "synthetic-service",
      name: "Synthetic service",
      featured: true,
      bodyBlocks: [{ type: "paragraph", text: "Synthetic approved body." }],
    });
  });

  it("fails closed when a required public field is blank", () => {
    expect(mapPublicService({ ...publishedServiceRow, summary: "  " })).toBeNull();
  });

  it("drops unsafe structured blocks without suppressing the safe record", () => {
    const service = mapPublicService({
      ...publishedServiceRow,
      body_blocks: [{ type: "paragraph", text: "<script>unsafe</script>" }],
    });

    expect(service?.bodyBlocks).toEqual([]);
  });

  it("admits only unambiguous credential-free HTTPS URLs at the public adapter", () => {
    expect(normalizePublicHttpsUrl("https://example.invalid/directions?mode=drive")).toBe(
      "https://example.invalid/directions?mode=drive",
    );
    expect(normalizePublicHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePublicHttpsUrl("https://user:password@example.invalid/")).toBeNull();
    expect(normalizePublicHttpsUrl("https://example.invalid\\@attacker.invalid/")).toBeNull();
  });
});
