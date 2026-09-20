import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";

import {
  honeypotFieldName,
  intakeFormToken,
  intakeRateLimits,
  type IntakeScope,
} from "@/features/intake/intake-policy";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

/**
 * Public-intake security primitives (C8 §73–81). Every layer is supplementary:
 * server validation and the database facade remain the authority.
 *
 * - identity: HMAC of the requesting address under INTAKE_RATE_LIMIT_SECRET;
 *   the raw address is never stored, logged or shown in Admin.
 * - form token: signed issue time + nonce; rejects zero-time submissions and
 *   stale sessions; the nonce doubles as the idempotency key.
 * - honeypot: visually and semantically hidden field; bots that fill it are
 *   quietly accepted without creating a lead.
 * - Turnstile: optional; validated server-side when configured, bypassed only
 *   outside production.
 */

const DEV_FALLBACK_SECRET = "renz-dev-placeholder-intake-secret-not-for-production";

export function isProduction(): boolean {
  return (
    process.env["NODE_ENV"] === "production" &&
    process.env["RENZ_INTAKE_ALLOW_DEV_BYPASS"] !== "true"
  );
}

export function intakeSecret(): string | null {
  const configured = process.env["INTAKE_RATE_LIMIT_SECRET"];
  if (configured && configured.length >= 16) return configured;
  return isProduction() ? null : DEV_FALLBACK_SECRET;
}

export function turnstileSiteKey(): string | null {
  return process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"] || null;
}

function turnstileSecret(): string | null {
  return process.env["TURNSTILE_SECRET_KEY"] || null;
}

function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

async function requestAddress(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || requestHeaders.get("x-real-ip")?.trim() || "local";
}

/** sha256 HMAC of the address; never the address itself. */
export async function visitorIdentityHash(): Promise<string | null> {
  const secret = intakeSecret();
  if (!secret) return null;
  return hmac(secret, `identity:${await requestAddress()}`);
}

export function issueFormToken(): string {
  const secret = intakeSecret() ?? DEV_FALLBACK_SECRET;
  const issuedAt = Date.now();
  const nonce = randomBytes(16).toString("hex");
  const signature = hmac(secret, `form:${issuedAt}:${nonce}`);
  return `${issuedAt}.${nonce}.${signature}`;
}

export type FormTokenVerdict =
  | { ok: true; nonce: string; issuedAt: number }
  | { ok: false; reason: "invalid" | "too_fast" | "expired" };

export function verifyFormToken(token: string): FormTokenVerdict {
  const secret = intakeSecret();
  if (!secret) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  const [issuedRaw, nonce, signature] = parts as [string, string, string];
  if (
    !/^[0-9]{10,16}$/u.test(issuedRaw) ||
    !/^[0-9a-f]{32}$/u.test(nonce) ||
    !/^[0-9a-f]{64}$/u.test(signature)
  ) {
    return { ok: false, reason: "invalid" };
  }
  const expected = hmac(secret, `form:${issuedRaw}:${nonce}`);
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))) {
    return { ok: false, reason: "invalid" };
  }
  const issuedAt = Number(issuedRaw);
  const elapsedSeconds = (Date.now() - issuedAt) / 1000;
  if (elapsedSeconds > intakeFormToken.maximumSeconds) return { ok: false, reason: "expired" };
  if (elapsedSeconds < intakeFormToken.minimumSeconds) return { ok: false, reason: "too_fast" };
  return { ok: true, nonce, issuedAt };
}

export function honeypotTripped(formData: FormData): boolean {
  const value = formData.get(honeypotFieldName);
  return typeof value === "string" && value.trim() !== "";
}

export type TurnstileVerdict =
  { ok: true } | { ok: false; reason: "missing" | "rejected" | "misconfigured" };

export async function verifyTurnstile(token: string | undefined): Promise<TurnstileVerdict> {
  const secret = turnstileSecret();
  const siteKey = turnstileSiteKey();
  if (!secret || !siteKey) {
    // Not configured: only acceptable outside production; readiness reports it.
    return isProduction() ? { ok: false, reason: "misconfigured" } : { ok: true };
  }
  if (!token) return { ok: false, reason: "missing" };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: await requestAddress() }),
      signal: AbortSignal.timeout(5000),
    });
    const outcome = (await response.json()) as { success?: boolean };
    return outcome.success === true ? { ok: true } : { ok: false, reason: "rejected" };
  } catch {
    return { ok: false, reason: "rejected" };
  }
}

export type RateLimitVerdict = Readonly<{ allowed: boolean; retryAfterSeconds: number }>;

