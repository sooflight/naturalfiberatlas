import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { adminPlugin } from './vite/admin-plugin'
import { generateSeoStaticFiles } from './vite/seo-static'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'

function json(res: { statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void }, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readRequestBody(req: { on(event: string, cb: (chunk?: Buffer) => void): void }): Promise<string> {
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk?: Buffer) => {
      if (chunk) chunks.push(chunk)
    })
    req.on('end', () => resolve())
    req.on('error', (err) => reject(err))
  })
  return Buffer.concat(chunks).toString('utf8')
}

function extractFirstJsonObject(input: string): string {
  const trimmed = input.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch && fenceMatch[1]) return fenceMatch[1].trim()
  return trimmed
}

/** Emit robots.txt + sitemap.xml into dist/; serve the same in dev (Playwright / parity). */
function seoStaticFilesPlugin(env: Record<string, string>) {
  return {
    name: 'seo-static-files',
    configureServer(server: {
      middlewares: { use(fn: (req: unknown, res: unknown, next: () => void) => void): void }
    }) {
      server.middlewares.use((req: { url?: string }, res: {
        setHeader(n: string, v: string): void
        end(b: string): void
      }, next: () => void) => {
        const pathname = req.url?.split('?')[0]
        if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
          const { robots, sitemap } = generateSeoStaticFiles(env, process.cwd())
          if (pathname === '/robots.txt') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(robots)
            return
          }
          res.setHeader('Content-Type', 'application/xml; charset=utf-8')
          res.end(sitemap)
          return
        }
        next()
      })
    },
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist')
      if (!fs.existsSync(dist)) return
      const { robots, sitemap } = generateSeoStaticFiles(env, process.cwd())
      fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap, 'utf8')
      fs.writeFileSync(path.join(dist, 'robots.txt'), robots, 'utf8')
    },
  }
}

function openRouterDevProxyPlugin() {
  return {
    name: 'openrouter-dev-import-proxy',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use(path: string, fn: (req: any, res: any) => void | Promise<void>): void } }) {
      server.middlewares.use('/dev-api/openrouter/parse-import', async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { ok: false, error: 'Method not allowed. Use POST.' })
          return
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
          json(res, 500, {
            ok: false,
            error: 'OPENROUTER_API_KEY is not set in your local environment.',
          })
          return
        }

        try {
          const body = await readRequestBody(req)
          const parsed = JSON.parse(body) as { input?: unknown }
          const input = typeof parsed.input === 'string' ? parsed.input.trim() : ''
          if (!input) {
            json(res, 400, { ok: false, error: 'Request must include non-empty "input" text.' })
            return
          }

          const model = process.env.OPENROUTER_IMPORT_MODEL || DEFAULT_OPENROUTER_MODEL
          const systemPrompt = [
            'You convert unstructured import text into normalized JSON for Fiber Atlas.',
            'Return ONLY a valid JSON object, no markdown, no prose.',
            'Allowed top-level keys: fibers, worldNames, processData, anatomyData, careData, quoteData.',
            'Only include keys present in source input; do not invent fiber ids or values.',
            'For fibers table values, each fiber id maps to a patch object.',
          ].join(' ')

          const userPrompt = `Normalize this import payload into allowed JSON schema:\n\n${input}`

          const upstream = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'http://localhost:3000',
              'X-Title': 'Fiber Atlas C3 Dev Import',
            },
            body: JSON.stringify({
              model,
              temperature: 0,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          })

          if (!upstream.ok) {
            const details = await upstream.text()
            json(res, 502, { ok: false, error: `OpenRouter upstream failed (${upstream.status}): ${details}` })
            return
          }

          const upstreamJson = await upstream.json() as {
            choices?: Array<{ message?: { content?: string } }>
            model?: string
          }
          const content = upstreamJson.choices?.[0]?.message?.content ?? ''
          if (!content) {
            json(res, 502, { ok: false, error: 'OpenRouter returned an empty response.' })
            return
          }

          const normalizedText = extractFirstJsonObject(content)
          const data = JSON.parse(normalizedText) as Record<string, unknown>
          json(res, 200, {
            ok: true,
            model: upstreamJson.model ?? model,
            data,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          json(res, 500, { ok: false, error: message })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, localEnv)

  const envForSeo: Record<string, string> = { ...localEnv }

  return {
  server: {
    port: 3000,
    strictPort: true,
  },
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    openRouterDevProxyPlugin(),
    adminPlugin(),
    seoStaticFilesPlugin(envForSeo),
  ],
  resolve: {
    alias: [
      { find: '@/contexts', replacement: path.resolve(__dirname, './src/app/components/admin/runtime') },
      { find: '@/database-interface', replacement: path.resolve(__dirname, './src/app/components/admin/database-interface') },
      { find: '@/components', replacement: path.resolve(__dirname, './src/app/components/admin') },
      { find: '@/utils', replacement: path.resolve(__dirname, './src/app/utils/admin') },
      { find: '@/hooks', replacement: path.resolve(__dirname, './src/app/hooks/admin') },
      { find: '@/data', replacement: path.resolve(__dirname, './src/app/data/admin') },
      { find: '@/config', replacement: path.resolve(__dirname, './src/app/config') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/app/lib') },
      { find: '@/types', replacement: path.resolve(__dirname, './src/app/types') },
      { find: '@/cms', replacement: path.resolve(__dirname, './src/app/cms') },
      { find: '@/services', replacement: path.resolve(__dirname, './src/app/services') },
      { find: '@/styles', replacement: path.resolve(__dirname, './src/styles') },
      { find: '@', replacement: path.resolve(__dirname, './src/app') },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/src/app/components/detail-card') ||
            id.includes('/src/app/components/lightbox') ||
            id.includes('/src/app/components/screen-plate') ||
            id.includes('/src/app/components/mobile-detail-view')
          ) {
            return 'atlas-overlays';
          }

          if (
            id.includes('/src/app/data/fibers.ts') ||
            id.includes('/src/app/data/atlas-data.ts')
          ) {
            return 'atlas-content';
          }

          if (!id.includes('node_modules')) return;
          const modulePath = id.split('node_modules/')[1] ?? '';

          if (
            modulePath.startsWith('react/') ||
            modulePath.startsWith('react-dom/') ||
            modulePath.startsWith('react-router/') ||
            modulePath.startsWith('@remix-run/router/') ||
            modulePath.startsWith('scheduler/')
          ) {
            return 'framework';
          }

          if (modulePath.startsWith('@mui/') || modulePath.startsWith('@emotion/')) return 'ui-mui';
          if (modulePath.startsWith('lucide-react/')) return 'vendor-icons';
          if (
            modulePath.startsWith('react-hook-form/') ||
            modulePath.startsWith('react-dnd/') ||
            modulePath.startsWith('react-dnd-html5-backend/') ||
            modulePath.startsWith('dnd-core/')
          ) {
            return 'form-dnd';
          }

          if (modulePath.startsWith('motion/')) return 'atlas-overlays';
          return 'vendor-misc';
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
