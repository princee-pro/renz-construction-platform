// D1.5 document round: downloads every document state as PDF through the
// real staff routes (session + MFA) so they can be inspected as rendered.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { currentTotp } from "../tests/e2e/support/totp.mjs";

const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const ids = JSON.parse(process.env.RENZ_DOC_IDS ?? "{}");
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const dir = ".playwright/documents";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/admin/sign-in?next=%2Fadmin`);
await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
await page.getByLabel("Password").fill(actor.password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin\/mfa\?/u);
await page.getByRole("textbox", { name: "Authenticator code" }).fill(currentTotp(actor.totpSecret));
await page.getByRole("button", { name: "Verify and continue" }).click();
await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });

const targets = [
  ["draft-invoice", `/admin/finance/invoices/${ids.draftInvoice}/pdf`],
  ["issued-invoice", `/admin/finance/invoices/${ids.issuedInvoice}/pdf`],
  ["partial-invoice", `/admin/finance/invoices/${ids.partialInvoice}/pdf`],
  ["void-invoice", `/admin/finance/invoices/${ids.voidInvoice}/pdf`],
  ["multipage-invoice", `/admin/finance/invoices/${ids.multipageInvoice}/pdf`],
  ["purchase-order", `/admin/procurement/orders/${ids.purchaseOrder}/pdf`],
];
for (const [name, route] of targets) {
  const response = await page.request.get(`${base}${route}`);
  const type = response.headers()["content-type"] ?? "";
  if (response.status() !== 200 || !type.includes("pdf")) {
    console.log("FAILED", name, response.status(), (await response.text()).slice(0, 120));
    continue;
  }
  const body = await response.body();
  writeFileSync(`${dir}/${name}.pdf`, body);
  console.log(
    "saved",
    name,
    body.length,
    "bytes",
    `pages=${(body.toString("latin1").match(/\/Type\s*\/Page[^s]/gu) ?? []).length}`,
  );
}
// Receipt: first payment of the partially paid invoice.
const detail = await page.goto(`${base}/admin/finance/invoices/${ids.partialInvoice}`);
if (detail) {
  await page
    .getByRole("button", { name: /^Payments/u })
    .first()
    .click()
    .catch(() => undefined);
  await page.waitForTimeout(500);
  const receiptLink = page.locator('a[href*="/pdf?payment="]').first();
  if (await receiptLink.count()) {
    const href = await receiptLink.getAttribute("href");
    const response = await page.request.get(`${base}${href}`);
    if (response.status() === 200) {
      writeFileSync(`${dir}/payment-receipt.pdf`, await response.body());
      console.log("saved payment-receipt");
    } else console.log("FAILED receipt", response.status());
  } else console.log("no receipt link found");
}
await browser.close();
