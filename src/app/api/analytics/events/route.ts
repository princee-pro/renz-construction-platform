import "server-only";

import { NextResponse } from "next/server";

import { consumeRateLimit, visitorIdentityHash } from "@/features/intake/intake-server";
import {
  analyticsBatchSchema,
  normalizeEvents,
} from "@/features/website-analytics/analytics-schema";
import { getSiteIdentity } from "@/lib/site/public-configuration";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/**
 * Anonymous first-party analytics endpoint (C9 §49–50, §94). Narrow by
 * design: fixed event vocabulary, canonical route keys only (query strings
 * stripped, private/admin/document paths rejected), bounded dimensions, a
 * same-origin check and an HMAC-identity rate limit that is never stored
 * with the counters. Anonymous callers have no table or function grant —
 * only this server writes, and only daily counters exist.
 */

const maxBodyBytes = 4096;

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

function empty(status: number): NextResponse {
  return new NextResponse(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) return empty(403);
  const raw = await request.text();
  if (raw.length > maxBodyBytes) return empty(413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return empty(400);
  }
  const parsed = analyticsBatchSchema.safeParse(body);
  if (!parsed.success) return empty(400);
  // Shape is validated for everyone; storage happens only while the
  // published configuration enables first-party analytics.
  const identity = await getSiteIdentity();
  if (!identity.analytics.firstParty) return empty(204);
  const { accepted } = normalizeEvents(parsed.data.events);
  if (accepted.length === 0) return empty(204);
  const identityHash = await visitorIdentityHash();
  if (!identityHash) return empty(204);
  const limit = await consumeRateLimit("analytics", identityHash);
  if (!limit.allowed) return empty(429);
  const service = createServiceSupabaseClient();
  await service.rpc("website_analytics_record", {
    events: accepted.map((event) => ({
      t: event.t,
      p: event.p,
      d: event.d ?? "",
      dc: event.dc ?? "unknown",
    })),
  });
  return empty(204);
}

export function GET(): NextResponse {
  return empty(405);
}
