import { expect, test } from "@playwright/test";

test("profile cards remain clickable after nav filter interaction", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Desktop navigation interaction coverage");

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const profileCardButtons = page.getByRole("button", { name: /^Open .* profile$/ });
  await expect(profileCardButtons.first()).toBeVisible();

  const initialTarget = profileCardButtons.nth(1);
  if (await initialTarget.isVisible().catch(() => false)) {
    await initialTarget.click();
  } else {
    await profileCardButtons.first().click();
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const isFiberRoute = /\/fiber\/[^/]+$/.test(window.location.pathname);
        const hasDetailSlot = document.querySelector(".detail-card-slot") !== null;
        const hasHashSelection = window.location.hash.length > 1;
        return isFiberRoute || hasDetailSlot || hasHashSelection;
      }),
    )
    .toBe(true);

  const atlasHomeButton = page.getByRole("button", { name: /^Natural Fiber Atlas$/ }).first();
  await expect(atlasHomeButton).toBeVisible();
  await atlasHomeButton.click();
  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe("/");

  const searchInput = page.getByRole("textbox", { name: /Search fibers/i });
  await expect(searchInput).toBeVisible();
  await searchInput.fill("linen");

  const filteredProfileButtons = page.getByRole("button", { name: /^Open .* profile$/ });
  await expect(filteredProfileButtons.first()).toBeVisible();
  await filteredProfileButtons.first().click();
  await expect(filteredProfileButtons.first()).toBeVisible();
});
