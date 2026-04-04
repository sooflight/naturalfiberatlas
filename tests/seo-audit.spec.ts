import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';

function gatherSeoSignals(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const metas = Array.from(document.querySelectorAll('meta')).map((m) => ({
      name: m.getAttribute('name') ?? m.getAttribute('property') ?? '',
      content: m.getAttribute('content') ?? '',
    }));
    const links = Array.from(document.querySelectorAll('link[rel]')).map((l) => ({
      rel: l.getAttribute('rel'),
      href: l.getAttribute('href'),
    }));
    return {
      title: document.title,
      lang: document.documentElement.getAttribute('lang'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      metaDescription:
        document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
      ogDescription:
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ?? null,
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
      twitterCard:
        document.querySelector('meta[name="twitter:card"]')?.getAttribute('content') ?? null,
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
      h1Count: document.querySelectorAll('h1').length,
      h1Texts: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent?.trim() ?? ''),
      jsonLdScripts: document.querySelectorAll('script[type="application/ld+json"]').length,
      metasWithContent: metas.filter((m) => m.name && m.content),
      linkRels: links,
    };
  });
}

test.describe('SEO audit (Playwright)', () => {
  test('collect head + heading signals for key routes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium');

    const routes: { path: string; signals: Awaited<ReturnType<typeof gatherSeoSignals>> }[] = [];

    for (const path of ['/', '/about', '/fiber/hemp', '/seo-audit-missing-route']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(path === '/' ? 1500 : 600);
      routes.push({ path, signals: await gatherSeoSignals(page) });
    }

    const report = { collectedAt: new Date().toISOString(), routes };
    const out = testInfo.outputPath('seo-audit-report.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

    expect(routes.length).toBe(4);

    const home = routes.find((r) => r.path === '/')?.signals;
    const about = routes.find((r) => r.path === '/about')?.signals;
    const hemp = routes.find((r) => r.path === '/fiber/hemp')?.signals;
    expect(home?.metaDescription?.length).toBeGreaterThan(20);
    expect(home?.canonical).toBeTruthy();
    expect(home?.ogTitle).toBeTruthy();
    expect(about?.title).toMatch(/About/i);
    expect(hemp?.title).toMatch(/Hemp/i);
    expect(hemp?.ogTitle).toMatch(/Hemp/i);
  });

  test('serves robots.txt and sitemap.xml (dev parity with build)', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium');
    const robots = await request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const robotsText = await robots.text();
    expect(robotsText).toContain('User-agent:');
    expect(robotsText).toContain('Sitemap:');

    const sm = await request.get('/sitemap.xml');
    expect(sm.ok()).toBe(true);
    const xml = await sm.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/fiber/hemp');
  });
});
