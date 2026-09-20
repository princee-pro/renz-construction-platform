/* global document, getComputedStyle */
// D1.6 plain-English audit (brief §115). Renders each public route, extracts
// the visitor-visible text (header, main, footer, dialogs are excluded) and
// reports sentence length, paragraph length, banned agency jargon, empty
// CTAs and implementation wording. Bounded and deterministic — no AI.
//
//   node scripts/d16-copy-audit.mjs [--json] [/route ...]
//   RENZ_SHOT_BASE=http://127.0.0.1:3100 node scripts/d16-copy-audit.mjs
//
// Output: .playwright/copy-audit/<route>.txt (raw text) and
//         .playwright/copy-audit/report.md (findings).
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const routes = args.filter((a) => a.startsWith("/"));
const defaultRoutes = [
  "/",
  "/services",
  "/services/design",
  "/services/executions",
  "/services/hybrid-service",
  "/services/supervision",
  "/services/consultations",
  "/projects",
  "/projects/ridge-residence",
  "/about",
  "/insights",
  "/insights/preparing-a-clear-construction-brief",
  "/contact",
  "/start-a-project",
  "/enquire/service",
  "/enquire/materials",
  "/privacy",
  "/this-page-does-not-exist",
];

/** Abstract agency phrases that must not carry the primary business message (§16). */
export const bannedPhrases = [
  "engagement",
  "proposition",
  "spatial response",
  "architectural sequence",
  "the datum",
  "condition",
  "material register",
  "resolved form",
  "intent becomes visible",
  "into focus",
  "reads a site",
  "read the site",
  "first line",
  "right line",
  "measured",
  "sequence",
  "resolve",
  "register",
  "mass",
  "gesture",
  "narrative",
  "studies in approach",
  "drawing board",
  "notes from",
  "programme",
];

/** Words that reveal implementation rather than the business. */
export const implementationWords = [
  "rpc",
  "snapshot",
  "revision",
  "projection",
  "facade",
  "slug",
  "schema",
  "validation",
  "payload",
  "token",
  "null",
  "undefined",
  "lorem",
];

export const limits = { sentenceWords: 24, paragraphWords: 70, ctaWords: 6 };

export function splitSentences(text) {
  return text
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/u)
    .map((s) => s.trim())
    .filter((s) => s.split(" ").length >= 3);
}

export function wordCount(text) {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/u).length;
}

export function auditText(blocks) {
  const findings = [];
  const sentences = [];
  for (const block of blocks) {
    const { kind, text } = block;
    const words = wordCount(text);
    if (kind === "cta") {
      if (words === 0)
        findings.push({
          rule: "empty-cta",
          text: "(empty)",
          detail: "A control without a visible label.",
        });
      else if (words > limits.ctaWords)
        findings.push({ rule: "long-cta", text, detail: `${words} words (target 2–5).` });
      continue;
    }
    if (kind === "paragraph" && words > limits.paragraphWords) {
      findings.push({
        rule: "long-paragraph",
        text: text.slice(0, 120) + "…",
        detail: `${words} words (target ≤ ${limits.paragraphWords}).`,
      });
    }
    for (const sentence of splitSentences(text)) {
      const count = wordCount(sentence);
      sentences.push(count);
      if (count > limits.sentenceWords) {
        findings.push({
          rule: "long-sentence",
          text: sentence,
          detail: `${count} words (target ≤ ${limits.sentenceWords}).`,
        });
      }
    }
    const lower = text.toLowerCase();
    for (const phrase of bannedPhrases) {
      const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "u");
      if (pattern.test(lower) && kind !== "label") {
        findings.push({
          rule: "jargon",
          text: text.slice(0, 140),
          detail: `Contains “${phrase}”.`,
        });
      }
    }
    for (const word of implementationWords) {
      if (new RegExp(`\\b${word}\\b`, "u").test(lower)) {
        findings.push({
          rule: "implementation-word",
          text: text.slice(0, 140),
          detail: `Contains “${word}”.`,
        });
      }
    }
  }
  const average = sentences.length ? sentences.reduce((a, b) => a + b, 0) / sentences.length : 0;
  const long = sentences.filter((n) => n > limits.sentenceWords).length;
  return {
    findings,
    sentences: sentences.length,
    averageSentence: Math.round(average * 10) / 10,
    longSentences: long,
  };
}

async function extractBlocks(page) {
  return page.evaluate(() => {
    const blocks = [];
    const seen = new Set();
    const roots = ["header", "main", "footer"]
      .map((s) => document.querySelector(s))
      .filter(Boolean);
    const isHidden = (el) => {
      const style = getComputedStyle(el);
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        el.closest("[hidden],[aria-hidden='true']") !== null
      );
    };
    for (const root of roots) {
      const nodes = root.querySelectorAll(
        "h1,h2,h3,h4,p,li,dt,dd,figcaption,blockquote,label,legend,summary,a,button,small,option",
      );
      for (const el of nodes) {
        if (isHidden(el)) continue;
        // Skip containers whose text is fully covered by a nested block element.
        if (el.querySelector("p,li,h1,h2,h3,h4")) continue;
        const text = (el.innerText || el.textContent || "").replace(/\s+/gu, " ").trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        const tag = el.tagName.toLowerCase();
        const kind =
          tag === "a" || tag === "button"
            ? "cta"
            : /^h[1-4]$/u.test(tag)
              ? "heading"
              : tag === "small" ||
                  tag === "label" ||
                  tag === "legend" ||
                  tag === "dt" ||
                  tag === "option"
                ? "label"
                : "paragraph";
        blocks.push({ kind, tag, text });
      }
    }
    return blocks;
  });
}

const outDir = ".playwright/copy-audit";
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => sessionStorage.setItem("renz-s9ap-opener-seen", "true"));

const report = [];
const summary = [];
for (const route of routes.length ? routes : defaultRoutes) {
  await page.goto(base + route, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(500);
  const blocks = await extractBlocks(page);
  const name = route.replace(/[^a-z0-9]+/giu, "_").replace(/^_|_$/gu, "") || "home";
  writeFileSync(
    `${outDir}/${name}.txt`,
    blocks.map((b) => `[${b.kind}] ${b.text}`).join("\n"),
    "utf8",
  );
  const result = auditText(blocks);
  summary.push({ route, ...result, findings: result.findings.length });
  report.push(
    `## ${route}\n\nSentences: ${result.sentences} · average ${result.averageSentence} words · ${result.longSentences} over ${limits.sentenceWords} words · ${result.findings.length} findings\n`,
  );
  const grouped = new Map();
  for (const f of result.findings) grouped.set(f.rule, [...(grouped.get(f.rule) ?? []), f]);
  for (const [rule, items] of grouped) {
    report.push(`### ${rule} (${items.length})\n`);
    for (const item of items.slice(0, 40)) report.push(`- ${item.detail} — “${item.text}”`);
    report.push("");
  }
}
await browser.close();

const table = [
  "| Route | Sentences | Avg words | Long | Findings |",
  "| --- | --- | --- | --- | --- |",
  ...summary.map(
    (s) =>
      `| ${s.route} | ${s.sentences} | ${s.averageSentence} | ${s.longSentences} | ${s.findings} |`,
  ),
];
writeFileSync(
  `${outDir}/report.md`,
  `# D1.6 plain-English audit\n\nBase: ${base}\n\n${table.join("\n")}\n\n${report.join("\n")}`,
  "utf8",
);
if (asJson) console.log(JSON.stringify(summary, null, 2));
else console.log(table.join("\n"));
