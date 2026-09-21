/**
 * RENZ notification sweep trigger (Cloudflare Workers Free, cron).
 *
 * Every hour it POSTs to the application's task endpoint with the bearer
 * token; the application runs `run_notification_sweep('scheduled')`, which
 * is idempotent (docs/RENZ_R1_SCHEDULED_TASKS.md). The worker holds no
 * database credentials and cannot do anything except call that one route.
 * Failures are logged (Cloudflare dashboard → Workers → Logs); the product's
 * Launch Readiness page warns when no sweep has landed within 26 hours.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sweep(env));
  },
  // Manual check: `curl -X POST https://<worker>/run -H "Authorization: Bearer <RENZ_TASK_TOKEN>"`
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/run") {
      return new Response("Not found", { status: 404 });
    }
    const presented = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!env.RENZ_TASK_TOKEN || presented !== env.RENZ_TASK_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await sweep(env);
    return Response.json(result, { status: result.ok ? 200 : 502 });
  },
};

async function sweep(env) {
  const origin = (env.RENZ_APP_ORIGIN ?? "").replace(/\/$/, "");
  if (!origin || !env.RENZ_TASK_TOKEN) {
    console.error("sweep: RENZ_APP_ORIGIN or RENZ_TASK_TOKEN missing");
    return { ok: false, reason: "not_configured" };
  }
  try {
    const response = await fetch(`${origin}/api/tasks/notifications-sweep`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.RENZ_TASK_TOKEN}` },
    });
    const ok = response.ok;
    console.log(`sweep: ${response.status}`);
    return { ok, status: response.status };
  } catch (error) {
    console.error(`sweep: ${error instanceof Error ? error.message : "failed"}`);
    return { ok: false, reason: "unreachable" };
  }
}
