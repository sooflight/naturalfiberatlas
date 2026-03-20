# Data freshness runbook

For the **GitHub → Vercel publishing model** (what ships vs what stays local), see [Data publishing architecture](../architecture/data-publishing.md).

## Canonical sources (this repo)

| Domain | Primary bundled source | Runtime overrides |
|--------|------------------------|-------------------|
| Public fiber grid + detail copy | `src/app/data/fibers.ts` + `src/app/data/atlas-data.ts` (bundled tables) | Browser `localStorage` keys prefixed `atlas:` via `LocalStorageSource` |
| Admin navigation + image base | `src/app/data/admin/atlas-navigation.ts`, `atlas-images.ts` | Same `atlas:*` storage + admin tools |
| Material passports / suppliers / evidence | `src/app/data/admin/material-passports.ts`, `supplier-directory.json`, `evidence-records.json` | Remote API when configured |
| Unified material pages (`useUnifiedNodeData`) | API → legacy KV → JSON modules | Upstash cache (`atlas:material:*`) when `VITE_UPSTASH_*` is set |

## Environment routing

- `VITE_API_BASE_URL` — remote API host for `/materials`, `/material/{slug}`, etc. Empty means same-origin relative paths.
- `VITE_UPSTASH_REDIS_REST_URL` / `VITE_UPSTASH_REDIS_REST_TOKEN` — client-side Redis cache; stale entries can mask API updates.
- Hosts may inject `window.__NFA_ADMIN_HOST_CONFIG.runtime.apiBaseUrl` (see `getApiBaseUrl()`).

## Recovery checklist

1. **Local overrides** — In Admin → **Health**, use **Reset local atlas overrides**, or remove all `localStorage` keys starting with `atlas:` for the site origin.
2. **Invalidate Upstash** — From repo root (with credentials in env):  
   `npm run ops:invalidate-cache`  
   Or: `node --env-file=.env.local scripts/invalidate-upstash-cache.mjs`
3. **Bundled baseline** — `npm run ops:data-parity` (runs CI census test + optional API count check).
4. **Remote backfill** — If the API/KV database is behind the bundle, run your deployment-specific seed/migration (see `scripts/reseed-remote-from-bundle.mjs` for env vars and safety notes).

## CI guardrail

`src/app/utils/admin/data-freshness-ci.test.ts` freezes expected bundled census totals. When you intentionally add/remove nav leaves, passports, suppliers, or evidence, update the constants in that file.

## Rollback

Revert the last data commit or restore previous `localStorage` export (Admin export) if a bad override was applied.