export async function consumeRateLimit(
  scope: IntakeScope,
  identityHash: string,
): Promise<RateLimitVerdict> {
  const limits = intakeRateLimits[scope];
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc("intake_rate_limit_hit", {
    target_identity_hash: identityHash,
    target_scope: scope,
    max_hits: limits.maxHits,
    window_seconds: limits.windowSeconds,
  });
  if (error || typeof data !== "object" || data === null) {
    // Fail closed: if the limiter is unavailable the public site falls back to WhatsApp/email.
    return { allowed: false, retryAfterSeconds: 60 };
  }
  const verdict = data as { allowed?: boolean; retry_after_seconds?: number };
  return {
    allowed: verdict.allowed === true,
    retryAfterSeconds:
      typeof verdict.retry_after_seconds === "number" ? verdict.retry_after_seconds : 0,
  };
}

export type AbuseVerdict =
  | { ok: true; identityHash: string; nonce: string; silent: false }
  | { ok: true; identityHash: string; nonce: string; silent: true }
  | {
      ok: false;
      kind: "unavailable" | "rate_limited" | "expired" | "too_fast" | "bot";
      retryAfterSeconds?: number;
    };

/** Runs every anti-abuse layer for one submission attempt. */
export async function screenSubmission(
  scope: IntakeScope,
  formData: FormData,
  formToken: string,
  turnstileToken: string | undefined,
): Promise<AbuseVerdict> {
  const identityHash = await visitorIdentityHash();
  if (!identityHash) return { ok: false, kind: "unavailable" };
  const token = verifyFormToken(formToken);
  if (!token.ok) {
    return { ok: false, kind: token.reason === "invalid" ? "expired" : token.reason };
  }
  if (honeypotTripped(formData)) {
    // Quiet acceptance: no lead, no signal to the bot.
    return { ok: true, identityHash, nonce: token.nonce, silent: true };
  }
  const turnstile = await verifyTurnstile(turnstileToken);
  if (!turnstile.ok)
    return { ok: false, kind: turnstile.reason === "misconfigured" ? "unavailable" : "bot" };
  const limit = await consumeRateLimit(scope, identityHash);
  if (!limit.allowed)
    return { ok: false, kind: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds };
  return { ok: true, identityHash, nonce: token.nonce, silent: false };
}

export function hashUploadToken(token: string): string {
  const secret = intakeSecret() ?? DEV_FALLBACK_SECRET;
  return hmac(secret, `upload:${token}`);
}

export function newUploadToken(): string {
  return randomBytes(32).toString("hex");
}

/** Environment presence for Launch Readiness (names only; values never leave the server). */
export function intakeEnvironmentChecks(): readonly Readonly<{
  key: string;
  label: string;
  classification: "required" | "recommended" | "info";
  state: "ready" | "warning" | "blocked";
  detail: string | null;
}>[] {
  const secretConfigured = Boolean(process.env["INTAKE_RATE_LIMIT_SECRET"]);
  const turnstileConfigured = Boolean(turnstileSiteKey() && turnstileSecret());
  const production = isProduction();
  const bypass = process.env["RENZ_INTAKE_ALLOW_DEV_BYPASS"] === "true";
  return [
    {
      key: "intake_rate_limit_secret",
      label: "Anti-abuse secret configured (INTAKE_RATE_LIMIT_SECRET)",
      classification: "required",
      state: secretConfigured ? "ready" : production ? "blocked" : "warning",
      detail: secretConfigured
        ? null
        : "Set INTAKE_RATE_LIMIT_SECRET in the deployment environment; without it live intake is refused.",
    },
    {
      key: "turnstile",
      label: "Cloudflare Turnstile configured",
      classification: "recommended",
      state: turnstileConfigured ? "ready" : "warning",
      detail: turnstileConfigured
        ? null
        : "Optional bot protection: set NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY. Local development runs without it.",
    },
    {
      key: "intake_test_bypass",
      label: "Anti-bot test bypass disabled",
      // Stays "recommended": the browser-test server must be able to go
      // live with the bypass set. The production fail-fast lives in
      // /api/health (503 "blocked"), which the go-live checklist requires.
      classification: "recommended",
      state: bypass ? "warning" : "ready",
      detail: bypass
        ? "RENZ_INTAKE_ALLOW_DEV_BYPASS is set. It exists for the browser test server only and must be absent in a live deployment."
        : null,
    },
    {
      key: "intake_scanner",
      label: "Attachment malware scanner",
      classification: "info",
      state: "warning",
      detail:
        "No scanner adapter is installed (C10). Images pass signature validation and stay in private quarantine; the images-only policy is the safe launch default.",
    },
  ];
}
