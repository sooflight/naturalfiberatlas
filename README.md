# FIBER ATLAS C3

Frontend-only Vite + React project for the Fiber Atlas experience.

## Local Development

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Build production bundle: `npm run build`

### Dev-Only OpenRouter Import Parser

To enable AI-assisted import parsing in admin import (sparkles toggle), set these environment variables before running `npm run dev`:

- `OPENROUTER_API_KEY` (required)
- `OPENROUTER_IMPORT_MODEL` (optional, defaults to `openai/gpt-4o-mini`)

Example:

```bash
OPENROUTER_API_KEY=your_key_here OPENROUTER_IMPORT_MODEL=openai/gpt-4o-mini npm run dev
```

Notes:

- This proxy is dev-only and only runs in Vite local serve mode.
- API keys are read server-side in the local Vite process and are never sent directly to the browser.

## Deployment (Vercel)

Use two Vercel projects pointing to the same GitHub repo:

- Public app (`www`): set `VITE_ENABLE_ADMIN=false`
- Admin app (`admin`): set `VITE_ENABLE_ADMIN=true`

Then enable Vercel Deployment Protection on the admin project so only approved users can reach it.

### Why This Is Required

- This app is frontend-only, so route protection must happen at build/platform level.
- `/admin` routes are only registered when `VITE_ENABLE_ADMIN=true`.
- Public deployments should always keep `VITE_ENABLE_ADMIN=false`.

### Hybrid Image Workspace Flags

Optional admin rollout flags:

- `VITE_ADMIN_EMBEDDED_ACTIONS=true`
- `VITE_ADMIN_ADVANCED_IMAGES_ROUTE=true`
- `VITE_ADMIN_RAPID_SCOUT=true`
- `VITE_ADMIN_IIIF=true`
- `VITE_ADMIN_TRANSFORM_OPS=true`
- `VITE_ADMIN_WORKBENCH_V2=true` (must remain `true` for canonical host admin routing)
- `VITE_ADMIN_UNIFIED_SHELL=false`
- `VITE_ADMIN_CANONICAL_URL` — base URL for canonical admin (default: `http://localhost:3000` in dev). Host `/admin*` always redirects here.

Set any flag to `false` to disable the corresponding capability without turning off the whole admin surface.

### Single Admin Policy

- **Canonical admin entrypoint:** `http://localhost:3000/admin` (standalone admin app).
- Host `:5173` `/admin*` routes redirect to canonical admin (`:3000`).
- Legacy aliases:
  - `/workbench` -> `/admin` (or redirect to canonical)
  - `/db` -> `/admin/images`
  - `/canvas` -> `/admin/images`
- See `docs/plans/2026-03-16-admin-canonical-cutover-runbook.md` for cutover and rollback steps.

### Canonical Admin Verification Gates

1. Run `npm run admin:verify:canonical`.
2. Confirm route behavior in local dev:
   - `/admin`
   - `/admin/:fiberId`
   - `/admin/images`
   - `/workbench` redirects to `/admin`
   - `/db` and `/canvas` redirect to `/admin/images`
3. Trigger unsaved-change guard:
   - make an edit in admin
   - attempt navigation to `/admin/images` and then back to `/admin`
4. Validate cohesion telemetry:
   - verify route transitions are emitted
   - verify save lifecycle includes route-aware metrics
   - execute a rollback from changesets and verify rollback metric event
5. If any gate fails, use rollback runbook at `docs/plans/2026-03-16-admin-canonical-cutover-runbook.md`.

### Admin UI Package Bridge Strategy

Until `@natural-fiber-atlas/admin-ui` is published with built artifacts, this repo resolves it directly from local source:

- package entry alias: `packages/admin-ui/src/index.ts`
- package CSS contract: `packages/admin-ui/styles.css`

This keeps host integration stable while allowing a future swap to npm-installed package artifacts with no page-level API changes.

### Post-Stabilization Repository Cleanup

- Folder moves are intentionally deferred during the single-admin cutover.
- Structural target and timing are documented in `docs/plans/2026-03-17-single-admin-structural-cleanup.md`.

## Architecture

- This project currently has no bundled backend service.
- Persistence is handled client-side through local storage abstractions in `src/app/data/data-provider.ts`.
- **Publishing catalog data to GitHub / Vercel:** see [docs/architecture/data-publishing.md](docs/architecture/data-publishing.md). In Admin → Knowledge, download the **diff** export (`atlas-diff-*.json`), optionally save under `catalog/diffs/`, then run `npm run ops:promote-diff -- <path>` to merge `galleryImages` into `new-images.json` (see script `--help`).

## Bundle Strategy

