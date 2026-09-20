/* global document */
// D1.7 §104–105 owner workflow test, through the Admin UI only (no source
// edits, no direct RPC): create Project #13, hero + 5 gallery items, story,
// services, reorder, placement, publish; verify the public site; then
// archive and verify it disappears while the admin record remains.
//   node scripts/d17-owner-test.mjs http://127.0.0.1:3100
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { currentTotp } from "../tests/e2e/support/totp.mjs";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const dir = ".playwright/screenshots/d1-7/owner-test";
mkdirSync(dir, { recursive: true });
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const slug = "synthetic-owner-project-13";
const title = "SYNTHETIC Owner Project 13";
const files = [
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/hero.webp",
    "hero",
    "Main view (synthetic test)",
    "Synthetic hero image for the owner workflow test",
  ],
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/detail.webp",
    "detail",
    "Brick screen (synthetic test)",
    "Synthetic detail image",
  ],
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/diagram-site.webp",
    "drawing",
    "Site diagram (synthetic test)",
    "Synthetic site diagram",
  ],
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/diagram-plan.webp",
    "drawing",
    "Plan study (synthetic test)",
    "Synthetic plan diagram",
  ],
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/diagram-section.webp",
    "drawing",
    "Section study (synthetic test)",
    "Synthetic section diagram",
  ],
  [
    "public/media/renz-preview/projects/huye-learning-courtyard/diagram-sequence.webp",
    "process",
    "Construction sequence (synthetic test)",
    "Synthetic sequence diagram",
  ],
];
const report = [];
const log = (...a) => {
  console.log(...a);
  report.push(a.join(" "));
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
async function shot(name) {
  await page.screenshot({ path: `${dir}/${name}.png` });
}

// ---- sign in
await page.goto(`${base}/admin/sign-in?next=%2Fadmin%2Fcontent%2Fprojects`, {
  waitUntil: "networkidle",
});
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa/u, { timeout: 30000 });
for (let attempt = 0; attempt < 2; attempt++) {
  await page
    .getByRole("textbox", { name: "Authenticator code" })
    .fill(currentTotp(actor.totpSecret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  const ok = await page
    .waitForURL((u) => u.pathname === "/admin/content/projects", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (ok) break;
  await page.waitForTimeout(31000 - (Date.now() % 30000));
}
log("signed in");

// ---- 1. create the draft
await page.goto(`${base}/admin/content/projects/new`, { waitUntil: "networkidle" });
await page.getByRole("textbox", { name: "Working title" }).fill(title);
await page.getByRole("textbox", { name: "Public slug" }).fill(slug);
await page.getByRole("button", { name: "Create draft" }).click();
await page.waitForURL(/\/admin\/content\/projects\/[0-9a-f-]+/u, { timeout: 30000 });
const editorUrl = page.url().split("?")[0];
log("created", editorUrl);

// ---- 2. overview: summary, type, location
await page
  .getByRole("textbox", { name: "Public summary" })
  .fill("A synthetic study created through the Admin only, to prove the owner workflow.");
await page.getByRole("textbox", { name: "Project type" }).fill("Education");
await page.getByRole("textbox", { name: "Public location" }).fill("Huye context study");
await page.getByLabel("Location granularity").selectOption("region");
await page.getByRole("textbox", { name: "SEO title" }).fill("SYNTHETIC Owner Project 13 — test");
await page
  .getByRole("textbox", { name: "SEO description" })
  .fill("A synthetic owner-workflow test project. Not a RENZ project.");
await page.getByRole("button", { name: "Save draft" }).click();
await page.waitForTimeout(2500);
log("overview saved");
await shot("01-overview");

// ---- 3. story chapter
await page.getByRole("button", { name: "Story" }).click();
await page.getByRole("textbox", { name: "New chapter title" }).fill("The brief");
await page
  .getByRole("textbox", { name: "Chapter body" })
  .last()
  .fill("A short synthetic chapter written in the Admin.");
await page
  .getByRole("button", { name: /Add chapter|Create chapter|Add/u })
  .first()
  .click();
await page.waitForTimeout(2500);
log("chapter added");

// ---- 4. services
await page.getByRole("button", { name: "Services" }).click();
const firstService = page.locator(".service-checklist input[type=checkbox]").first();
if (await firstService.count()) {
  await firstService.check();
}
await page
  .getByRole("button", { name: /Save services|Save related|Save/u })
  .first()
  .click();
await page.waitForTimeout(2500);
log("services saved");

// ---- 5a. placement: Rwanda context concept study
await page.getByRole("button", { name: "Website placement" }).click();
await page
  .locator("select#evidenceClass, select[name=evidenceClass]")
  .first()
  .selectOption("context_study");
await page.getByRole("button", { name: "Save placement" }).click();
await page.waitForTimeout(2500);
log("placement saved");

// ---- 5. media: hero + 5 gallery items, each confirmed
await page.getByRole("button", { name: /^Media/u }).click();
for (const [file, role, caption, alt] of files) {
  const details = page.locator("details.media-upload-details");
  if (!(await details.evaluate((el) => el.open))) await details.locator("summary").click();
  await page.waitForTimeout(300);
  await page.locator("#media-file").setInputFiles(file);
  await page.locator("#media-provenance").selectOption("generated_reference");
  await page.locator("#media-role").selectOption(role);
  await page.locator("#media-alt").fill(alt);
  await page.locator("#media-caption").fill(caption);
  const before = await page.locator(".media-card-list > li").count();
  await page.getByRole("button", { name: /Upload & attach/u }).click();
  await page.waitForFunction(
    (n) => document.querySelectorAll(".media-card-list > li").length > n,
    before,
    { timeout: 60000 },
  );
  await page.waitForTimeout(800);
  log("uploaded", role, caption);
}
await shot("02-media-uploaded");
// confirm each generated visual (cards are listed in order)
const confirmButtons = page.getByRole("button", { name: "Confirm as generated concept visual" });
let guard = 0;
while ((await confirmButtons.count()) > 0 && guard < 10) {
  await confirmButtons.first().click();
  await page.waitForTimeout(2500);
  guard += 1;
}
log("confirmed", guard, "media items; total", await page.locator(".media-card-list > li").count());
// reorder: move the last item up once
const moveUp = page.getByRole("button", { name: "Move up" });
const count = await moveUp.count();
if (count > 0) {
  await moveUp.nth(count - 1).click();
  await page.waitForTimeout(2000);
  log("reordered last item up");
}
await shot("03-media-confirmed");

// ---- 7. review + publish
await page.goto(editorUrl + "?locale=en", { waitUntil: "networkidle" });
const review = page.getByRole("button", { name: "Mark factually reviewed" });
if (await review.count()) {
  await review.click();
  await page.waitForTimeout(2500);
  log("marked reviewed");
}
await page.getByRole("button", { name: "Publication" }).click();
await page.waitForTimeout(1000);
await shot("04-publication");
const blockers = await page
  .locator(".publication-readiness li, .readiness-list li")
  .allTextContents()
  .catch(() => []);
if (blockers.length) log("readiness notes:", blockers.join(" | "));
const publish = page.getByRole("button", { name: "Publish", exact: true });
if (await publish.isEnabled().catch(() => false)) {
  await publish.click();
  await page.getByRole("button", { name: "Confirm publish" }).click();
  await page.waitForTimeout(4000);
  log("published");
} else {
  log("PUBLISH BLOCKED");
}
await shot("05-published");

// ---- 8. public verification
const pub = await context.newPage();
await pub.goto(`${base}/projects`, { waitUntil: "networkidle" });
const tile = pub.getByRole("link", { name: new RegExp(title, "u") });
log("index shows project:", await tile.count());
const countText = await pub.locator(".studies-count").first().textContent();
log("index count line:", countText?.trim());
await pub.screenshot({ path: `${dir}/06-public-index.png` });
await pub.goto(`${base}/projects/${slug}`, { waitUntil: "networkidle" });
log("detail status", await pub.evaluate(() => document.title));
const frames = await pub.locator(".gallery-grid .gallery-frame").count();
log("gallery frames:", frames);
const badge = await pub.locator(".study-hero-provenance, .concept-badge").first().textContent();
log("badge:", badge?.trim());
await pub.locator(".gallery-grid .gallery-frame-button").first().click();
await pub.waitForTimeout(800);
log("lightbox open:", await pub.locator("dialog.lightbox[open]").count());
await pub.screenshot({ path: `${dir}/07-public-lightbox.png` });
await pub.keyboard.press("ArrowRight");
await pub.waitForTimeout(400);
log(
  "lightbox index after ArrowRight:",
  (await pub.locator(".lightbox-index").textContent())?.trim(),
);
await pub.keyboard.press("Escape");
await pub.waitForTimeout(400);
log("lightbox closed:", (await pub.locator("dialog.lightbox[open]").count()) === 0);
const related = await pub.locator(".service-related-list a").count();
log("related service links:", related);
await pub.setViewportSize({ width: 390, height: 844 });
await pub.reload({ waitUntil: "networkidle" });
await pub.screenshot({ path: `${dir}/08-public-mobile.png`, fullPage: false });
log("mobile ok");
await pub.close();

// ---- 9. archive
await page.goto(editorUrl + "?locale=en", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Publication" }).click();
await page.getByRole("button", { name: "Archive", exact: true }).click();
await page.getByRole("button", { name: "Confirm archive" }).click();
await page.waitForTimeout(4000);
log("archived");
const pub2 = await context.newPage();
const response = await pub2.goto(`${base}/projects/${slug}`, { waitUntil: "networkidle" });
log("public detail after archive status:", response?.status());
await pub2.goto(`${base}/projects`, { waitUntil: "networkidle" });
log(
  "index shows project after archive:",
  await pub2.getByRole("link", { name: new RegExp(title, "u") }).count(),
);
await pub2.close();
await page.goto(editorUrl + "?locale=en", { waitUntil: "networkidle" });
log("admin record still opens:", (await page.getByRole("heading", { name: title }).count()) > 0);
await shot("09-archived-admin");
await browser.close();
console.log("\n" + report.join("\n"));
