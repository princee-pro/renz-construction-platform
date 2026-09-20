import { NextResponse } from "next/server";

import { runHealthChecks } from "@/lib/ops/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Production-safe health endpoint (C10 §36): status, version, build,
 * environment type, timestamp and dependency categories. No URLs, keys,
 * table names or stack traces. 200 when ok/warning, 503 when blocked, so a
 * platform health probe can act on it.
 */
export async function GET(): Promise<NextResponse> {
  const report = await runHealthChecks();
  const body = {
    status: report.status,
    version: report.version,
    build: report.build,
    environment: report.environment,
    timestamp: report.timestamp,
    dependencies: Object.fromEntries(report.checks.map((check) => [check.key, check.state])),
  };
  return NextResponse.json(body, {
    status: report.status === "blocked" ? 503 : 200,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
