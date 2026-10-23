import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Read-only: use playwright.frontend.config.ts; never seed, sign in or publish.
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`approved logo, navigation and footer at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const home = page.getByRole("link", { name: "RENZ Construction home", exact: true });
    const image = home.locator(".renz-symbol-image");
    await expect(image).toHaveAttribute("src", "/media/brand/renz-construction-icon.svg");
    await expect(image).toHaveAttribute("alt", "");
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect(image).toHaveCSS("filter", "none");
    await expect(home.locator(".renz-wordmark img")).toBeVisible();
    expect((await image.boundingBox())?.width).toBeGreaterThanOrEqual(48);
    expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await home.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    const brandBounds = (await home.boundingBox())!;
    const actionBounds = (await page.locator(".public-header-actions").boundingBox())!;
    expect(brandBounds.x + brandBounds.width).toBeLessThanOrEqual(actionBounds.x);
    await expect(page.locator(".public-header .preview-renz-identity")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`) });

    await home.focus();
    await expect(home).toBeFocused();
    await expect(home).toHaveAttribute("href", "/");
    await page.evaluate(() => scrollTo(0, 500));
    await expect(page.locator(".public-header")).toHaveAttribute("data-scrolled", "true");
    expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await home.boundingBox())?.width).toBeGreaterThanOrEqual(44);
    await page
      .locator(".public-header")
      .screenshot({ path: testInfo.outputPath(`navbar-scrolled-${width}.png`) });

    if (width < 1024) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      const dialog = page.locator("dialog[open]");
      await expect(dialog.locator(".renz-symbol-image")).toBeVisible();
      await dialog.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
      const audit = await new AxeBuilder({ page }).include("dialog[open]").analyze();
      expect(
        audit.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
    }

    const footer = page.locator(".site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator(".renz-symbol-image")).toBeVisible();
    await footer.screenshot({ path: testInfo.outputPath(`footer-${width}.png`) });
    const audit = await new AxeBuilder({ page })
      .include(".public-header")
      .include(".site-footer")
      .analyze();
    expect(
      audit.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
  });
}

test("same-origin SVG and favicon are served with usable metadata", async ({ page, request }) => {
  await page.goto("/");
  const svg = await request.get("/media/brand/renz-construction-icon.svg");
  expect(svg.status()).toBe(200);
  expect(svg.headers()["content-type"]).toContain("image/svg+xml");
  expect(await svg.text()).not.toMatch(/<(?:script|image|foreignObject)\b/u);
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveCount(1);
  const href = await icon.getAttribute("href");
  expect(href).toContain("/favicon.ico");
  const response = await request.get(href!);
  expect(response.status()).toBe(200);
  const data = await response.body();
  expect(data.readUInt16LE(2)).toBe(1);
  expect(data.readUInt16LE(4)).toBe(3);
  expect([data[6], data[22], data[38]]).toEqual([16, 32, 48]);
});

for (const width of [320, 768, 1440]) {
  test(`large reference opening identity at ${width}px is skippable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install();
    await page.goto("/");
    // Freeze presentation only for the capture; JS dismissal remains independently exercised.
    await page.addStyleTag({
      content: ".brand-opener, .brand-opener-lockup { animation: none !important; }",
    });
    const opener = page.locator(".brand-opener");
    const logo = opener.locator("img");
    await expect(logo).toHaveAttribute("src", "/media/brand/renz-construction.svg");
    await expect(logo).toBeVisible();
    await expect(opener).toHaveCSS("background-color", "rgb(255, 255, 255)");
    const bounds = (await logo.boundingBox())!;
    const screenBounds = (await opener.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(Math.min(width * 0.8, 590));
    // Center within the usable screen; the document reserves a scrollbar gutter.
    expect(
      Math.abs(bounds.x + bounds.width / 2 - (screenBounds.x + screenBounds.width / 2)),
    ).toBeLessThan(2);
    expect(bounds.width / bounds.height).toBeCloseTo(1183 / 306, 1);
    await page.screenshot({ path: testInfo.outputPath(`opener-${width}.png`) });
    const skip = page.getByRole("button", { name: "Skip intro" });
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(opener).toHaveCount(0);
    await page.reload();
    await page.clock.runFor(10);
    await expect(opener).toHaveCount(0);
  });
}

test("opening screen clears within the motion budget", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.runFor(1400);
  await expect(page.locator(".brand-opener")).toHaveCount(0);
});

test("brand home link navigates back from an inner page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/contact");
  await page.getByRole("link", { name: "RENZ Construction home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/u);
});

test("approved full-color and reverse symbols fit the existing sign-in shell", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/sign-in");
    const image = page.locator(".auth-brand .renz-symbol-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveCSS("filter", "none");
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`sign-in-${width}.png`) });
  }
});

test("logo and home control fit 200-percent-equivalent reflow", async ({ browser }, testInfo) => {
  // 1280 physical pixels at 200% zoom have a 640 CSS-pixel layout viewport.
  const context = await browser.newContext({
    viewport: { width: 640, height: 450 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(testInfo.project.use.baseURL!);
    const home = page.getByRole("link", { name: "RENZ Construction home", exact: true });
    await expect(home.locator(".renz-symbol-image")).toBeVisible();
    expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath("reflow-200-percent-equivalent.png") });
  } finally {
    await context.close();
  }
});

test("forced colors, reduced motion and narrow reflow keep the brand usable", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".brand-opener")).toHaveCount(0);
  const home = page.getByRole("link", { name: "RENZ Construction home", exact: true });
  await home.focus();
  await expect(home).toBeFocused();
  const mask = await home.locator(".renz-symbol").evaluate((node) => {
    const style = getComputedStyle(node, "::before");
    return { content: style.content, mask: style.maskImage, color: style.backgroundColor };
  });
  expect(mask.content).toBe('""');
  expect(mask.mask).toContain("renz-construction-icon.svg");
  expect(mask.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("forced-colors-320.png") });
});
