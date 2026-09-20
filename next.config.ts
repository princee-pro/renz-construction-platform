import type { NextConfig } from "next";

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
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${turnstile}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
    `media-src 'self' blob: ${supabaseOrigin}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${supabaseSocket} ${turnstile}`.trim(),
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
