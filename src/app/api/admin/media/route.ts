import "server-only";

import { NextResponse } from "next/server";

import { authorizeServerAction } from "@/lib/auth/access";
import { uploadEditorialImage } from "@/lib/media/upload-image";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Website media library upload (CR1 §32–33). The owner chooses how RENZ
 * holds the image: RENZ-provided (client original → derivative), licensed
 * (production asset) or a generated concept (never evidence). Rights are
 * confirmed as a separate explicit step in the library, and an optional
 * alt text / caption are stored with the asset.
 */
const classifications: Readonly<
  Record<string, Readonly<{ original: string; derivative: string }>>
> = {
  renz_provided: { original: "client_original", derivative: "client_derivative" },
  licensed: { original: "production_asset", derivative: "production_asset" },
  generated_concept: { original: "generated_reference", derivative: "generated_reference" },
};

export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeServerAction("media.upload");
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, reason: authorization.reason }, { status: 403 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_form" }, { status: 400 });
  }
  const file = form.get("file");
  const classificationField = form.get("classification");
  const classification = typeof classificationField === "string" ? classificationField : "";
  const provenance = classifications[classification];
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "missing_file" }, { status: 400 });
  }
  if (!provenance) {
    return NextResponse.json({ ok: false, reason: "invalid_classification" }, { status: 400 });
  }
  const client = await createServerSupabaseClient();
  const result = await uploadEditorialImage(client, file, provenance);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: result.status });
  }
  const altField = form.get("altText");
  const captionField = form.get("caption");
  const alt = typeof altField === "string" ? altField.trim().slice(0, 300) : "";
  const caption = typeof captionField === "string" ? captionField.trim().slice(0, 600) : "";
  if ((alt || caption) && !/[<>]/u.test(alt + caption)) {
    await client.rpc("admin_update_media_metadata", {
      target_id: result.id,
      expected_version: 2,
      target_alt_text: (alt || null) as unknown as string,
      target_caption: (caption || null) as unknown as string,
      target_focal_x: 0.5,
      target_focal_y: 0.5,
    });
  }
  return NextResponse.json({
    ok: true,
    id: result.id,
    originalId: result.originalId,
    width: result.width,
    height: result.height,
    mimeType: result.mimeType,
  });
}
