import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

type HeuristicIssue = Record<string, string | number | boolean | string[] | undefined>;

async function collectDomHeuristics(page: Page): Promise<HeuristicIssue[]> {
  return page.evaluate(() => {
    const issues: HeuristicIssue[] = [];
    const imgs = Array.from(document.querySelectorAll('img'));
    const noAlt = imgs.filter((img) => {
      const hidden =
        img.getAttribute('aria-hidden') === 'true' ||
        img.closest('[aria-hidden="true"]');
      return !hidden && (!img.hasAttribute('alt') || img.alt.trim() === '');
    });
    if (noAlt.length) {
      issues.push({
        type: 'img-missing-alt',
        count: noAlt.length,
        samples: noAlt.slice(0, 5).map((el) => (el as HTMLImageElement).src.slice(0, 120)),
      });
    }

    const mains = document.querySelectorAll('main');
    if (mains.length === 0) issues.push({ type: 'no-main-landmark' });
    if (mains.length > 1) issues.push({ type: 'multiple-main', count: mains.length });

    const h1 = document.querySelectorAll('h1');
    if (h1.length === 0) issues.push({ type: 'no-h1' });
    if (h1.length > 1) issues.push({ type: 'multiple-h1', count: h1.length });

    const buttons = Array.from(document.querySelectorAll('button'));
    const unnamed = buttons.filter((b) => {
      const t = b.textContent?.trim() ?? '';
      const hasLabel = b.getAttribute('aria-label') || b.getAttribute('aria-labelledby');
      return !t && !hasLabel;
    });
    if (unnamed.length) {
      issues.push({
        type: 'button-no-accessible-name',
        count: unnamed.length,
      });
    }

    const htmlLang = document.documentElement.getAttribute('lang');
    if (!htmlLang) issues.push({ type: 'missing-html-lang' });

    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    issues.push({ type: 'focusable-interactive-count', count: focusable.length });

    return issues;
  });
}

async function auditRoute(
  page: Page,
  testInfo: { outputPath: (s: string) => string },
  label: string,
  url: string,
  consoleErrors: string[],
) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const heuristics = await collectDomHeuristics(page);
  await page.screenshot({
    path: testInfo.outputPath(`${label}.png`),
    fullPage: true,
  });
  return { url, heuristics };
}

test.describe('Visual UI/UX audit (Playwright)', () => {
  test('desktop — routes, detail view, report', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Desktop audit uses Chromium project');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const report: Record<string, unknown> = {
      project: testInfo.project.name,
      viewport: page.viewportSize(),
      routes: [] as unknown[],
      consoleErrors: [] as string[],
      summaryHeuristics: {} as Record<string, unknown>,
    };

    report.routes.push(await auditRoute(page, testInfo, 'audit-01-home', '/', consoleErrors));

    const openProfile = page.getByRole('button', { name: /Open .+ profile/i }).first();
    await expect(openProfile).toBeVisible({ timeout: 30_000 });
    await openProfile.click();
    await page.waitForTimeout(1200);
    report.routes.push({
      url: '/ (detail after card click)',
      heuristics: await collectDomHeuristics(page),
    });
    await page.screenshot({
      path: testInfo.outputPath('audit-02-home-detail.png'),
      fullPage: true,
    });

    report.routes.push(await auditRoute(page, testInfo, 'audit-03-about', '/about', consoleErrors));

    await page.goto('/this-route-does-not-exist-ux-audit', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    report.routes.push({
      url: '/404',
      heuristics: await collectDomHeuristics(page),
    });
    await page.screenshot({
      path: testInfo.outputPath('audit-04-not-found.png'),
      fullPage: true,
    });

    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: testInfo.outputPath('audit-05-about-scrolled-end.png'),
      fullPage: false,
    });

    const uniqueErrors = [...new Set(consoleErrors)];
    report.consoleErrors = uniqueErrors;

    const outDir = path.dirname(testInfo.outputPath('report.json'));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const reportPath = testInfo.outputPath('ui-ux-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    expect((report.routes as unknown[]).length).toBeGreaterThan(0);
  });

  test('mobile — home and about (heuristics; no WebKit screenshots)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'Mobile Safari', 'Mobile audit uses Mobile Safari project');

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 });
    const homeHeuristics = await collectDomHeuristics(page);

    const openProfile = page.getByRole('button', { name: /Open .+ profile/i }).first();
    await openProfile.click().catch(() => {});
    await page.waitForTimeout(1000);
    const detailHeuristics = await collectDomHeuristics(page);

    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const aboutHeuristics = await collectDomHeuristics(page);

    // Playwright WebKit screenshot waits indefinitely on font loading for this canvas/blur-heavy UI; use Chromium + “Mobile Chrome” for mobile pixels.
    const report = {
      project: testInfo.project.name,
      viewport: page.viewportSize(),
      routes: [
        { url: '/', heuristics: homeHeuristics },
        { url: '/ (after profile open)', heuristics: detailHeuristics },
        { url: '/about', heuristics: aboutHeuristics },
      ],
      consoleErrors: [...new Set(consoleErrors)],
    };
    fs.writeFileSync(testInfo.outputPath('ui-ux-audit-mobile-report.json'), JSON.stringify(report, null, 2), 'utf8');
  });
});
