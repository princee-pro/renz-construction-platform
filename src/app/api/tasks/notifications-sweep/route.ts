import "server-only";

import { NextResponse } from "next/server";

import { taskToken, taskTokenMatches } from "@/features/notifications/notification-server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Service task: run the idempotent timed-notification sweep (C9 §72–73).
 * 404 unless RENZ_TASK_TOKEN is configured; 401 without the bearer token.
 * Never linked from the UI; intended for a future scheduler only.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!taskToken()) return new NextResponse(null, { status: 404 });
  if (!taskTokenMatches(request.headers.get("authorization"))) {
    return new NextResponse(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc("run_notification_sweep", {
    trigger_kind: "scheduled",
  });
  if (error) {
    return NextResponse.json(
      { ok: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export function GET(): NextResponse {
  return new NextResponse(null, { status: 404 });
}
