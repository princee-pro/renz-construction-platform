export const SUPPORTED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
] as const;

export type SupportedMediaMime = (typeof SUPPORTED_MEDIA_MIME_TYPES)[number];

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function containsFtyp(bytes: Uint8Array, brands: readonly string[]): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== "ftyp") {
    return false;
  }
  const brandBytes = bytes.slice(8, Math.min(bytes.length, 64));
  const value = String.fromCharCode(...brandBytes);
  return brands.some((brand) => value.includes(brand));
}

function looksLikeTextPayload(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 512));
  return /<\s*(?:\?xml|!doctype\s+html|html|svg|script|style|iframe|object|embed)/iu.test(sample);
}

export function detectMediaMime(bytes: Uint8Array): SupportedMediaMime | null {
  if (
    bytes.length < 4 ||
    looksLikeTextPayload(bytes) ||
    hasPrefix(bytes, [0x4d, 0x5a]) ||
    hasPrefix(bytes, [0x7f, 0x45, 0x4c, 0x46]) ||
    hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])
  ) {
    return null;
  }
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 4) === "WEBP")
    return "image/webp";
  if (containsFtyp(bytes, ["avif", "avis"])) return "image/avif";
  if (containsFtyp(bytes, ["isom", "iso2", "iso6", "mp41", "mp42", "avc1", "M4V"]))
    return "video/mp4";
  if (hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return "video/webm";
  return null;
}

export type MediaValidationResult = Readonly<{
  ok: boolean;
  detectedMime: SupportedMediaMime | null;
  code?: "unsupported_signature" | "mime_mismatch";
}>;

export function validateMediaSignature(
  declaredMime: string,
  bytes: Uint8Array,
): MediaValidationResult {
  const detectedMime = detectMediaMime(bytes);
  if (!detectedMime) {
    return { ok: false, detectedMime, code: "unsupported_signature" };
  }
  if (declaredMime !== detectedMime) {
    return { ok: false, detectedMime, code: "mime_mismatch" };
  }
  return { ok: true, detectedMime };
}
