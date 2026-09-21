// R1 §20, §60–§64, §68 — public surface audit against a running candidate
// (local production server or the cloud candidate). Crawls every internal
// link from the home page (bounded), then checks:
//   - no 404/5xx/redirect loop on crawled links; Staff Login link present;
//   - robots: preview mode → noindex everywhere; admin/auth/share routes
//     always noindex; robots.txt and sitemap.xml exist and the sitemap holds
//     only intended public routes (never /admin, /i/, /po/, /preview);
//   - content: no placeholder / developer / test text on public pages
//     ("concept study" wording is intentional and allowed);
//   - no local or staging origins in public HTML; no `tel:` links
//     (WhatsApp-only business); every WhatsApp link is wa.me;
//   - unknown page / project / insight / service / share token → real 404
//     without a stack trace.
//   node scripts/r1-public-audit.mjs [base] [--expect-live]
const base = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/u, "");
const expectLive = process.argv.includes("--expect-live");
const failures = [];
const notes = [];
const seen = new Map();
const queue = ["/"];
const limit = 150;
let mediaChecked = 0;

async function get(path) {
  const response = await fetch(base + path, { redirect: "manual" });
  const text = await response.text();
  return { status: response.status, text, headers: response.headers };
}

const forbiddenText =
  /lorem ipsum|placeholder|TODO\b|FIXME|debug|staging\.|localhost|127\.0\.0\.1|:3000\b|:3100\b|@example\.test|SYNTHETIC|Application foundation|technical shell/iu;

while (queue.length > 0 && seen.size < limit) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  let hops = 0;
  let current = path;
  let result = await get(current);
  let media = null;
  while ([301, 302, 307, 308].includes(result.status) && hops < 5) {
    const location = result.headers.get("location") ?? "";
    if (location.startsWith("http") && !location.startsWith(base)) {
      // Signed media: the route hands off to Storage. The signed URL itself
      // must answer 200 (R1 §16 — no 502/403 for legitimate public assets).
      const signed = await fetch(location, { method: "GET" });
      await signed.arrayBuffer();
      media = signed.status;
      break;
    }
    current = location.startsWith("http") ? new URL(location).pathname : location;
    hops += 1;
    result = await get(current);
  }
  if (media !== null) {
    seen.set(path, media);
    if (media !== 200) failures.push(`${path}: signed media answered ${media}`);
    mediaChecked += 1;
    continue;
  }
  if (hops >= 5) failures.push(`redirect loop from ${path}`);
  seen.set(path, result.status);
  if (result.status >= 400) {
    failures.push(`${path} → ${result.status}`);
    continue;
  }
  const html = result.text;
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gu, "")
    .replace(/<style[\s\S]*?<\/style>/gu, "")
    .replace(/<[^>]+>/gu, " ");
  const forbidden = forbiddenText.exec(visible);
  if (forbidden) failures.push(`${path}: forbidden text "${forbidden[0]}"`);
  if (/href="tel:/u.test(html)) failures.push(`${path}: tel: link present`);
  for (const match of html.matchAll(/href="([^"]*whatsapp[^"]*|[^"]*wa\.me[^"]*)"/giu)) {
    if (!/^https:\/\/wa\.me\//u.test(match[1]))
      failures.push(`${path}: WhatsApp link not wa.me (${match[1]})`);
  }
  const robots = /<meta name="robots" content="([^"]*)"/u.exec(html)?.[1] ?? "";
  const privateRoute = /^\/(admin|i\/|po\/|preview)/u.test(path);
  if (privateRoute && !/noindex/u.test(robots)) failures.push(`${path}: private route indexable`);
  if (!privateRoute && !expectLive && !/noindex/u.test(robots))
    failures.push(`${path}: indexable while the site is not live`);
  if (!privateRoute && expectLive && /noindex/u.test(robots))
    notes.push(`${path}: noindex while live`);
  for (const match of html.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/gu)) {
    const next = match[1];
    if (/\.(png|jpg|jpeg|webp|avif|svg|ico|pdf|webm|mp4|woff2?)$/u.test(next)) continue;
    if (next.startsWith("/_next/")) continue;
    if (!seen.has(next) && !queue.includes(next)) queue.push(next);
  }
  if (path === "/" && !/Staff Login|Staff sign in/iu.test(visible))
    failures.push("Staff Login link missing from the home page");
}

// robots.txt / sitemap.xml
const robotsTxt = await get("/robots.txt");
if (robotsTxt.status !== 200) failures.push(`/robots.txt → ${robotsTxt.status}`);
const sitemap = await get("/sitemap.xml");
if (sitemap.status !== 200) failures.push(`/sitemap.xml → ${sitemap.status}`);
else {
  const locations = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((m) => m[1]);
  for (const location of locations) {
    if (/\/(admin|i|po|preview)(\/|$)/u.test(new URL(location).pathname))
      failures.push(`sitemap lists private route ${location}`);
    if (
      /localhost|127\.0\.0\.1|:3000|:3100/u.test(location) &&
      !base.includes("127.0.0.1") &&
      !base.includes("localhost")
    )
      failures.push(`sitemap carries a local origin ${location}`);
  }
  notes.push(`sitemap: ${locations.length} locations`);
}

// Real 404s without stack traces
for (const path of [
  "/no-such-page-r1",
  "/projects/no-such-project-r1",
  "/insights/no-such-insight-r1",
  "/services/no-such-service-r1",
  "/i/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "/po/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
]) {
  const result = await get(path);
  if (result.status !== 404) failures.push(`${path} → ${result.status} (expected 404)`);
  if (/at Object\.|node_modules|stack/iu.test(result.text))
    failures.push(`${path}: stack trace in body`);
}

console.log(
  `crawled ${seen.size} internal paths from ${base} (${mediaChecked} signed media links answered)`,
);
for (const note of notes) console.log(`  ${note}`);
if (failures.length > 0) {
  console.error("public audit FAILED:\n  " + failures.join("\n  "));
  process.exitCode = 1;
} else {
  console.log("public audit passed");
}
