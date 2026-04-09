import { expect, test } from "@playwright/test";

test.describe("Admin ImageScout", () => {
  test("magnifier opens ImageScout panel", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "ImageDatabaseManager / Export JSON target desktop layout; skip mobile WebKit.");
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "atlas:workbench-shell-state",
        JSON.stringify({
          topLevel: "workspace",
          activeMode: "browse",
          viewMode: "list",
        }),
      );
    });

    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Ensure the ImageDatabaseManager surface is mounted before dispatching open event.
    await expect(page.getByRole("button", { name: /export json/i })).toBeVisible({ timeout: 15000 });

    const scoutOpenButton = page.getByTitle("Open Image Scout");
    await expect(scoutOpenButton).toBeVisible();
    await scoutOpenButton.click();

    await expect(page.getByText(/image scout|rapid scout/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("scout-file-dropzone")).toBeVisible();
  });
});

