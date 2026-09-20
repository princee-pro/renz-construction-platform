import { describe, expect, it } from "vitest";

import { detectMediaMime, validateMediaSignature } from "../../src/lib/media/signatures";
import { isSafeEditorialObjectPath } from "../../src/lib/media/paths";

const assetId = "00000000-0000-4000-8000-000000000001";

describe("S4 media admission", () => {
  it("detects admitted binary signatures", () => {
    expect(detectMediaMime(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe("image/jpeg");
    expect(detectMediaMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png",
    );
    expect(
      detectMediaMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe("image/webp");
    expect(
      validateMediaSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xd9])),
    ).toMatchObject({ ok: true });
  });

  it("rejects type mismatches and text/executable payloads", () => {
    expect(validateMediaSignature("image/png", new Uint8Array([0xff, 0xd8, 0xff, 0xd9])).ok).toBe(
      false,
    );
    expect(
      detectMediaMime(new TextEncoder().encode("<svg><script>alert(1)</script></svg>")),
    ).toBeNull();
    expect(detectMediaMime(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it("requires a UUID-rooted, traversal-free object path", () => {
    expect(isSafeEditorialObjectPath(assetId, `${assetId}/hero.webp`)).toBe(true);
    expect(isSafeEditorialObjectPath(assetId, `${assetId}/../private.txt`)).toBe(false);
    expect(isSafeEditorialObjectPath(assetId, `other/${assetId}.jpg`)).toBe(false);
  });
});
