import { expect, test } from "@playwright/test";

test("profile cards remain clickable after nav filter interaction", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Desktop navigation interaction coverage");

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const profileCardButtons = page.getByRole("button", { name: /^Open .* profile$/ });
  await expect(profileCardButtons.first()).toBeVisible();

  await profileCardButtons.first().click();
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toMatch(/\/fiber\/[^/]+$/);

  const plantNavButton = page.getByRole("button", { name: /Plant Plant/i }).first();
  await expect(plantNavButton).toBeVisible();
  await plantNavButton.click();

  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe("/");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const q = `${window.location.search}&${window.location.hash.replace(/^#/, "")}`;
        return q.includes("cat=");
      }),
    )
    .toBe(true);

  const filteredProfileButtons = page.getByRole("button", { name: /^Open .* profile$/ });
  await expect(filteredProfileButtons.first()).toBeVisible();
  await filteredProfileButtons.first().click();

  await expect.poll(() => page.evaluate(() => window.location.pathname)).toMatch(/\/fiber\/[^/]+$/);
});
