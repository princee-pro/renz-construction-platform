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
/**
 * D1.7 §101: `?size=thumb` serves the 960px WebP child registered at upload
 * (media_assets.source_asset_id → the eligible derivative). Eligibility is
 * still decided by the facade for the attached asset; the thumbnail is a
 * pure size variant of it. Assets uploaded before D1.7 have no thumbnail and
 * fall back to the derivative.
 */
async function thumbnailPath(
  signer: ReturnType<typeof createServiceSupabaseClient>,
  bucketId: string,
  objectPath: string,
): Promise<{ bucket_id: string; object_path: string } | null> {
  const parent = await signer
    .from("media_assets")
    .select("id")
    .eq("bucket_id", bucketId)
    .eq("object_path", objectPath)
    .maybeSingle();
  if (parent.error || !parent.data) return null;
  const child = await signer
    .from("media_assets")
    .select("bucket_id, object_path")
    .eq("source_asset_id", parent.data.id)
    .in("storage_state", ["ready_private", "promotion_pending", "public_eligible"])
    .lte("width", 960)
    .order("width", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (child.error || !child.data) return null;
  return child.data;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectMediaId: string }> },
): Promise<NextResponse> {
  const { projectMediaId } = await params;
  const wantsThumb = new URL(request.url).searchParams.get("size") === "thumb";
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
  const target = (wantsThumb &&
    (await thumbnailPath(signer, path.bucket_id, path.object_path))) || {
    bucket_id: path.bucket_id,
    object_path: path.object_path,
  };
  const signed = await signer.storage
    .from(target.bucket_id)
    .createSignedUrl(target.object_path, SIGNED_URL_TTL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, reason: "sign_failed" }, { status: 502 });
  }

  return NextResponse.redirect(signed.data.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=240" },
  });
}
