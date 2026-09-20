import { describe, expect, it } from "vitest";

import {
  contentBlocksSchema,
  isSafeStructuredValue,
  parsePublicationCommand,
} from "../../src/lib/content/schemas";

describe("S4 structured content schemas", () => {
  it("accepts the bounded editorial vocabulary", () => {
    const result = contentBlocksSchema.parse([
      { type: "heading", level: 2, text: "Synthetic heading" },
      { type: "paragraph", text: "Synthetic paragraph for a local test." },
      { type: "list", items: ["One", "Two"] },
      { type: "link", label: "Internal route", href: "/about" },
    ]);

    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({ type: "heading", level: 2 });
  });

  it("rejects executable markup and unsafe protocols", () => {
    expect(() =>
      contentBlocksSchema.parse([{ type: "paragraph", text: "<script>alert(1)</script>" }]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([{ type: "link", label: "Unsafe", href: "javascript:alert(1)" }]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([{ type: "paragraph", text: "<strong>Raw HTML</strong>" }]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([
        { type: "paragraph", text: "Synthetic copy", component: "unregistered" },
      ]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([{ type: "link", label: "Private", href: "/admin" }]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([{ type: "link", label: "Encoded", href: "/%61dmin" }]),
    ).toThrow();
    expect(() =>
      contentBlocksSchema.parse([{ type: "link", label: "Ambiguous", href: "/\\example.test" }]),
    ).toThrow();
    expect(isSafeStructuredValue({ onClick: "do-not-run" })).toBe(false);
    expect(isSafeStructuredValue({ html: "<p>raw</p>" })).toBe(false);
  });

  it("validates optimistic publication commands", () => {
    expect(
      parsePublicationCommand({
        contentType: "service",
        targetId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
      }),
    ).toMatchObject({ contentType: "service", expectedVersion: 1 });
    expect(() =>
      parsePublicationCommand({
        contentType: "service",
        targetId: "not-a-uuid",
        expectedVersion: 1,
      }),
    ).toThrow();
    expect(() =>
      parsePublicationCommand({
        contentType: "service",
        targetId: "00000000-0000-4000-8000-000000000001",
        expectedVersion: 1,
        actorId: "00000000-0000-4000-8000-000000000002",
      }),
    ).toThrow();
  });
});
