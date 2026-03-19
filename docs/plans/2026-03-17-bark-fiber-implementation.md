# Bark Fiber Taxonomy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new `bark` subtype under `fiber > plant` across admin and frontend navigation, filtering, and taxonomy-tag path flows.

**Architecture:** Keep existing dual-ID strategy: frontend uses singular legacy IDs and admin taxonomy uses plural IDs. Add bark in both trees, then update mapping/alias layers that bridge those trees. Validate with focused parity and behavior tests.

**Tech Stack:** React, TypeScript, Vitest, existing atlas navigation + profile sequencing utilities.

---

### Task 1: Add failing parity and mapping coverage

**Files:**
- Modify: `src/app/pages/home.test.tsx`
- Modify: `src/app/data/navigation-parity.test.ts`
- Modify: `src/app/components/atlas-shared.test.ts`
- Modify: `src/app/data/profile-sequencing.test.ts`

**Step 1: Write the failing tests**
- Add expectations for `bark-fiber` mapping in home filter tests.
- Add `bark-fiber -> bark-fibers` in navigation parity equivalence assertions.
- Add thumbnail alias resolution test for `bark-fiber` from admin `bark-fibers`.
- Add profile sequencing order assertion including `bark-fibers`.

**Step 2: Run tests to verify failure**

Run:
- `npm test -- src/app/pages/home.test.tsx`
- `npm test -- src/app/data/navigation-parity.test.ts`
- `npm test -- src/app/components/atlas-shared.test.ts`
- `npm test -- src/app/data/profile-sequencing.test.ts`

Expected: failures referencing missing bark IDs/mappings.

**Step 3: Commit checkpoint**
- Commit message (example): `test: add bark-fiber coverage across navigation parity layers`

### Task 2: Implement minimal bark taxonomy additions

**Files:**
- Modify: `src/app/data/atlas-navigation.ts`
- Modify: `src/app/data/admin/atlas-navigation.ts`
- Modify: `src/app/pages/home.tsx`
- Modify: `src/app/components/grid-view.tsx`
- Modify: `src/app/components/atlas-shared.ts`

**Step 1: Implement minimal code**
- Add frontend node `bark-fiber` under `plant`.
- Add admin node `bark-fibers` under `plant-cellulose`.
- Extend `GridFiberSubcategory`/`externalFiberSubcategory` unions with `bark-fiber`.
- Update `mapNavToGridFilters` plant subtype list to include `bark-fiber`.
- Update `getPlantFiberSubtype` to detect bark fibers.
- Add default thumbnail IDs and admin alias mapping for bark.

**Step 2: Run focused tests**

Run:
- `npm test -- src/app/pages/home.test.tsx`
- `npm test -- src/app/data/navigation-parity.test.ts`
- `npm test -- src/app/components/atlas-shared.test.ts`
- `npm test -- src/app/data/profile-sequencing.test.ts`

Expected: all pass.

**Step 3: Run lint checks on edited files**

Run:
- Read lints for edited files and resolve any introduced issues.

**Step 4: Commit checkpoint**
- Commit message (example): `feat: add bark subtype across atlas plant taxonomy`

### Task 3: Verify no bark regressions in admin tag flows

**Files:**
- Modify (if needed): `src/app/components/admin/ImageDatabaseManager.tags.test.tsx`
- Modify (if needed): `src/app/components/admin/ImageScoutPanel.behavior.test.tsx`

**Step 1: Validate existing behavior**
- Confirm current tag-tree construction already supports new paths from `allTagPaths`.
- Add/adjust bark expectations only if tests indicate a gap.

**Step 2: Run targeted tests**

Run:
- `npm test -- src/app/components/admin/ImageDatabaseManager.tags.test.tsx`
- `npm test -- src/app/components/admin/ImageScoutPanel.behavior.test.tsx`

Expected: pass, including bark where applicable.

**Step 3: Final verification**
- Re-run all bark-related tests touched in Tasks 1-3.
- Ensure no introduced lint errors.

