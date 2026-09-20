import "server-only";

import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
const SIGNED_URL_TTL_SECONDS = 120;

/**
 * Private lead attachment delivery (C8 §83–84). The database decides
 * eligibility (`leads.attachments.read`, AAL2, attachment bound to a lead,
 * not rejected); the server credential then mints a short-lived signed URL.
 * Images may preview inline; PDFs are always delivered as downloads so no
 * embedded content executes in the Admin origin. No permanent URL exists.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
): Promise<NextResponse> {
  const { attachmentId } = await params;
  if (!/^[0-9a-f-]{36}$/u.test(attachmentId)) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  const staff = await createServerSupabaseClient();
  const gate = await staff.rpc("admin_lead_attachment_path", {
    target_attachment_id: attachmentId,
  });
  const resolved = (gate.error ? null : gate.data) as {
    bucket_id?: unknown;
    object_path?: unknown;
    detected_mime_type?: unknown;
    original_filename?: unknown;
  } | null;
  if (
    !resolved ||
    typeof resolved.bucket_id !== "string" ||
    typeof resolved.object_path !== "string" ||
    typeof resolved.detected_mime_type !== "string"
  ) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  const download =
    new URL(request.url).searchParams.get("download") === "1" ||
    resolved.detected_mime_type === "application/pdf";
  const filename =
    typeof resolved.original_filename === "string"
      ? resolved.original_filename.replace(/[^A-Za-z0-9._-]/gu, "_").slice(0, 120)
      : "attachment";
  const service = createServiceSupabaseClient();
  const signed = await service.storage
    .from(resolved.bucket_id)
    .createSignedUrl(
      resolved.object_path,
      SIGNED_URL_TTL_SECONDS,
      download ? { download: filename } : undefined,
    );
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, reason: "sign_failed" }, { status: 502 });
  }
  return NextResponse.redirect(signed.data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
