import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Scheduler boundary (C9 §73). No deployment scheduler exists yet; the
 * task endpoint is only armed when RENZ_TASK_TOKEN is configured and it
 * is never exposed without the bearer token. C10/Release wires the real
 * scheduler to `pnpm notifications:sweep` or to this endpoint.
 */
export function taskToken(): string | null {
  const value = process.env["RENZ_TASK_TOKEN"];
  return value && value.length >= 32 ? value : null;
}

export function taskTokenMatches(header: string | null): boolean {
  const expected = taskToken();
  if (!expected || !header) return false;
  const presented = header.replace(/^Bearer\s+/iu, "").trim();
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

export function notificationEnvironmentChecks(): readonly Readonly<{
  key: string;
  label: string;
  classification: "required" | "recommended" | "info";
  state: "ready" | "warning" | "blocked";
  detail: string | null;
}>[] {
  const configured = Boolean(taskToken());
  return [
    {
      key: "notification_task_token",
      label: "Timed notification task endpoint armed (RENZ_TASK_TOKEN)",
      classification: "recommended",
      state: configured ? "ready" : "warning",
      detail: configured
        ? "POST /api/tasks/notifications-sweep accepts the bearer token; connect the deployment scheduler to it (or to pnpm notifications:sweep) in C10/Release."
        : "Not configured: timed notifications only run when pnpm notifications:sweep is executed or a super administrator runs the sweep manually. Wired in C10/Release.",
    },
  ];
}
