import { describe, expect, it } from "vitest";

import { parseClientPreviewFlag } from "../../src/lib/env/preview-flag";

describe("client preview flag", () => {
  it("enables preview only for an explicit true value", () => {
    expect(parseClientPreviewFlag("true")).toBe(true);
    expect(parseClientPreviewFlag(" TRUE ")).toBe(true);
    expect(parseClientPreviewFlag("1")).toBe(false);
    expect(parseClientPreviewFlag("yes")).toBe(false);
    expect(parseClientPreviewFlag(undefined)).toBe(false);
  });
});
