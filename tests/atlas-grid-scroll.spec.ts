import { expect, test } from "@playwright/test";

/**
 * Diagnoses atlas browse scroll: content lives in TopNav’s `overflow-y-auto` pane,
 * not `document.documentElement`. Failures here usually mean scrollHeight ≈ clientHeight
 * or wheel deltas not reaching the scrollport.
 */
test.describe("Atlas grid scroll (TopNav scrollport)", () => {
  test("scrollport is taller than viewport and wheel scroll advances scrollTop", async ({
    page,
    browserName,
  }, testInfo) => {
    test.skip(
      browserName !== "chromium",
      "Uses mouse wheel + layout metrics for the desktop shell only",
    );
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await expect(page.locator(".atlas-grid")).toBeVisible({ timeout: 30_000 });

    const scrollPort = page.getByTestId("atlas-main-scroll");
    await expect(scrollPort).toBeVisible({ timeout: 15_000 });

    const doc = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      docElScrollHeight: document.documentElement.scrollHeight,
      docElClientHeight: document.documentElement.clientHeight,
      bodyScrollHeight: document.body.scrollHeight,
      windowScrollY: window.scrollY,
    }));

    const port = await scrollPort.evaluate((el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        clientWidth: el.clientWidth,
        overflowY: getComputedStyle(el).overflowY,
        boundingHeight: r.height,
        flexComputedMinHeight: getComputedStyle(el).minHeight,
        flexComputedHeight: getComputedStyle(el).height,
        flexComputedFlexGrow: getComputedStyle(el).flexGrow,
      };
    });

    const gridCells = await page.locator(".atlas-grid .grid-cell").count();

    const diag = {
      doc,
      port,
      gridCellCount: gridCells,
      scrollSlackPx: port.scrollHeight - port.clientHeight,
    };
    await testInfo.attach("scroll-diagnostics-before.json", {
      body: JSON.stringify(diag, null, 2),
      contentType: "application/json",
    });

    expect(
      port.scrollHeight,
      "Main atlas scrollport should own vertical overflow (scrollHeight > clientHeight). " +
        "If scrollSlackPx is tiny, the flex scroll pane is not height-constrained (flex-1/min-h-0 broken) " +
        "or grid content height collapsed.",
    ).toBeGreaterThan(port.clientHeight + 200);

    const box = await scrollPort.boundingBox();
    expect(box, "scrollport bounding box").toBeTruthy();

    const centerX = box!.x + box!.width / 2;
    const centerY = box!.y + Math.min(box!.height * 0.6, box!.height - 8);

    await page.mouse.move(centerX, centerY);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 400);
    }

    await page.waitForTimeout(150);

    const after = await scrollPort.evaluate((el: HTMLElement) => el.scrollTop);
    await testInfo.attach("scroll-diagnostics-after.json", {
      body: JSON.stringify({ scrollTopAfterWheel: after, ...diag }, null, 2),
      contentType: "application/json",
    });

    expect(
      after,
      "Wheel over the grid region should increase scrollTop on atlas-main-scroll (not window)",
    ).toBeGreaterThan(150);

    expect(
      doc.windowScrollY,
      "Window should not absorb grid scroll (window.scrollY stays ~0 in TopNav layout)",
    ).toBeLessThan(5);
  });
});
