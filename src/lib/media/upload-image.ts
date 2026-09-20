import "server-only";

import { createHash, randomUUID } from "node:crypto";

import sharp from "sharp";

import { detectMediaMime } from "@/lib/media/signatures";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Editorial image ingestion shared by the project media route and the
 * website media library: MIME sniffing, derivative generation, two private
 * bucket uploads, registration and finalization through the S4 commands.
 * The caller decides the provenance pair; nothing here grants publication.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
/** Hero loops (D1.6): short, muted, ≤ 12 MiB so a page never waits on them. */
export const MAX_VIDEO_UPLOAD_BYTES = 12 * 1024 * 1024;
const ORIGINALS_BUCKET = "editorial-originals";
const DERIVATIVES_BUCKET = "editorial-derivatives";
const DERIVATIVE_MAX_DIMENSION = 2400;

type Signature = Readonly<{ mime: string; matches: (bytes: Buffer) => boolean }>;

const signatures: readonly Signature[] = [
  {
    mime: "image/jpeg",
    matches: (bytes) =>
      bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mime: "image/png",
    matches: (bytes) =>
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    mime: "image/webp",
    matches: (bytes) =>
      bytes.length > 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    mime: "image/avif",
    matches: (bytes) =>
      bytes.length > 12 &&
      bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
      ["avif", "avis", "mif1", "msf1"].includes(bytes.subarray(8, 12).toString("ascii")),
  },
];

export function detectImageMime(bytes: Buffer): string | null {
  return signatures.find((signature) => signature.matches(bytes))?.mime ?? null;
}

export function sanitizeFilename(name: string): string {
  const trimmed = name.trim().slice(-120);
  const safe = trimmed.replace(/[^A-Za-z0-9._-]/gu, "_");
  return safe || "upload";
}

export type UploadResult =
  | Readonly<{
      ok: true;
      id: string;
      originalId: string;
      width: number | null;
      height: number | null;
      mimeType: string;
    }>
  | Readonly<{ ok: false; reason: string; status: number }>;

export async function uploadEditorialImage(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  file: File,
  provenance: Readonly<{ original: string; derivative: string }>,
): Promise<UploadResult> {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: "invalid_size", status: 400 };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectImageMime(bytes) ?? detectMediaMime(bytes);
  if (!detectedMime) return { ok: false, reason: "unsupported_type", status: 400 };
  const isVideo = detectedMime.startsWith("video/");
  if (isVideo && bytes.byteLength > MAX_VIDEO_UPLOAD_BYTES) {
    return { ok: false, reason: "video_too_large", status: 400 };
  }
  const mediaKind = isVideo ? "video" : "image";

  let originalMetadata: { width: number | null; height: number | null } = {
    width: null,
    height: null,
  };
  let derivativeBytes: Buffer = bytes;
  let derivativeWidth: number | null = null;
  let derivativeHeight: number | null = null;
  // Video (D1.6 hero loops) is stored as uploaded — no derivative render; the
  // browser decides which source to play. Images keep the 2400px derivative.
  if (!isVideo)
    try {
      const image = sharp(bytes);
      const metadata = await image.metadata();
      originalMetadata = { width: metadata.width ?? null, height: metadata.height ?? null };
      const resized = await image
        .resize({
          width: DERIVATIVE_MAX_DIMENSION,
          height: DERIVATIVE_MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer({ resolveWithObject: true });
      derivativeBytes = resized.data;
      derivativeWidth = resized.info.width ?? null;
      derivativeHeight = resized.info.height ?? null;
    } catch {
      return { ok: false, reason: "unreadable_image", status: 400 };
    }

  const safeFilename = sanitizeFilename(file.name || "upload");
  const originalId = randomUUID();
  const originalPath = `${originalId}/${safeFilename}`;
  const derivativeId = randomUUID();
  const derivativePath = `${derivativeId}/${safeFilename}`;
  const uploadedPaths: { bucket: string; path: string }[] = [];

  async function rollback(): Promise<void> {
    for (const target of uploadedPaths) {
      await client.storage.from(target.bucket).remove([target.path]);
    }
  }

  const originalUpload = await client.storage
    .from(ORIGINALS_BUCKET)
    .upload(originalPath, bytes, { contentType: detectedMime, upsert: false });
  if (originalUpload.error) return { ok: false, reason: "upload_failed", status: 502 };
  uploadedPaths.push({ bucket: ORIGINALS_BUCKET, path: originalPath });

  const originalRegistration = await client.rpc("register_media_asset", {
    target_id: originalId,
    target_bucket_id: ORIGINALS_BUCKET,
    target_object_path: originalPath,
    target_mime_type: detectedMime,
    target_byte_size: bytes.byteLength,
    target_checksum_sha256: createHash("sha256").update(bytes).digest("hex"),
    target_media_kind: mediaKind,
    target_provenance_class: provenance.original,
    target_original_filename: safeFilename,
    ...(originalMetadata.width ? { target_width: originalMetadata.width } : {}),
    ...(originalMetadata.height ? { target_height: originalMetadata.height } : {}),
  });
  if (originalRegistration.error) {
    await rollback();
    return { ok: false, reason: "registration_failed", status: 502 };
  }

  const derivativeUpload = await client.storage
    .from(DERIVATIVES_BUCKET)
    .upload(derivativePath, derivativeBytes, { contentType: detectedMime, upsert: false });
  if (derivativeUpload.error) {
    await rollback();
    return { ok: false, reason: "upload_failed", status: 502 };
  }
  uploadedPaths.push({ bucket: DERIVATIVES_BUCKET, path: derivativePath });

  const derivativeRegistration = await client.rpc("register_media_asset", {
    target_id: derivativeId,
    target_bucket_id: DERIVATIVES_BUCKET,
    target_object_path: derivativePath,
    target_mime_type: detectedMime,
    target_byte_size: derivativeBytes.byteLength,
    target_checksum_sha256: createHash("sha256").update(derivativeBytes).digest("hex"),
    target_media_kind: mediaKind,
    target_provenance_class: provenance.derivative,
    target_original_filename: safeFilename,
    target_source_asset_id: originalId,
    ...(derivativeWidth ? { target_width: derivativeWidth } : {}),
    ...(derivativeHeight ? { target_height: derivativeHeight } : {}),
  });
  if (derivativeRegistration.error) {
    await rollback();
    return { ok: false, reason: "registration_failed", status: 502 };
  }

  const finalizeOriginal = await client.rpc("finalize_media_upload", {
    target_id: originalId,
    expected_version: 1,
  });
  const finalizeDerivative = await client.rpc("finalize_media_upload", {
    target_id: derivativeId,
    expected_version: 1,
  });
  if (finalizeOriginal.error || finalizeDerivative.error) {
    return { ok: false, reason: "finalization_failed", status: 502 };
  }

  return {
    ok: true,
    id: derivativeId,
    originalId,
    width: derivativeWidth,
    height: derivativeHeight,
    mimeType: detectedMime,
  };
}
