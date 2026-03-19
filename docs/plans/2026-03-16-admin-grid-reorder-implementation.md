# Admin Grid Reorder + 5:7 Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable drag-to-reorder in Admin Grid view with global master-sequence persistence, convert grid card media to a 5:7 ratio, and simplify the grid zoom control UI.

**Architecture:** `GridView` handles drag interaction and emits reorder intent, while `Library` computes and persists canonical order through `dataSource.setFiberOrder`. Visual updates are localized to card/media ratio and toolbar control markup. Tests cover callback behavior and global order writes.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library, existing `dataSource` ordering APIs.

---

### Task 1: GridView drag reorder contract

**Files:**
- Modify: `admin-package/src/components/admin/views/GridView.tsx`
- Test: `admin-package/src/components/admin/views/GridView.status.test.tsx`

**Step 1: Write the failing test**

- Add test for drag start + drop in `GridView.status.test.tsx`.
- Expect `onReorder` to be called with `draggedId` and `targetId`.
- Add test that self-drop does not call `onReorder`.

**Step 2: Run test to verify it fails**

Run:

`npm run test -- admin-package/src/components/admin/views/GridView.status.test.tsx`

Expected: failing assertions for missing reorder callback behavior.

**Step 3: Write minimal implementation**

- Add optional `onReorder?: (draggedId: string, targetId: string) => void` prop.
- Add local state for `draggedId` and `dropTargetId`.
- Mark tiles as `draggable` when reorder callback exists.
- Wire `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd`.
- Call `onReorder` only for valid id pair where ids differ.
- Add drag/drop visual classes.
- Change media area from `aspect-square` to `aspect-[5/7]`.

**Step 4: Run test to verify it passes**

Run:

`npm run test -- admin-package/src/components/admin/views/GridView.status.test.tsx`

Expected: all tests pass.

**Step 5: Commit**

`git add admin-package/src/components/admin/views/GridView.tsx admin-package/src/components/admin/views/GridView.status.test.tsx`

`git commit -m "feat(admin): support grid drag reorder and 5:7 cards"`

### Task 2: Library global order persistence + zoom UI simplification

**Files:**
- Modify: `admin-package/src/components/admin/Library.tsx`
- Test: `admin-package/src/components/admin/Library.integration.test.tsx`

**Step 1: Write the failing test**

- Mock `GridView` to expose and trigger `onReorder`.
- Mock `dataSource.setFiberOrder` and assert it receives reordered ids after simulated callback.

**Step 2: Run test to verify it fails**

Run:

`npm run test -- admin-package/src/components/admin/Library.integration.test.tsx`

Expected: missing reorder wiring / call assertions fail.

**Step 3: Write minimal implementation**

- Add `handleGridReorder(draggedId, targetId)` in `Library`.
- Build reordered ids from canonical `viewItems` order.
- Persist with `dataSource.setFiberOrder(nextOrder)`.
- Pass `onReorder={handleGridReorder}` into `GridView`.
- Simplify grid zoom controls to minimal minus-slider-plus UI while preserving bounds and steps.

**Step 4: Run test to verify it passes**

Run:

`npm run test -- admin-package/src/components/admin/Library.integration.test.tsx`

Expected: integration tests pass, including reorder assertion.

**Step 5: Commit**

`git add admin-package/src/components/admin/Library.tsx admin-package/src/components/admin/Library.integration.test.tsx`

`git commit -m "feat(admin): persist grid reorder globally and simplify zoom controls"`

### Task 3: Final verification

**Files:**
- Verify changed files only.

**Step 1: Run targeted tests**

Run:

`npm run test -- admin-package/src/components/admin/views/GridView.status.test.tsx admin-package/src/components/admin/Library.integration.test.tsx`

Expected: all green.

**Step 2: Run lint checks**

Run:

`npm run lint`

Expected: no new lint violations from edited files.

**Step 3: Manual behavior checks**

- Grid drag/drop reorders cards.
- Sequence/global order reflects new order in other Admin sequence surfaces.
- Grid cards visually render 5:7.
- Grid zoom control matches simplified UI.

**Step 4: Commit verification changes (if needed)**

`git add <any additional test tweaks>`

`git commit -m "test(admin): verify grid reorder flow"`
