import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  acceptedMimeTypes,
  intakeFileLimits,
  intakeFileTypes,
  type IntakeMimeType,
  type IntakeUploadPolicy,
} from "@/features/intake/intake-policy";
import { getIntakeScanner } from "@/features/intake/scanning";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const intakeBucketId = "lead-intake";

/**
 * Signature (magic-byte) detection. Extension and browser-declared MIME are
 * ignored on purpose: an HTML file renamed .jpg fails here.
 */
export function detectIntakeMimeType(bytes: Uint8Array): IntakeMimeType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/** Rejects payloads that carry executable/markup content regardless of signature. */
function containsActiveContent(bytes: Uint8Array, mime: IntakeMimeType): boolean {
  if (mime === "application/pdf") {
    const head = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 2 * 1024 * 1024))).toString(
      "latin1",
    );
    // Launch policy: PDFs with JavaScript, launch actions or embedded files are refused outright.
    return /\/JavaScript|\/JS\b|\/Launch|\/EmbeddedFile|\/OpenAction/u.test(head);
  }
  return false;
}

export type IntakeFileVerdict =
  | { ok: true; mime: IntakeMimeType; checksum: string; extension: string }
  | { ok: false; reason: "too_large" | "empty" | "unsupported_type" | "policy" | "active_content" };

export function validateIntakeFile(
  bytes: Uint8Array,
  policy: IntakeUploadPolicy,
): IntakeFileVerdict {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > intakeFileLimits.maxBytes) return { ok: false, reason: "too_large" };
  const mime = detectIntakeMimeType(bytes);
  if (!mime) return { ok: false, reason: "unsupported_type" };
  if (!acceptedMimeTypes(policy).includes(mime)) return { ok: false, reason: "policy" };
  if (containsActiveContent(bytes, mime)) return { ok: false, reason: "active_content" };
  return {
    ok: true,
    mime,
    checksum: createHash("sha256").update(bytes).digest("hex"),
    extension: intakeFileTypes[mime].extension,
  };
}

export type StoredIntakeFile = Readonly<{ id: string; fileCount: number }>;

/** Uploads into private quarantine and registers metadata against the session. */
export async function storeIntakeFile(
  sessionId: string,
  sessionTokenHash: string,
  bytes: Uint8Array,
  originalFilename: string,
  verdict: Extract<IntakeFileVerdict, { ok: true }>,
): Promise<{ ok: true; file: StoredIntakeFile } | { ok: false; code: string; detail: string }> {
  const service = createServiceSupabaseClient();
  const objectPath = `${sessionId}/${randomUUID()}.${verdict.extension}`;
  const upload = await service.storage
    .from(intakeBucketId)
    .upload(objectPath, bytes, { contentType: verdict.mime, upsert: false });
  if (upload.error)
    return {
      ok: false,
      code: "storage_failed",
      detail: "The file could not be stored. Try again.",
    };
  const scanner = getIntakeScanner();
  await scanner.scan(bytes, verdict.mime);
  const registered = await service.rpc("intake_register_attachment", {
    target_session_id: sessionId,
    target_token_hash: sessionTokenHash,
    target_object_path: objectPath,
    target_original_filename: originalFilename.slice(0, 255) || `upload.${verdict.extension}`,
    target_mime_type: verdict.mime,
    target_byte_size: bytes.length,
    target_checksum: verdict.checksum,
    max_files: intakeFileLimits.maxFiles,
  });
  const result = (registered.data ?? null) as {
    ok?: boolean;
    id?: string;
    file_count?: number;
    reasons?: { code?: string; detail?: string }[];
  } | null;
  if (registered.error || !result || result.ok !== true || typeof result.id !== "string") {
    await service.storage.from(intakeBucketId).remove([objectPath]);
    const reason = result?.reasons?.[0];
    return {
      ok: false,
      code: reason?.code ?? "register_failed",
      detail: reason?.detail ?? "The file could not be attached. Try again.",
    };
  }
  return { ok: true, file: { id: result.id, fileCount: result.file_count ?? 1 } };
}

export async function removeIntakeFile(
  sessionId: string,
  sessionTokenHash: string,
  attachmentId: string,
): Promise<boolean> {
  const service = createServiceSupabaseClient();
  const removed = await service.rpc("intake_remove_attachment", {
    target_session_id: sessionId,
    target_token_hash: sessionTokenHash,
    target_attachment_id: attachmentId,
  });
  const result = (removed.data ?? null) as { ok?: boolean; object_path?: string } | null;
  if (removed.error || !result || result.ok !== true || typeof result.object_path !== "string")
    return false;
  await service.storage.from(intakeBucketId).remove([result.object_path]);
  return true;
}
