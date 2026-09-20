import "server-only";

import { type AdminActionState } from "@/features/admin-shared/action-state";
import { authorizeServerAction, type ActionAuthorization } from "@/lib/auth/access";
import type { AdminPermission } from "@/lib/auth/permissions";

type CommandObject = Readonly<Record<string, unknown>>;

function commandObject(value: unknown): CommandObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as CommandObject)
    : null;
}

export function commandSucceeded(value: unknown): boolean {
  return commandObject(value)?.["ok"] === true;
}

export function commandVersion(value: unknown, key = "version"): number | null {
  const candidate = commandObject(value)?.[key];
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate > 0
    ? candidate
    : null;
}

export function commandId(value: unknown): string | null {
  const candidate = commandObject(value)?.["id"];
  return typeof candidate === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(candidate)
    ? candidate
    : null;
}

export function commandReason(value: unknown): string {
  const reasons = commandObject(value)?.["reasons"];
  if (!Array.isArray(reasons)) return "The operation could not be completed.";
  const first = commandObject(reasons[0]);
  const detail = first?.["detail"];
  return typeof detail === "string" && detail.length <= 240
    ? detail
    : "The operation could not be completed.";
}

export function commandReasonCode(value: unknown): string {
  const reasons = commandObject(value)?.["reasons"];
  if (!Array.isArray(reasons)) return "operation_failed";
  const first = commandObject(reasons[0]);
  const code = first?.["code"];
  return typeof code === "string" && /^[a-z0-9_]{1,80}$/u.test(code) ? code : "operation_failed";
}

export function actionState(
  status: AdminActionState["status"],
  message: string,
  options: Readonly<{
    fieldErrors?: Readonly<Record<string, string>>;
    currentVersion?: number | null;
    reauthHref?: string | null;
    createdId?: string | null;
    detail?: string | null;
  }> = {},
): AdminActionState {
  return {
    status,
    message,
    fieldErrors: options.fieldErrors ?? {},
    currentVersion: options.currentVersion ?? null,
    reauthHref: options.reauthHref ?? null,
    createdId: options.createdId ?? null,
    detail: options.detail ?? null,
  };
}

function authorizationFailure(
  authorization: Exclude<ActionAuthorization, { ok: true }>,
): AdminActionState {
  if (authorization.reason === "forbidden") {
    return actionState(
      "error",
      "Your current role does not allow this operation. No changes were made.",
    );
  }
  if (authorization.reason === "disabled") {
    return actionState(
      "reauth",
      "This staff account is no longer active. Your entered values remain on this page.",
      { reauthHref: authorization.reauthHref },
    );
  }
  if (authorization.reason === "mfa_required") {
    return actionState(
      "reauth",
      "MFA verification is required before this operation. Your entered values remain on this page.",
      { reauthHref: authorization.reauthHref },
    );
  }
  return actionState(
    "reauth",
    "Your secure session is unavailable. Sign in again; the values on this page have not been cleared.",
    { reauthHref: authorization.reauthHref },
  );
}

export async function authorize(permission: AdminPermission): Promise<AdminActionState | null> {
  const authorization = await authorizeServerAction(permission);
  return authorization.ok ? null : authorizationFailure(authorization);
}
