# Admin Root Route Removal Design

## Goal

Remove the admin entrypoint at `/admin/` while preserving deep-link behavior at `/admin/:fiberId`.

## Scope

- Remove only the `/admin` route.
- Keep `/admin/:fiberId`, `/admin/images`, and other specialized admin paths intact.
- Ensure no remaining redirects point to `/admin`.

## Approach

1. Update route tests first to express desired behavior:
   - `/admin` is not present in enabled admin routes.
   - `/admin/:fiberId` remains present.
2. Update route configuration:
   - Remove root `admin` route.
   - Replace legacy `workbench` redirect to `/admin` with a direct lazy route load.
3. Run focused tests for routing to verify behavior and catch regressions.

## Risks and Mitigations

- Existing bookmarks to `/admin` will now resolve to not-found.
  - Intentional per request; behavior codified in tests.
- Legacy aliases that relied on `/admin` may break.
  - `workbench` is preserved as a functional route to avoid dead-end redirects.

## Validation

- Run `src/app/routes.test.ts`.
- Confirm route list excludes `admin` but includes `admin/:fiberId`.
