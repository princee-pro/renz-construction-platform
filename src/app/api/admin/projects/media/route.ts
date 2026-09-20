import "server-only";

import { NextResponse } from "next/server";

import { authorizeServerAction } from "@/lib/auth/access";
import { uploadEditorialImage } from "@/lib/media/upload-image";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const provenanceValues = [
  "client_original",
  "client_derivative",
  "production_asset",
  "generated_reference",
] as const;

/** Project media upload (S5C): the shared editorial ingestion with the S5C provenance vocabulary. */
export async function POST(request: Request): Promise<NextResponse> {
  const authorization = await authorizeServerAction("content.write");
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
  const provenanceField = form.get("provenance");
  const provenance = typeof provenanceField === "string" ? provenanceField : "";
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: "missing_file" }, { status: 400 });
  }
  if (!provenanceValues.includes(provenance as (typeof provenanceValues)[number])) {
    return NextResponse.json({ ok: false, reason: "invalid_provenance" }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  const result = await uploadEditorialImage(client, file, {
    original: provenance,
    derivative: provenance,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: result.status });
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
