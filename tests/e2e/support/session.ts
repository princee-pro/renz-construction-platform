import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page } from "@playwright/test";

export type SyntheticActor = Readonly<{
  id: string;
  email: string;
  password: string;
  totpSecret: string;
}>;

type SyntheticFixtures = Readonly<{
  actors: Readonly<Record<string, SyntheticActor>>;
  supabase: Readonly<{ url: string; anonymousKey: string; secretKey: string }>;
}>;

export function fixtures(): SyntheticFixtures {
  return JSON.parse(
    readFileSync(join(process.cwd(), ".playwright", "s5a-fixtures.json"), "utf8"),
  ) as SyntheticFixtures;
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = value.replace(/=+$/u, "").toUpperCase();
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Synthetic TOTP material was invalid.");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function totp(secret: string): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary =
    (((digest.at(offset) ?? 0) & 0x7f) << 24) |
    (((digest.at(offset + 1) ?? 0) & 0xff) << 16) |
    (((digest.at(offset + 2) ?? 0) & 0xff) << 8) |
    ((digest.at(offset + 3) ?? 0) & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export async function signInWithMfa(
  page: Page,
  actor: SyntheticActor,
  next = "/admin",
): Promise<void> {
  await page.goto(`/admin/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: "Email address" }).fill(actor.email);
  await page.getByLabel("Password").fill(actor.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/mfa\?/u);
  await page.getByRole("textbox", { name: "Authenticator code" }).fill(totp(actor.totpSecret));
  await page.getByRole("button", { name: "Verify and continue" }).click();
  const arrived = await page
    .waitForURL((url) => url.pathname === next, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!arrived) {
    const remaining = 31_000 - (Date.now() % 30_000);
    await page.waitForTimeout(remaining);
    await page.getByRole("textbox", { name: "Authenticator code" }).fill(totp(actor.totpSecret));
    await page.getByRole("button", { name: "Verify and continue" }).click();
  }
  await expect(page).toHaveURL((url) => url.pathname === next);
}

export async function createDraft(page: Page, suffix: string): Promise<string> {
  await page.goto("/admin/content/services/new");
  await page.getByRole("textbox", { name: "Service name" }).fill(`SYNTHETIC S5A ${suffix}`);
  await page
    .getByRole("textbox", { name: "Public slug" })
    .fill(`synthetic-s5a-${suffix.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-")}`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/content\/services\/[0-9a-f-]+\?locale=en$/u);
  const match = /\/services\/([0-9a-f-]+)/u.exec(page.url());
  if (!match?.[1]) throw new Error("Created synthetic service ID was not available.");
  return match[1];
}
