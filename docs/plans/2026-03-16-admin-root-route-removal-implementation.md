# Admin Root Route Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove `/admin` while keeping `/admin/:fiberId` and other admin deep-link routes functional.

**Architecture:** Route construction in `src/app/routes.ts` is the single source of truth for app paths. We will use test-first changes in `src/app/routes.test.ts` to lock desired behavior, then minimally update route definitions to satisfy tests without changing unrelated admin feature-flag behavior.

**Tech Stack:** React Router, TypeScript, Vitest

---

### Task 1: Encode desired route behavior in tests

**Files:**
- Modify: `src/app/routes.test.ts`
- Test: `src/app/routes.test.ts`

**Step 1: Write the failing test expectation changes**

- In the "includes admin routes when admin is enabled" test, remove expectation for `admin`.
- Keep expectations for `admin/:fiberId`, `admin/images`, `workbench`, `db`, and `canvas`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/routes.test.ts`  
Expected: FAIL because `routes.ts` still includes `admin`.

### Task 2: Update route construction to remove `/admin` root

**Files:**
- Modify: `src/app/routes.ts`
- Test: `src/app/routes.test.ts`

**Step 1: Write minimal implementation**

- Remove `{ path: "admin", lazy: loadAdminWorkbenchRoute }` from admin routes.
- Replace `{ path: "workbench", element: Navigate to /admin }` with `{ path: "workbench", lazy: loadAdminWorkbenchRoute }`.

**Step 2: Run tests to verify pass**

Run: `npm test -- src/app/routes.test.ts`  
Expected: PASS.

### Task 3: Guardrail assertions for alias behavior

**Files:**
- Modify: `src/app/routes.test.ts`
- Test: `src/app/routes.test.ts`

**Step 1: Update alias test to match new behavior**

- Replace expectation that `workbench` is a redirect-only route with expectation that it is lazy-loaded.

**Step 2: Re-run tests**

Run: `npm test -- src/app/routes.test.ts`  
Expected: PASS.
