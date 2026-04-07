import { expect, test, type Page } from "@playwright/test";

async function measureAfterProfileClick(page: Page): Promise<{
  scrollHeightDelta: number;
  gridCellDelta: number;
  clsScore: number;
  mainBoxBefore: { h: number; y: number };
  mainBoxAfter: { h: number; y: number };
}> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main").first()).toBeVisible({ timeout: 30_000 });

  const before = await page.evaluate(() => {
    const main = document.querySelector("main");
    const grid = document.querySelector(".atlas-grid");
    const r = main?.getBoundingClientRect();
    return {
      scrollHeight: document.documentElement.scrollHeight,
      gridCells: grid?.querySelectorAll(".grid-cell").length ?? 0,
      mainH: r?.height ?? 0,
      mainY: r?.top ?? 0,
    };
  });

  await page.evaluate(() => {
    const w = window as Window & { __cls?: number };
    w.__cls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const ls = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!ls.hadRecentInput && typeof ls.value === "number") {
            w.__cls = (w.__cls ?? 0) + ls.value;
          }
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
    } catch {
      /* CLS observer unsupported */
    }
  });

  await page.getByRole("button", { name: /Open .+ profile/i }).first().click();
  /* SPA history.pushState — wait on pathname, not Playwright navigation heuristics */
  await page.waitForFunction(() => window.location.pathname.includes("/fiber/"), null, {
    timeout: 15_000,
  });
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const main = document.querySelector("main");
    const grid = document.querySelector(".atlas-grid");
    const r = main?.getBoundingClientRect();
    const w = window as Window & { __cls?: number };
    return {
      scrollHeight: document.documentElement.scrollHeight,
      gridCells: grid?.querySelectorAll(".grid-cell").length ?? 0,
      mainH: r?.height ?? 0,
      mainY: r?.top ?? 0,
      clsScore: w.__cls ?? 0,
    };
  });

  return {
    scrollHeightDelta: after.scrollHeight - before.scrollHeight,
    gridCellDelta: after.gridCells - before.gridCells,
    clsScore: after.clsScore,
    mainBoxBefore: { h: before.mainH, y: before.mainY },
    mainBoxAfter: { h: after.mainH, y: after.mainY },
  };
}

test.describe("Profile open — layout stability", () => {
  test("desktop: URL reaches /fiber/ and documents deltas (regression log)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Desktop metrics use Chromium");

    const m = await measureAfterProfileClick(page);
    const report = { ...m, url: page.url() };
    await testInfo.attach("layout-shift-metrics.json", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });

    expect(page.url()).toMatch(/\/fiber\//);
    // Persistent shell: grid should not remount from zero; cell count may grow (virtual plates) but should stay finite
    expect(m.gridCellDelta).toBeGreaterThanOrEqual(0);
    expect(m.clsScore).toBeLessThan(2);
  });
});
