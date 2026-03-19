# Admin Canonical Cutover Runbook

## Overview
This runbook supports the migration from host-rendered admin (`:5173/admin`) to canonical external admin (`:3000/admin`). Use it for rollout, verification, and rollback.

## Feature Flags
- **VITE_ADMIN_CANONICAL_URL** — Base URL for canonical admin. Dev default: `http://localhost:3000`. Host `/admin*` always redirects here.

## Rollback Decision Threshold
Execute rollback if any of the following occur:
- Admin save fails or data loss is reported
- Deep links to `/admin`, `/admin/:id`, `/admin/images` break or 404
- Critical E2E smoke fails after redirect rollout
- Security/access control regression on admin deployment

## Rollback Steps
Host admin runtime has been removed; redirect is the only path. Rollback would require re-adding host-rendered admin from git history. No data migration needed — host and external admin use separate localStorage origins.

## Manual Backup Before Cutover
If you have edits on `:5173` and want to migrate to `:3000` before redirect:

1. **Export from 5173:** Open `http://localhost:5173/admin`, DevTools Console, run:
   ```js
   copy(JSON.stringify(Object.fromEntries([...Object.entries(localStorage)].filter(([k])=>k.startsWith('atlas')||k.startsWith('atlas-')).map(([k,v])=>[k,v||'']))))
   ```
   This copies atlas storage to clipboard.

2. **Import to 3000:** Open `http://localhost:3000/admin`, DevTools Console, run:
   ```js
   const data = JSON.parse(prompt('Paste backup JSON'));
   Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,v));
   location.reload();
   ```
   Paste the copied JSON when prompted.

Or use the dev-storage-sync utilities: `exportAtlasStorageForBackup(localStorage)` and `importAtlasStorageFromBackup(json, localStorage)` from `src/app/utils/admin/dev-storage-sync.ts`.

## Verification Gates (run before cutover)
```bash
# Host: route contract + typecheck + build
npm run admin:verify:canonical

# Migration-specific unit tests
npm test -- --run src/app/config/admin-feature-flags.test.ts src/app/routes.test.ts src/app/components/admin/admin-route-contract.test.ts

# Admin storage migration tests
npm run test -- src/app/utils/admin/dev-storage-sync.test.ts
```

## Cutover Steps
1. Ensure admin app (`:3000`) is running and healthy.
2. Optionally set `VITE_ADMIN_CANONICAL_URL` for non-default admin URL (e.g. production admin deployment).
3. Rebuild and deploy host app.
4. Run verification gates above.

## Owner
Document owner and on-call for cutover decisions. Update this section when assigned.
