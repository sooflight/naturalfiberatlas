import { expect, test } from '@playwright/test';

test('homepage renders with a non-empty title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
