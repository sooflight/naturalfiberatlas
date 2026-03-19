# Bark Fiber Taxonomy Design

**Goal**

Add a new `bark` subtype under `fiber > plant` across admin and frontend navigation, filtering, and taxonomy/tagging behavior.

## Scope

- Add frontend navigation node: `bark-fiber` under `plant`.
- Add admin navigation node: `bark-fibers` under `plant-cellulose`.
- Keep parity mapping between legacy frontend IDs and admin taxonomy IDs.
- Add `fiber/plant/bark` support in admin tag path flows by including bark in the taxonomy source paths.
- Ensure frontend filter mapping and GridView subtype detection support bark.
- Extend thumbnail aliases/defaults so bark nodes can resolve images.

## Non-Goals

- No data migration of existing profile tags.
- No restructuring of taxonomy architecture.
- No new UI patterns; this is additive to existing flows.

## Affected Areas

- Frontend nav source: `src/app/data/atlas-navigation.ts`
- Admin nav source: `src/app/data/admin/atlas-navigation.ts`
- Frontend route/filter mapping: `src/app/pages/home.tsx`
- Grid subtype typing/detection: `src/app/components/grid-view.tsx`
- Thumbnail aliasing/defaults: `src/app/components/atlas-shared.ts`
- Parity and behavior tests around navigation/filtering/thumb aliases.

## Risks

- **ID drift risk:** frontend uses singular IDs and admin uses plural IDs; parity mappings must be updated together.
- **Filter mismatch risk:** adding nav nodes without `mapNavToGridFilters` and `GridView` updates causes dead filters.
- **Thumbnail fallback risk:** missing aliases can cause bark nodes to show unrelated fallback images.

## Validation

- Run focused tests for home mapping, navigation parity, profile sequencing, and thumbnail alias behavior.
- Confirm no type errors from added union members.
