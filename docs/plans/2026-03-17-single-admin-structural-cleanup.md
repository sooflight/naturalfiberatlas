# Single Admin Structural Cleanup Decision

## Decision

Do not move folders during the canonical admin cutover. Keep the current repository layout while converging behavior on one host admin route.

## Rationale

- The migration blocker was wiring drift (`ADMIN-V1` alias/bridge paths), not physical folder location.
- A folder move now would increase blast radius across imports, scripts, CI, and deployment assumptions while the team is validating parity.
- Canonical behavior is now enforced at route and host integration level (`/admin` and `/admin/images` from host app).

## Stabilization Window

Keep the current shape until the following are true for at least one release cycle:

1. Canonical gate `npm run admin:verify:canonical` passes in CI and local smoke checks.
2. No production dependency on legacy host admin overlays/routes.
3. Team workflow docs consistently point to host `/admin` as source of truth.

## Post-Stabilization Target Layout (Optional)

If/when cleanup is scheduled, move to:

- `apps/web` (host app, public + canonical admin routes)
- `packages/admin-ui` (reusable admin UI package)
- `packages/*` for shared contracts/utilities

This step is intentionally deferred and should be planned as a separate migration with import rewrite automation and CI/deploy updates.
