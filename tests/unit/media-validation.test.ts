import { describe, expect, it } from "vitest";

import {
  createMediaObjectPath,
  isAllowedMediaSignature,
  validateMediaUpload,
} from "../../src/lib/media/validation";

const mediaId = "81000000-0000-4000-8000-000000000020";

describe("S4 media validation", () => {
  it("requires UUID-rooted object paths", () => {
    expect(createMediaObjectPath(mediaId, "original.jpg")).toBe(`${mediaId}/original.jpg`);
    expect(() => createMediaObjectPath(mediaId, "../escape.jpg")).toThrow();
    expect(() => createMediaObjectPath("not-a-uuid", "original.jpg")).toThrow();
  });

  it("checks magic bytes instead of trusting the client MIME label", () => {
    expect(isAllowedMediaSignature("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      true,
    );
    expect(isAllowedMediaSignature("image/jpeg", new TextEncoder().encode("<svg>"))).toBe(false);
  });

  it("rejects inadmissible MIME types and mismatched bytes", () => {
    expect(
      validateMediaUpload({
        mimeType: "image/svg+xml",
        byteSize: 4,
        bytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]),
        mediaAssetId: mediaId,
        objectName: "original.svg",
      }),
    ).toMatchObject({ ok: false, code: "unsupported_mime" });

    expect(
      validateMediaUpload({
        mimeType: "image/png",
        byteSize: 4,
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        mediaAssetId: mediaId,
        objectName: "original.png",
      }),
    ).toMatchObject({ ok: false, code: "invalid_magic_bytes" });
  });
});
