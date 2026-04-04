import path from 'path'
import fs from 'fs'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

export type SeoStaticBundle = { robots: string; sitemap: string }

/**
 * Shared robots.txt + sitemap.xml body for dev middleware and production `closeBundle`.
 */
export function generateSeoStaticFiles(
  env: Record<string, string>,
  cwd: string = process.cwd(),
): SeoStaticBundle {
  const trimmed = (env.VITE_SITE_URL ?? '').trim().replace(/\/$/, '')
  const base = trimmed || 'http://localhost:3000'
  const fiberOrderPath = path.resolve(cwd, 'src/app/data/fiber-order.json')
  let fiberIds: string[] = []
  try {
    const raw = fs.readFileSync(fiberOrderPath, 'utf8')
    const parsed = JSON.parse(raw) as { global?: string[] }
    fiberIds = Array.isArray(parsed.global) ? parsed.global : []
  } catch {
    /* optional */
  }

  const staticPaths = ['/', '/about']
  const locs = [
    ...staticPaths.map((p) => `${base}${p === '/' ? '/' : p}`),
    ...fiberIds.map((id) => `${base}/fiber/${encodeURIComponent(id)}`),
  ]
  const lastmod = new Date().toISOString().slice(0, 10)
  const urlEntries = locs
    .map(
      (loc) =>
        `  <url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`,
    )
    .join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`

  const robots = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /workbench

Sitemap: ${base}/sitemap.xml
`

  return { robots, sitemap }
}
