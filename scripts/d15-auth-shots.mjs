// D1.5 auth capture round: sign-in + MFA at 1440 / 768 / 390 against the dev server.
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = process.env.RENZ_SHOT_BASE ?? "http://localhost:3000";
const fixtures = JSON.parse(readFileSync(".playwright/s5a-fixtures.json", "utf8"));
const actor = fixtures.actors.superA;
const dir = ".playwright/screenshots/d15/auth";
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
for (const width of [1440, 768, 390]) {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 844 : 900 } });
  await page.goto(`${base}/admin/sign-in?next=%2Fadmin`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${dir}/${width}-sign-in.png`, fullPage: width < 768 });
  await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
  await page.getByLabel("Password").fill(actor.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin\/mfa\?/u, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByRole("textbox", { name: "Authenticator code" }).fill("123");
  await page.screenshot({ path: `${dir}/${width}-mfa.png`, fullPage: width < 768 });
  await page.close();
  console.log("captured", width);
}
await browser.close();
