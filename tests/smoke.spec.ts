import { expect, test } from '@playwright/test';

test('homepage renders with a non-empty title', async ({ page }) => {
  /* WebKit often never reaches `load` while dev tooling / HMR keeps connections open. */
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/.+/);
});
