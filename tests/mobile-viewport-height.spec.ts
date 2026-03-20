import { expect, test } from '@playwright/test';

test.describe('mobile viewport shell height', () => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 375, height: 667 },
  ];

  for (const viewport of viewports) {
    test(`shell min-height tracks viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Natural Fiber Atlas' })).toBeVisible({ timeout: 15000 });

      const metrics = await page.evaluate(() => {
        const wordmarkButton = Array.from(document.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === 'Natural Fiber Atlas',
        );
        if (!wordmarkButton) {
          throw new Error('Wordmark button was not found');
        }

        const shell = wordmarkButton.closest('div.flex.w-full.flex-col.overflow-hidden');
        if (!shell) {
          throw new Error('Top-level shell was not found');
        }

        const classList = shell.className;
        const computedMinHeight = parseFloat(getComputedStyle(shell).minHeight);
        const viewportHeight = window.innerHeight;

        return { classList, computedMinHeight, viewportHeight };
      });

      expect(metrics.classList).toContain('min-h-dvh');
      expect(Math.abs(metrics.computedMinHeight - metrics.viewportHeight)).toBeLessThanOrEqual(1);
    });
  }
});