- Build-level chunking is configured in `vite.config.ts` via `build.rollupOptions.output.manualChunks`.
- Current balanced groups:
  - `framework`: React runtime + router core
  - `ui-mui`: MUI + Emotion stack
  - `form-dnd`: form and drag-and-drop libraries
  - `vendor-icons`: icon package chunking for lower shell cost
  - `vendor-misc`: remaining third-party modules
  - `atlas-content`: large atlas dataset modules from `src/app/data`
  - `atlas-overlays`: detail/lightbox/screen-plate optional UI bundles
- Route-level lazy loading is used for `/about` and `/admin` in `src/app/routes.ts` so those route bundles are deferred until navigation.
- The non-admin index route is lazy-loaded to keep root shell bootstrap lean.
- Advanced image workspace route is available at `/admin/images` (and legacy aliases `/db`, `/canvas`) when `VITE_ADMIN_ADVANCED_IMAGES_ROUTE=true`.

### Bundle Maintenance Guardrails

- Add a new dedicated manual chunk only when a dependency cluster is both large and relatively independent.
- Keep broadly coupled packages in `vendor-misc` to avoid circular chunking and micro-chunk sprawl.
- Prefer route-level lazy loading for low-frequency pages/features before increasing chunk granularity.
- Keep `HomePage` and root shell synchronous unless first-load performance goals are not met.

### Bundle Verification Sequence

1. Run `npm run build`.
2. Check `dist/assets/*.js` sizes and confirm no oversized-entry warning appears.
3. Run `npm run ci:verify` to ensure bundle changes did not break test/audit gates.
4. Smoke-test routes:
   - Public deployment: `/`, `/about` (and verify `/admin` resolves to not-found)
   - Admin deployment: `/`, `/about`, `/admin`, `/admin/:fiberId`, `/admin/images`

## Performance Baseline

Run these commands when profiling or validating perf changes:

1. `npm run perf:baseline`
2. `npm run build`
3. `npm run ci:verify`

Acceptance thresholds for non-admin Atlas:

- Initial JS budget estimate (`perf:bundle-report`): **<= 420 KB** across initial chunks.
- Largest single Atlas-focused chunk (`atlas-content` or `atlas-overlays`): **<= 260 KB**.
- Largest shared vendor chunk (`framework` excluded): **<= 220 KB**.
- Route smoke timing (manual perf trace on production build):
  - Home route first interactive frame: **<= 2000 ms** on standard laptop profile.
  - First fiber detail open (click-to-visible): **<= 650 ms** from idle state.

Manual route smoke checklist:

- [ ] Open `/` and verify first interactive frame within threshold.
- [ ] Click first visible fiber card and verify detail open timing.
- [ ] Open lightbox from the same fiber and confirm no obvious interaction hitch.
- [ ] Repeat once on mobile emulation (slow 4G + mid-tier CPU profile).

## Quality Gates

- Run full local verification: `npm run ci:verify`
- Run scoped health typecheck: `npm run typecheck`
- Run tests only: `npm test`
- Run tests with coverage: `npm run test:coverage`
- Run build only: `npm run build`
- Run security audit only: `npm run audit`
- Run de-Supabase source scan only: `npm run check:no-supabase`

## Health Pass (Non-Data Scope)

This health pass intentionally excludes any edits to `src/app/data/**`.

Included improvements:

- CI strictness (`passWithNoTests: false`, coverage thresholds, workflow concurrency/timeout)
- Scoped TypeScript health gate (`tsconfig.health.json`)
- Security hardening:
  - sidebar cookie adds `SameSite=Lax` and conditional `Secure`
  - chart CSS variable token sanitization/escaping
  - host security headers config (`vercel.json`)
  - static security scanning (`.github/workflows/codeql.yml`)
- Runtime perf:
  - lazy-loaded admin chrome components in root layout
  - warmup deferral and constrained-network gating
- Provider reliability:
  - dev-time assertion path for `useAtlasData()` when provider is missing

### Health Verification Runbook

Run in this order:

1. `npm run typecheck`
2. `npm run test`
3. `npm run test:coverage`
4. `npm run build`
5. `npm run ci:verify`

### Data freshness (stale content after deploy)

- Runbook: [docs/runbooks/data-freshness.md](docs/runbooks/data-freshness.md)
- Operator flow: `npm run ops:data-recovery` (bundled census test, optional Upstash + API parity)
- CI locks bundled counts in `src/app/utils/admin/data-freshness-ci.test.ts` (update when data changes on purpose)

## Verification Matrix

Use this checklist before sharing changes:

- [ ] `npm test` passes (all unit/contract tests)
- [ ] `npm run build` passes (production bundle generation)
- [ ] `npm run audit` passes (no high/critical vulnerabilities)
- [ ] `npm run check:no-supabase` passes (no Supabase references in `src`/`utils`)
- [ ] `npm run ci:verify` passes (combined gate)

## CI

- GitHub Actions workflow: `.github/workflows/ci.yml`
- Triggered on pull requests and pushes to `main`
- Enforces `npm run ci:verify`
