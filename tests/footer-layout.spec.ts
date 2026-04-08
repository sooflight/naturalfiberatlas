import { expect, test } from "@playwright/test";

/**
 * Sticky-bottom footer: when browse content is shorter than the scroll viewport,
 * the site footer should sit at the bottom of the visible area (not float mid-viewport).
 */
test.describe("atlas site footer position", () => {
  test("footer anchors to scroll viewport bottom when grid content is short", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByTestId("atlas-site-footer")).toBeVisible({ timeout: 30000 });

    await page.getByLabel("Search fibers").fill("zzzzzznonexistentfiberquery999");
    await expect(page.getByText("No fibers match this view")).toBeVisible({
      timeout: 10000,
    });

    const metrics = await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="atlas-main-scroll"]');
      const footer = document.querySelector('[data-testid="atlas-site-footer"]');
      if (!scroll || !footer) {
        throw new Error("scroll port or footer missing");
      }
      const sr = scroll.getBoundingClientRect();
      const fr = footer.getBoundingClientRect();
      const visibleBottom = sr.top + scroll.clientHeight;
      const gapPx = visibleBottom - fr.bottom;
      return {
        scrollClientHeight: scroll.clientHeight,
        scrollScrollHeight: scroll.scrollHeight,
        footerBottom: fr.bottom,
        visibleBottom,
        gapPx,
      };
    });

    expect(metrics.scrollScrollHeight).toBeGreaterThanOrEqual(metrics.scrollClientHeight - 2);
    // Allow subpixel drift between scroll client box and footer rect (varies with footer content height).
    expect(metrics.gapPx).toBeGreaterThanOrEqual(-16);
    expect(metrics.gapPx).toBeLessThanOrEqual(48);
  });

  test("footer does not cover the bottom grid row when the atlas list is long", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await expect(page.getByTestId("atlas-site-footer")).toBeVisible({ timeout: 30000 });
    const grid = page.locator(".atlas-grid").first();
    await expect(grid).toBeVisible({ timeout: 10000 });

    const cleared = await page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="atlas-main-scroll"]');
      const footer = document.querySelector('[data-testid="atlas-site-footer"]');
      const gridEl = document.querySelector(".atlas-grid");
      const cells = Array.from(document.querySelectorAll(".atlas-grid .grid-cell"));
      if (!scroll || !footer || !gridEl || cells.length === 0) {
        return { ok: false as const, reason: "missing element" };
      }
      scroll.scrollTop = scroll.scrollHeight - scroll.clientHeight;
      const footerRect = footer.getBoundingClientRect();
      const maxCellBottom = Math.max(
        ...cells.map((cell) => (cell as HTMLElement).getBoundingClientRect().bottom),
      );
      const overlapPx = maxCellBottom - footerRect.top;
      return { ok: true as const, overlapPx, gridBottom: maxCellBottom, footerTop: footerRect.top };
    });

    expect(cleared.ok).toBe(true);
    if (cleared.ok) {
      expect(
        cleared.overlapPx,
        `grid bottom ${cleared.gridBottom} should not extend past footer top ${cleared.footerTop}`,
      ).toBeLessThanOrEqual(2);
    }
  });
});
