import "server-only";

import { NextResponse } from "next/server";

import {
  removeIntakeFile,
  storeIntakeFile,
  validateIntakeFile,
} from "@/features/intake/intake-files";
import { intakeFileLimits, intakeFileTypes } from "@/features/intake/intake-policy";
import {
  consumeRateLimit,
  hashUploadToken,
  newUploadToken,
  verifyFormToken,
  visitorIdentityHash,
} from "@/features/intake/intake-server";
import { getSiteIdentity } from "@/lib/site/public-configuration";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Public supporting-file upload (C8 §29–36). The browser never talks to
 * Storage: this route validates the signature server-side, stores the bytes
 * in the private `lead-intake` quarantine bucket under a UUID name and
 * registers metadata against a temporary upload session the visitor owns
 * through a secret token (only its HMAC is stored). Nothing here is
 * anonymous-readable and nothing is ever published.
 */

function json(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) return json(403, { ok: false, reason: "origin" });
  const identity = await getSiteIdentity();
  if (!identity.intake.enabled || identity.intake.uploadPolicy === "disabled") {
    return json(409, {
      ok: false,
      reason: "uploads_disabled",
      message: "Supporting files are not accepted at the moment.",
    });
  }
  const identityHash = await visitorIdentityHash();
  if (!identityHash) return json(503, { ok: false, reason: "unavailable" });
  const limit = await consumeRateLimit("upload", identityHash);
  if (!limit.allowed) {
    return json(429, {
      ok: false,
      reason: "rate_limited",
      message: "Too many uploads. Please wait a moment.",
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(400, { ok: false, reason: "invalid_body" });
  }
  const formToken = formData.get("formToken");
  const token = typeof formToken === "string" ? verifyFormToken(formToken) : null;
  // Uploads may start immediately after render, so "too_fast" is not a reason to refuse a file.
  if (!token || (!token.ok && token.reason !== "too_fast")) {
    return json(400, {
      ok: false,
      reason: "form_session",
      message: "Reload the page and try again.",
    });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) return json(400, { ok: false, reason: "missing_file" });
  if (file.size > intakeFileLimits.maxBytes) {
    return json(413, {
      ok: false,
      reason: "too_large",
      message: `Each file must be ${intakeFileLimits.maxBytes / (1024 * 1024)} MB or smaller.`,
    });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const verdict = validateIntakeFile(bytes, identity.intake.uploadPolicy);
  if (!verdict.ok) {
    const accepted = Object.values(intakeFileTypes)
      .map((type) => type.label)
      .join(", ");
    const messages: Record<typeof verdict.reason, string> = {
      too_large: `Each file must be ${intakeFileLimits.maxBytes / (1024 * 1024)} MB or smaller.`,
      empty: "The file is empty.",
      unsupported_type: `Only ${accepted} files are accepted, and the file must really be that type.`,
      policy:
        identity.intake.uploadPolicy === "images_only"
          ? "Only JPEG, PNG and WebP images are accepted at the moment."
          : "This file type is not accepted.",
      active_content: "PDFs with scripts, launch actions or embedded files are not accepted.",
    };
    return json(422, { ok: false, reason: verdict.reason, message: messages[verdict.reason] });
  }

  const service = createServiceSupabaseClient();
  let sessionId = formData.get("sessionId");
  let sessionToken = formData.get("sessionToken");
  let issuedToken: string | null = null;
  if (
    typeof sessionId !== "string" ||
    typeof sessionToken !== "string" ||
    !/^[0-9a-f-]{36}$/u.test(sessionId) ||
    !/^[0-9a-f]{64}$/u.test(sessionToken)
  ) {
    issuedToken = newUploadToken();
    const created = await service.rpc("intake_create_upload_session", {
      target_token_hash: hashUploadToken(issuedToken),
      target_identity_hash: identityHash,
      ttl_seconds: intakeFileLimits.sessionTtlSeconds,
    });
    const result = (created.data ?? null) as { ok?: boolean; id?: string } | null;
    if (created.error || !result || result.ok !== true || typeof result.id !== "string") {
      return json(503, { ok: false, reason: "unavailable" });
    }
    sessionId = result.id;
    sessionToken = issuedToken;
  }
  const stored = await storeIntakeFile(
    sessionId,
    hashUploadToken(sessionToken),
    bytes,
    file.name,
    verdict,
  );
  if (!stored.ok) {
    const status =
      stored.code === "expired_session"
        ? 410
        : stored.code === "too_many_files"
          ? 409
          : stored.code === "not_authorized"
            ? 403
            : 502;
    return json(status, { ok: false, reason: stored.code, message: stored.detail });
  }
  return json(201, {
    ok: true,
    sessionId,
    ...(issuedToken ? { sessionToken: issuedToken } : {}),
    attachment: {
      id: stored.file.id,
      name: file.name.slice(0, 255),
      size: bytes.length,
      type: verdict.mime,
    },
    fileCount: stored.file.fileCount,
    maxFiles: intakeFileLimits.maxFiles,
  });
}

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) return json(403, { ok: false, reason: "origin" });
  let body: { sessionId?: unknown; sessionToken?: unknown; attachmentId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json(400, { ok: false, reason: "invalid_body" });
  }
  const { sessionId, sessionToken, attachmentId } = body;
  if (
    typeof sessionId !== "string" ||
    typeof sessionToken !== "string" ||
    typeof attachmentId !== "string" ||
    !/^[0-9a-f-]{36}$/u.test(sessionId) ||
    !/^[0-9a-f]{64}$/u.test(sessionToken) ||
    !/^[0-9a-f-]{36}$/u.test(attachmentId)
  ) {
    return json(400, { ok: false, reason: "invalid_request" });
  }
  const removed = await removeIntakeFile(sessionId, hashUploadToken(sessionToken), attachmentId);
  return removed ? json(200, { ok: true }) : json(404, { ok: false, reason: "not_found" });
}
