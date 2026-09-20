import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

import {
  evidenceCommandInput,
  publicationActionInput,
  serviceCreateInput,
  serviceEditorInput,
  serviceEvidenceInput,
} from "@/features/services/service-contract";
import {
  decodeServiceCursor,
  encodeServiceCursor,
  normalizeServiceListFilters,
} from "@/features/services/service-data";
import { hasPermission } from "@/lib/auth/permissions";

const serviceId = "95000000-0000-4000-8000-000000000100";
const evidenceId = "95000000-0000-4000-8000-000000000101";

function validEditorForm(): FormData {
  const form = new FormData();
  form.set("serviceId", serviceId);
  form.set("serviceVersion", "3");
  form.set("localizationVersion", "4");
  form.set("locale", "en");
  form.set("slug", "synthetic-s5a-service");
  form.set("name", "SYNTHETIC S5A Service");
  form.set("summary", "SYNTHETIC test-only overview copy.");
  form.set("scope", "SYNTHETIC scope");
  form.set("deliverables", "SYNTHETIC deliverables");
  form.set("exclusions", "SYNTHETIC exclusions");
  form.set("clientInputs", "");
  form.set("deliveryWording", "SYNTHETIC delivery wording");
  form.set("professionalTerminology", "");
  form.set("seoTitle", "SYNTHETIC title");
  form.set("seoDescription", "SYNTHETIC description");
  form.set("sortOrder", "12");
  form.set("bodyBlocks", '[{"type":"paragraph","text":"SYNTHETIC body"}]');
  return form;
}

describe("S5A service administration contracts", () => {
  it("normalizes only admitted bounded list filters", () => {
    const result = normalizeServiceListFilters({
      q: `  ${"x".repeat(120)}  `,
      status: "published",
      locale: "en-GB",
      cursor: "not-a-cursor",
    });

    expect(result.query).toHaveLength(100);
    expect(result.status).toBe("published");
    expect(result.locale).toBe("en-GB");
    expect(result.cursor).toBe("");
  });

  it("round-trips a stable keyset cursor and rejects malformed input", () => {
    const cursor = { updated_at: "2026-09-06T12:00:00.000Z", id: serviceId };
    expect(decodeServiceCursor(encodeServiceCursor(cursor))).toEqual(cursor);
    expect(decodeServiceCursor("%%%invalid%%%")).toBeNull();
    expect(
      decodeServiceCursor(
        Buffer.from(JSON.stringify({ updated_at: "not-a-timestamp", id: serviceId })).toString(
          "base64url",
        ),
      ),
    ).toBeNull();
    expect(decodeServiceCursor("x".repeat(513))).toBeNull();
  });

  it("rejects markup and malformed slugs at the create boundary", () => {
    const form = new FormData();
    form.set("locale", "en");
    form.set("slug", "Not Valid");
    form.set("name", "<strong>SYNTHETIC</strong>");

    const result = serviceCreateInput(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["slug", "name"]),
      );
    }
  });

  it("parses exact structured blocks and converts empty optional fields to null", () => {
    const result = serviceEditorInput(validEditorForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.clientInputs).toBeNull();
      expect(result.data.bodyBlocks).toEqual([{ type: "paragraph", text: "SYNTHETIC body" }]);
      expect(result.data.serviceVersion).toBe(3);
    }
  });

  it("rejects unknown blocks and executable link protocols", () => {
    const unknown = validEditorForm();
    unknown.set("bodyBlocks", '[{"type":"widget","component":"script"}]');
    expect(serviceEditorInput(unknown).success).toBe(false);

    const executable = validEditorForm();
    executable.set(
      "bodyBlocks",
      '[{"type":"link","label":"SYNTHETIC","href":"javascript:alert(1)"}]',
    );
    expect(serviceEditorInput(executable).success).toBe(false);
  });

  it("requires exact IDs, versions, evidence vocabulary, and publication operations", () => {
    const evidence = new FormData();
    evidence.set("serviceId", serviceId);
    evidence.set("factClaim", "SYNTHETIC bounded fact");
    evidence.set("sourceType", "internal_record");
    evidence.set("sourceReference", "SYNTHETIC bounded reference");
    evidence.set("sensitivity", "private");
    evidence.set("required", "on");
    const evidenceResult = serviceEvidenceInput(evidence);
    expect(evidenceResult.success).toBe(true);
    if (evidenceResult.success) expect(evidenceResult.data.purpose).toBeNull();

    const command = new FormData();
    command.set("serviceId", serviceId);
    command.set("evidenceId", evidenceId);
    command.set("expectedVersion", "2");
    expect(evidenceCommandInput(command).success).toBe(true);

    const publication = new FormData();
    publication.set("serviceId", serviceId);
    publication.set("expectedVersion", "2");
    publication.set("operation", "delete");
    expect(publicationActionInput(publication).success).toBe(false);
  });

  it("filters capability convenience without broadening authority", () => {
    expect(hasPermission(["content.read", "content.write"], "content.write")).toBe(true);
    expect(hasPermission(new Set(["content.read"]), "content.publish")).toBe(false);
  });
});
