import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { NextConfig } from "next";

/**
 * R1 (Netlify): the deployed function bundle has no repository on disk, so
 * the build records what the health endpoint used to read at runtime —
 * application version, build id and the latest migration version — as
 * build-time environment values. A host that sets them explicitly wins.
 */
function buildMetadata(): Record<string, string> {
  const values: Record<string, string> = {};
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      version?: string;
    };
    values["RENZ_APP_VERSION"] = process.env["RENZ_APP_VERSION"] ?? pkg.version ?? "0.0.0";
  } catch {
    values["RENZ_APP_VERSION"] = process.env["RENZ_APP_VERSION"] ?? "0.0.0";
  }
  let commit = process.env["COMMIT_REF"] ?? process.env["VERCEL_GIT_COMMIT_SHA"] ?? "";
  if (!commit) {
    try {
      commit = execSync("git rev-parse HEAD", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      commit = "";
    }
  }
  values["RENZ_BUILD_ID"] =
    process.env["RENZ_BUILD_ID"] ?? (commit ? commit.slice(0, 12) : "local");
  if (!process.env["RENZ_LATEST_MIGRATION"]) {
    try {
      const latest = readdirSync(join(process.cwd(), "supabase", "migrations"))
        .filter((name) => /^\d{14}_.+\.sql$/u.test(name))
        .sort()
        .at(-1);
      if (latest) values["RENZ_LATEST_MIGRATION"] = latest.slice(0, 14);
    } catch {
      // No migrations folder in this checkout: the health check reports "not checked".
    }
  }
  return values;
}

/**
 * C10 §79 security headers. The CSP allows what this app actually uses:
 * Next's inline bootstrap script and Motion's inline styles, self-hosted
 * fonts, images / media from Storage (signed URLs on the Supabase host),
 * realtime websockets, and Cloudflare Turnstile when it is configured. Nothing
 * else may load; the app may not be framed. HSTS is emitted only in
 * production, where the host terminates HTTPS.
 */
function securityHeaders(): { key: string; value: string }[] {
  const supabase = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
  let supabaseOrigin: string;
  let supabaseSocket: string;
  try {
    const url = new URL(supabase);
    supabaseOrigin = url.origin;
    supabaseSocket = `${url.protocol === "https:" ? "wss" : "ws"}://${url.host}`;
  } catch {
    supabaseOrigin = "";
    supabaseSocket = "";
  }
  const turnstile = process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"]
    ? "https://challenges.cloudflare.com"
    : "";
  // "Secure deployment" = production build talking to an HTTPS Supabase
  // project. A local production build against the HTTP local stack must not
  // upgrade its own media requests (they would fail).
  const production = process.env.NODE_ENV === "production" && supabaseOrigin.startsWith("https:");
  // Cloudflare Web Analytics (R1 owner decision): a cookieless beacon the
  // owner can switch on under Settings → Website; allowed statically so the
  // switch needs no redeploy. It sends nothing until enabled.
  const cfInsightsScript = "https://static.cloudflareinsights.com";
  const cfInsightsConnect = "https://cloudflareinsights.com";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${cfInsightsScript} ${turnstile}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
    `media-src 'self' blob: ${supabaseOrigin}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${supabaseSocket} ${cfInsightsConnect} ${turnstile}`.trim(),
    `frame-src ${turnstile || "'none'"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://wa.me",
    "object-src 'none'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
    ...(production
      ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
      : []),
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: buildMetadata(),
  headers() {
    return Promise.resolve([{ source: "/(.*)", headers: securityHeaders() }]);
  },
  // pdfkit reads its standard-font metrics from disk at runtime; keep it out of
  // the server bundle so those files resolve from node_modules (C5 invoice PDFs).
  serverExternalPackages: ["pdfkit"],
  images: { qualities: [75, 85, 86, 88, 90] },
  // This machine is memory-constrained (background processes have been OOM-killed
  // by the host during this session). Next's internal jest-worker pool (used for
  // image optimization and other parallel jobs) was spawning enough concurrent
  // child processes to crash under memory pressure, surfacing as
  // "Jest worker encountered N child process exceptions, exceeding retry limit"
  // in the dev overlay. Scaling worker count to available memory instead of CPU
  // count, and capping it, keeps that pool from exhausting memory.
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
