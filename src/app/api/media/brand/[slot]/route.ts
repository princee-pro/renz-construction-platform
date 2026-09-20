import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { Database } from "@/lib/database/database.types";
import { createPublicSupabaseClient } from "@/lib/supabase/public-server";
import { getSupabaseSecretKey, getSupabaseServerEnvironment } from "@/lib/supabase/server-env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const SIGNED_URL_TTL_SECONDS = 60 * 10;
const slots = new Set([
  "primary_logo",
  "reversed_logo",
  "favicon",
  "default_og",
  "default_share",
  "default_hero",
  "document_logo",
]);

/**
 * Brand media delivery. Eligibility is decided entirely by
 * resolve_brand_media_path(): a slot resolves only when it is in the
 * PUBLISHED configuration (or the caller is staff previewing). The narrow
 * server credential only mints a short-lived signed URL for that one object;
 * no raw Storage path or secret ever reaches the browser.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slot: string }> },
): Promise<NextResponse> {
  const { slot } = await params;
  if (!slots.has(slot)) {
    return NextResponse.json({ ok: false, reason: "unknown_slot" }, { status: 404 });
  }
  const staff = await createServerSupabaseClient();
  const gate = await staff.rpc("resolve_brand_media_path", { target_slot: slot });
  let path = gate.error ? null : gate.data;
  if (path === null) {
    const anonymous = createPublicSupabaseClient();
    const anonGate = anonymous
      ? await anonymous.rpc("resolve_brand_media_path", { target_slot: slot })
      : null;
    path = anonGate && !anonGate.error ? anonGate.data : null;
  }
  if (path === null || typeof path !== "object") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  const resolved = path as { bucket_id?: unknown; object_path?: unknown };
  if (typeof resolved.bucket_id !== "string" || typeof resolved.object_path !== "string") {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  const environment = getSupabaseServerEnvironment();
  const signer = createClient<Database>(environment.url, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const signed = await signer.storage
    .from(resolved.bucket_id)
    .createSignedUrl(resolved.object_path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, reason: "sign_failed" }, { status: 502 });
  }
  return NextResponse.redirect(signed.data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
