import { expect, test, type Page } from "@playwright/test";

async function measureAfterProfileClick(page: Page): Promise<{
  scrollHeightDelta: number;
  gridCellDelta: number;
  clsScore: number;
  mainBoxBefore: { h: number; y: number };
  mainBoxAfter: { h: number; y: number };
  flicker: { sampleCount: number; maxNegativeDelta: number; visibilityFlips: number } | null;
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
  await page.waitForFunction(
    () => window.location.pathname.includes("/fiber/") || window.location.hash.length > 1,
    null,
    {
    timeout: 15_000,
    },
  );
  await page.waitForTimeout(800);
  await page.locator(".detail-card-slot").first().waitFor({ state: "visible", timeout: 10_000 });

  const flicker = await page.evaluate(async () => {
    const target = document.querySelector(".detail-card-slot");
    if (!(target instanceof HTMLElement)) return null;

    const sampleOpacity = () => {
      const opacity = Number.parseFloat(getComputedStyle(target).opacity);
      if (Number.isNaN(opacity)) return 1;
      return Math.min(1, Math.max(0, opacity));
    };

    const samples: number[] = [sampleOpacity()];
    for (let i = 0; i < 24; i += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      samples.push(sampleOpacity());
    }

    let maxNegativeDelta = 0;
    let visibilityFlips = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const delta = samples[i] - samples[i - 1];
      if (delta < maxNegativeDelta) maxNegativeDelta = delta;
      if (samples[i - 1] > 0.6 && samples[i] < 0.2) visibilityFlips += 1;
    }

    return {
      sampleCount: samples.length,
      maxNegativeDelta,
      visibilityFlips,
    };
  });

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
    flicker,
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

    expect(page.url()).toMatch(/(\/fiber\/|#.+)/);
    // Persistent shell: grid should not remount from zero; cell count may grow (virtual plates) but should stay finite
    expect(m.gridCellDelta).toBeGreaterThanOrEqual(0);
    expect(m.clsScore).toBeLessThan(2);
    expect(m.flicker).not.toBeNull();
    expect(m.flicker?.visibilityFlips ?? 1).toBe(0);
    expect(m.flicker?.maxNegativeDelta ?? 0).toBeGreaterThan(-0.35);
  });
});
