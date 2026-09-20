import { expect, test } from "@playwright/test";

test.skip(
  process.env["RENZ_E2E_PUBLISHED_PROJECT"] !== "true",
  "The governed published-project fixture runs in its isolated S6A verification phase.",
);

test("renders an evidence-published synthetic project through index and detail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });

  const indexResponse = await page.goto("/projects");
  expect(indexResponse?.status()).toBe(200);
  const projectLink = page.locator('a[href="/projects/synthetic-s6a-published-project"]');
  await expect(projectLink).toBeVisible();
  await expect(projectLink).toContainText("SYNTHETIC S6A Published Project");
  await expect(projectLink).toContainText("SYNTHETIC test project type");
  await page.screenshot({
    path: ".playwright/screenshots/s6a-1440-projects-populated-synthetic.png",
    fullPage: true,
  });

  const detailResponse = await page.goto("/projects/synthetic-s6a-published-project");
  expect(detailResponse?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "SYNTHETIC S6A Published Project" }),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC evidence-backed project scope.")).toBeVisible();
  await expect(page.getByText("SYNTHETIC evidence-backed project role.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/iu);
  await expect(page.getByRole("img")).toHaveCount(0);
  await page.screenshot({
    path: ".playwright/screenshots/s6a-1440-project-detail-populated-synthetic.png",
    fullPage: true,
  });
});
