/* global document, window, getComputedStyle */
// R1 §50, §53–§55 — browser checks against a running candidate:
//   cross-browser smoke (Chromium, Firefox, WebKit where installed) on the
//     critical public paths + the admin sign-in shell: page loads, h1
//     present, no page errors, no failed requests;
//   web vitals (Chromium): LCP, CLS and transferred JS / image weight for
//     Home, Projects, a project detail and Contact;
//   slow network (Chromium, ~Slow 3G): the hero text is visible before the
//     media finishes — no blank viewport;
//   forced colours (Chromium, `forced-colors: active`): screenshots of the
//     home header/nav, a form, the gallery dialog and the admin sign-in for
//     a visual check, plus a programmatic focus-ring check.
//   node scripts/r1-browser-smoke.mjs [base] [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium, firefox, webkit } from "@playwright/test";

const base = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/u, "");
const outDir = process.argv[3] ?? ".playwright/screenshots/r1";
mkdirSync(outDir, { recursive: true });
const failures = [];
const report = { smoke: {}, vitals: {}, slowNetwork: {}, forcedColors: {} };

const criticalPaths = [
  "/",
  "/services",
  "/projects",
  "/projects/ridge-residence",
  "/contact",
  "/admin/sign-in",
  "/i/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
];

// 1. Cross-browser smoke ----------------------------------------------------
for (const [name, engine] of [
  ["chromium", chromium],
  ["firefox", firefox],
  ["webkit", webkit],
]) {
  let browser;
  try {
    browser = await engine.launch();
  } catch (error) {
    report.smoke[name] =
      `NOT AVAILABLE (${error instanceof Error ? error.message.split("\n")[0] : "launch failed"})`;
    console.log(`${name}: not available`);
    continue;
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pageErrors = [];
  const failedRequests = [];
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 120)));
  page.on("requestfailed", (request) => {
    // Prefetches and image loads cancelled by the next navigation are not failures.
    const reason = request.failure()?.errorText ?? "";
    if (/abort|cancel/iu.test(reason)) return;
    if (!/favicon|analytics/u.test(request.url()))
      failedRequests.push(`${request.url().slice(0, 100)} (${reason})`);
  });
  const results = {};
  for (const path of criticalPaths) {
    try {
      const response = await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
      const status = response?.status() ?? 0;
      const expected = path.startsWith("/i/") ? 404 : 200;
      const h1 = await page
        .locator("h1")
        .first()
        .textContent({ timeout: 10000 })
        .catch(() => "");
      results[path] = { status, h1: (h1 ?? "").trim().slice(0, 40) };
      if (status !== expected) failures.push(`${name} ${path} → ${status}`);
      if (!h1?.trim()) failures.push(`${name} ${path}: no h1`);
    } catch (error) {
      results[path] = { error: error instanceof Error ? error.message.slice(0, 80) : "error" };
      failures.push(`${name} ${path}: ${results[path].error}`);
    }
  }
  results.pageErrors = pageErrors;
  results.failedRequests = failedRequests;
  if (pageErrors.length > 0) failures.push(`${name}: page errors ${pageErrors.join(" | ")}`);
  if (failedRequests.length > 0)
    failures.push(`${name}: failed requests ${failedRequests.join(" | ")}`);
  report.smoke[name] = results;
  console.log(
    `${name}: ${Object.keys(results).length - 2} paths, ${pageErrors.length} page errors, ${failedRequests.length} failed requests`,
  );
  await browser.close();
}

