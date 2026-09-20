import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const idSchema = z.string().uuid();
const SIGNED_URL_TTL_SECONDS = 60 * 5;

/**
 * Resolves a project_media id to a short-lived signed Storage URL and
 * redirects to it. Eligibility (public delivery OR authorized draft
 * preview) is decided entirely inside resolve_project_media_path() —
 * this route never reads raw Storage paths itself and never proxies bytes.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectMediaId: string }> },
): Promise<NextResponse> {
  const { projectMediaId } = await params;
  const parsedId = idSchema.safeParse(projectMediaId);
  if (!parsedId.success) {
    return NextResponse.json({ ok: false, reason: "invalid_id" }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("resolve_project_media_path", {
    target_id: parsedId.data,
  });
  if (error || data === null || typeof data !== "object") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  const path = data as { bucket_id?: unknown; object_path?: unknown };
  if (typeof path.bucket_id !== "string" || typeof path.object_path !== "string") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  // Eligibility was decided above by the database facade for this caller
  // (anonymous visitor or staff); only the signing uses the server credential,
  // exactly as the C7 brand-media route does. Anonymous visitors hold no
  // Storage grant, so a visitor-scoped signature would always fail.
  const signer = createServiceSupabaseClient();
  const signed = await signer.storage
    .from(path.bucket_id)
    .createSignedUrl(path.object_path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, reason: "sign_failed" }, { status: 502 });
  }

  return NextResponse.redirect(signed.data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=240" },
  });
}
