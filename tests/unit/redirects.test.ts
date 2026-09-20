import { describe, expect, it } from "vitest";

import { safeInternalRedirect } from "../../src/lib/auth/redirects";

describe("safeInternalRedirect", () => {
  it("keeps a same-origin internal path", () => {
    expect(safeInternalRedirect("/admin/security?tab=mfa")).toBe("/admin/security?tab=mfa");
  });

  it("rejects external, protocol-relative, and malformed destinations", () => {
    expect(safeInternalRedirect("https://evil.example/login")).toBe("/admin");
    expect(safeInternalRedirect("//evil.example/login")).toBe("/admin");
    expect(safeInternalRedirect("javascript:alert(1)")).toBe("/admin");
    expect(safeInternalRedirect("%2F%2Fevil.example")).toBe("/admin");
  });
});
