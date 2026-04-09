import { expect, test } from '@playwright/test';

test.describe('mobile viewport shell height', () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
  ];

  for (const viewport of viewports) {
    test(`TopNav shell height matches viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await expect(page.getByRole('button', { name: 'Natural Fiber Atlas' })).toBeVisible({ timeout: 15000 });

      /* WebKit can report a transient inflated layout for dvh before the first stable frame. */
      await expect
        .poll(
          async () => {
            return page.evaluate(() => {
              const wordmarkButton = Array.from(document.querySelectorAll('button')).find(
                (button) => button.textContent?.trim() === 'Natural Fiber Atlas',
              );
              if (!wordmarkButton) {
                throw new Error('Wordmark button was not found');
              }

              const shell = wordmarkButton.closest('[data-atlas-viewport-shell="topnav"]');
              if (!shell) {
                throw new Error('Top-level shell was not found');
              }

              const shellBlockSize = shell.getBoundingClientRect().height;
              const viewportHeight = window.innerHeight;
              return Math.abs(shellBlockSize - viewportHeight);
            });
          },
          { timeout: 15000 },
        )
        .toBeLessThanOrEqual(2);

      const classList = await page.evaluate(() => {
        const wordmarkButton = Array.from(document.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === 'Natural Fiber Atlas',
        );
        const shell = wordmarkButton?.closest('[data-atlas-viewport-shell="topnav"]');
        return shell?.className ?? '';
      });
      expect(classList).toContain('h-full');
      expect(classList).toContain('min-h-atlas-vvh');
    });
  }
});
