import { assertSafeEditorialObjectPath } from "@/lib/media/paths";
import {
  SUPPORTED_MEDIA_MIME_TYPES,
  validateMediaSignature,
  type SupportedMediaMime,
} from "@/lib/media/signatures";

export const editorialMimeTypes = SUPPORTED_MEDIA_MIME_TYPES;
export const MAX_EDITORIAL_BYTES = 25 * 1024 * 1024;

export type EditorialMimeType = SupportedMediaMime;

export interface MediaValidationResult {
  ok: boolean;
  code?: "unsupported_mime" | "invalid_magic_bytes" | "invalid_size" | "invalid_object_path";
  detail?: string;
}

export function isEditorialMimeType(value: string): value is EditorialMimeType {
  return (editorialMimeTypes as readonly string[]).includes(value);
}

export function isAllowedMediaSignature(mimeType: string, bytes: Uint8Array): boolean {
  return isEditorialMimeType(mimeType) && validateMediaSignature(mimeType, bytes).ok;
}

export function createMediaObjectPath(mediaAssetId: string, objectName: string): string {
  const objectPath = `${mediaAssetId.toLowerCase()}/${objectName}`;
  return assertSafeEditorialObjectPath(mediaAssetId, objectPath);
}

export function validateMediaUpload(input: {
  mimeType: string;
  byteSize: number;
  bytes: Uint8Array;
  mediaAssetId: string;
  objectName: string;
}): MediaValidationResult {
  if (!isEditorialMimeType(input.mimeType)) {
    return {
      ok: false,
      code: "unsupported_mime",
      detail: "Only admitted editorial image/video MIME types may enter the media pipeline.",
    };
  }

  if (!Number.isSafeInteger(input.byteSize) || input.byteSize <= 0) {
    return {
      ok: false,
      code: "invalid_size",
      detail: "Media byte size must be a positive safe integer.",
    };
  }
  if (input.byteSize !== input.bytes.byteLength || input.byteSize > MAX_EDITORIAL_BYTES) {
    return {
      ok: false,
      code: "invalid_size",
      detail:
        "Media byte size must match the payload and remain within the 25 MiB foundation limit.",
    };
  }

  try {
    createMediaObjectPath(input.mediaAssetId, input.objectName);
  } catch {
    return {
      ok: false,
      code: "invalid_object_path",
      detail: "Media objects must use a UUID-rooted, traversal-free path.",
    };
  }

  if (!isAllowedMediaSignature(input.mimeType, input.bytes)) {
    return {
      ok: false,
      code: "invalid_magic_bytes",
      detail: "The file signature does not match the admitted MIME type.",
    };
  }

  return { ok: true };
}
