import { expect, test } from '@playwright/test';

test.describe('mobile route shell contracts', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('about route uses dynamic viewport shell height', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('div.min-h-dvh').first()).toBeVisible();
  });

  test('not-found route uses dynamic viewport shell height', async ({ page }) => {
    await page.goto('/definitely-not-a-real-route');
    await expect(page.locator('div.min-h-dvh').first()).toBeVisible();
  });
});
