# Atlas Search Lag Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce search typing lag in the Atlas frontend without changing visible search behavior.

**Architecture:** Remove debug network logging from search hot paths and defer filter evaluation in `GridView` so input stays responsive while results update asynchronously. Keep existing data flow (`TopNav` -> `HomePage` -> `GridView`) intact.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library.

---

### Task 1: Add regression test for external search filtering

**Files:**
- Modify: `src/app/components/grid-view.test.tsx`
- Test: `src/app/components/grid-view.test.tsx`

**Step 1: Write the failing test**
- Add a test that renders `GridView` with `hideHeader` and a non-empty `externalSearch`.
- Assert at least one known matching profile card appears and a non-matching card is not rendered.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/grid-view.test.tsx`  
Expected: FAIL before implementation updates (if filtering timing logic changes behavior unexpectedly).

**Step 3: Write minimal implementation**
- Update `GridView` to use deferred query in filtering logic, preserving current match behavior.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/grid-view.test.tsx`  
Expected: PASS.

### Task 2: Remove search-path debug network instrumentation

**Files:**
- Modify: `src/app/components/top-nav.tsx`
- Modify: `src/app/components/grid-view.tsx`
- Modify: `src/app/pages/home.tsx`

**Step 1: Write the failing test**
- Keep the regression test from Task 1 as guardrail for functional behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/grid-view.test.tsx`  
Expected: Still provides functional guardrail while code changes.

**Step 3: Write minimal implementation**
- Remove inline `fetch(...)` debug logging in input/effect/filter paths.
- Keep existing `setSearch` and callback wiring unchanged.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/grid-view.test.tsx`  
Expected: PASS.

**Step 5: Verify with lints**

Run: lint checks on modified files.  
Expected: No new lint errors.