// 2. Web vitals (Chromium) -------------------------------------------------
const browser = await chromium.launch();
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  for (const path of ["/", "/projects", "/projects/ridge-residence", "/contact"]) {
    let js = 0;
    let images = 0;
    page.on("response", (response) => {
      const type = response.request().resourceType();
      if (type !== "script" && type !== "image" && type !== "media") return;
      // Decoded size (static chunks stream without content-length).
      void response
        .body()
        .then((body) => {
          if (type === "script") js += body.length;
          else images += body.length;
        })
        .catch(() => undefined);
    });
    await page.addInitScript(() => {
      window.__vitals = { lcp: 0, cls: 0 };
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2500);
    const vitals = await page.evaluate(() => ({
      ...window.__vitals,
      ttfb: Math.round(performance.getEntriesByType("navigation")[0]?.responseStart ?? 0),
    }));
    report.vitals[path] = {
      lcpMs: Math.round(vitals.lcp),
      cls: Number(vitals.cls.toFixed(3)),
      ttfbMs: vitals.ttfb,
      jsKb: Math.round(js / 1024),
      imagesKb: Math.round(images / 1024),
    };
    console.log(
      `vitals ${path.padEnd(28)} LCP ${Math.round(vitals.lcp)} ms  CLS ${vitals.cls.toFixed(3)}  TTFB ${vitals.ttfb} ms  JS ${Math.round(js / 1024)} KB  images ${Math.round(images / 1024)} KB`,
    );
    if (vitals.cls > 0.1) failures.push(`${path}: CLS ${vitals.cls.toFixed(3)} > 0.1`);
    page.removeAllListeners("response");
  }
  await context.close();
}

// 3. Slow network (Chromium, Slow 3G-like) ---------------------------------
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  });
  for (const path of ["/", "/projects", "/projects/ridge-residence"]) {
    const started = Date.now();
    await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 120000 });
    const textVisibleAt = await page
      .locator("h1")
      .first()
      .waitFor({ state: "visible", timeout: 60000 })
      .then(() => Date.now() - started)
      .catch(() => null);
    await page.screenshot({
      path: join(outDir, `slow${path.replace(/\//gu, "_") || "_home"}.png`),
    });
    report.slowNetwork[path] = { h1VisibleMs: textVisibleAt };
    console.log(`slow 3G ${path.padEnd(28)} h1 visible after ${textVisibleAt ?? "never"} ms`);
    if (textVisibleAt === null) failures.push(`${path}: blank viewport on slow network`);
  }
  await context.close();
}

// 4. Forced colours (Chromium) ---------------------------------------------
{
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    forcedColors: "active",
    colorScheme: "light",
  });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.screenshot({ path: join(outDir, "forced-home.png") });
  const menu = page.getByRole("button", { name: /menu|More/iu }).first();
  if ((await menu.count()) > 0) {
    await menu.click().catch(() => undefined);
    await page.screenshot({ path: join(outDir, "forced-menu.png") });
    await page.keyboard.press("Escape");
  }
  await page.goto(`${base}/contact`, { waitUntil: "load" });
  await page.locator("#fullName").focus();
  await page.screenshot({ path: join(outDir, "forced-contact-focus.png") });
  const focusRing = await page.evaluate(() => {
    const element = document.activeElement;
    const style = element ? getComputedStyle(element) : null;
    return style ? { outline: style.outlineStyle, width: style.outlineWidth } : null;
  });
  report.forcedColors.contactFocus = focusRing;
  await page.goto(`${base}/projects/ridge-residence`, { waitUntil: "load" });
  const opener = page.locator(".project-gallery button, .gallery-piece button").first();
  if ((await opener.count()) > 0) {
    await opener.click().catch(() => undefined);
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outDir, "forced-gallery-dialog.png") });
    await page.keyboard.press("Escape");
  }
  await page.goto(`${base}/admin/sign-in`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Sign in" }).focus();
  await page.screenshot({ path: join(outDir, "forced-admin-sign-in.png") });
  const buttonRing = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return {
      outline: style.outlineStyle,
      width: style.outlineWidth,
      forced: window.matchMedia("(forced-colors: active)").matches,
    };
  });
  report.forcedColors.signInButtonFocus = buttonRing;
  console.log("forced colours:", JSON.stringify(report.forcedColors));
  if (!buttonRing.forced) failures.push("forced-colors emulation not active");
  await context.close();
}
await browser.close();

writeFileSync(join(outDir, "r1-browser-smoke.json"), JSON.stringify(report, null, 2));
if (failures.length > 0) {
  console.error("browser smoke FAILED:\n  " + failures.join("\n  "));
  process.exitCode = 1;
} else {
  console.log(`browser smoke passed → ${outDir}`);
}
