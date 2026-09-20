import { describe, expect, it } from "vitest";

import { classifyEnvironmentVariable } from "../../src/lib/env/visibility";

describe("classifyEnvironmentVariable", () => {
  it("classifies Next.js public names as browser-exposed", () => {
    expect(classifyEnvironmentVariable("NEXT_PUBLIC_EXAMPLE")).toBe("public");
  });

  it("keeps unprefixed names server-only", () => {
    expect(classifyEnvironmentVariable("INTERNAL_EXAMPLE")).toBe("server-only");
  });

  it("rejects an empty environment name", () => {
    expect(() => classifyEnvironmentVariable("   ")).toThrow(TypeError);
  });
});
