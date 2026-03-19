# Profile Status Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify Profile Live/Draft behavior behind one status model and one status service, with canonical `material_passports.status` as primary source of truth and strict `published` => Live semantics.

**Architecture:** Add a shared profile-status domain module that centralizes status derivation, toggle mapping, optimistic mutation, and fallback read behavior. Refactor all admin consumers (`ImageDatabaseManager`, `Library`, `NodeSidebar`, `GridView`) to use that module instead of local ad-hoc status logic. Keep a temporary compatibility read fallback (`MATERIAL_PASSPORTS` + local overrides), then remove it after instrumentation confirms canonical reads are stable.

**Tech Stack:** React, TypeScript, Vitest, Vite admin routes, canonical admin API endpoints

---

### Task 1: Introduce shared Profile status domain primitives

**Files:**
- Create: `admin-package/src/domain/profile-status/model.ts`
- Test: `admin-package/src/domain/profile-status/model.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import {
  isProfileLive,
  toDisplayProfileState,
  normalizeProfileStatus,
  nextToggleStatus,
} from "./model";

describe("profile-status model", () => {
  it("treats only published as live", () => {
    expect(isProfileLive("published")).toBe(true);
    expect(isProfileLive("draft")).toBe(false);
    expect(isProfileLive("reviewed")).toBe(false);
    expect(isProfileLive(undefined)).toBe(false);
  });

  it("maps any non-published state to draft display", () => {
    expect(toDisplayProfileState("published")).toBe("live");
    expect(toDisplayProfileState("verified")).toBe("draft");
    expect(toDisplayProfileState(null)).toBe("draft");
  });

  it("normalizes unknown values to draft", () => {
    expect(normalizeProfileStatus("published")).toBe("published");
    expect(normalizeProfileStatus("reviewed")).toBe("reviewed");
    expect(normalizeProfileStatus("")).toBe("draft");
    expect(normalizeProfileStatus(undefined)).toBe("draft");
  });

  it("toggles status between published and draft", () => {
    expect(nextToggleStatus("published")).toBe("draft");
    expect(nextToggleStatus("verified")).toBe("published");
    expect(nextToggleStatus(undefined)).toBe("published");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd "admin-package" && npm run test -- src/domain/profile-status/model.test.ts`  
Expected: FAIL with module-not-found / missing exports.

**Step 3: Write minimal implementation**

```ts
export type ProfileStatus = string;
export type ProfileDisplayState = "live" | "draft";

export function normalizeProfileStatus(status: string | null | undefined): ProfileStatus {
  if (!status || typeof status !== "string") return "draft";
  return status;
}

export function isProfileLive(status: string | null | undefined): boolean {
  return normalizeProfileStatus(status) === "published";
}

export function toDisplayProfileState(status: string | null | undefined): ProfileDisplayState {
  return isProfileLive(status) ? "live" : "draft";
}

export function nextToggleStatus(status: string | null | undefined): ProfileStatus {
  return isProfileLive(status) ? "draft" : "published";
}
```

**Step 4: Run test to verify it passes**

Run: `cd "admin-package" && npm run test -- src/domain/profile-status/model.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/domain/profile-status/model.ts admin-package/src/domain/profile-status/model.test.ts
git commit -m "refactor: centralize profile status derivation primitives"
```

---

### Task 2: Introduce shared status repository/service with canonical-first reads

**Files:**
- Create: `admin-package/src/domain/profile-status/repository.ts`
- Create: `admin-package/src/domain/profile-status/useProfileStatusStore.ts`
- Modify: `admin-package/src/utils/adminStatusApi.ts`
- Test: `admin-package/src/domain/profile-status/useProfileStatusStore.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { resolveEffectiveStatus } from "./repository";

describe("profile-status repository", () => {
  it("prefers override, then canonical, then fallback", () => {
    const status = resolveEffectiveStatus({
      profileId: "hemp",
      overrides: { hemp: "draft" },
      canonicalById: new Map([["hemp", "published"]]),
      fallbackById: { hemp: "verified" },
    });
    expect(status).toBe("draft");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd "admin-package" && npm run test -- src/domain/profile-status/useProfileStatusStore.test.ts`  
Expected: FAIL due to missing repository/store module.

**Step 3: Write minimal implementation**

```ts
// repository.ts
export function resolveEffectiveStatus(input: {
  profileId: string;
  overrides: Record<string, string>;
  canonicalById: Map<string, string>;
  fallbackById: Record<string, string | undefined>;
}): string {
  return (
    input.overrides[input.profileId] ??
    input.canonicalById.get(input.profileId) ??
    input.fallbackById[input.profileId] ??
    "draft"
  );
}
```

```ts
// useProfileStatusStore.ts (shape)
export function useProfileStatusStore() {
  // exposes:
  // getStatus(profileId), isSaving(profileId), getError(profileId), toggle(profileId)
}
```

Also add one `readPassportStatuses` helper in `adminStatusApi.ts` that calls canonical endpoint when `VITE_CANONICAL_ADMIN_API=true`.

**Step 4: Run tests**

Run:
- `cd "admin-package" && npm run test -- src/domain/profile-status/useProfileStatusStore.test.ts`
- `cd "admin-package" && npm run test -- src/utils/adminStatusApi.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/domain/profile-status/repository.ts admin-package/src/domain/profile-status/useProfileStatusStore.ts admin-package/src/utils/adminStatusApi.ts admin-package/src/domain/profile-status/useProfileStatusStore.test.ts
git commit -m "feat: add canonical-first profile status store"
```

---

### Task 3: Refactor ImageDatabaseManager to consume shared status store

**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.tsx`
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.status.test.tsx`

**Step 1: Write failing test**

Add test that verifies:
- component does not implement bespoke `isProfileLive` logic inline
- toggle delegates to store action once
- error/saving are read from shared store selectors

**Step 2: Run test to verify it fails**

Run: `cd "admin-package" && npm run test -- src/components/admin/ImageDatabaseManager.status.test.tsx`  
Expected: FAIL until component is wired to new store.

**Step 3: Implement minimal refactor**

Replace local state:
- `profileStatusOverrides`
- `profileStatusSaving`
- `profileStatusErrors`
- request-version refs

with shared hook usage:

```ts
const statusStore = useProfileStatusStore();
const status = statusStore.getStatus(profileId);
const isSaving = statusStore.isSaving(profileId);
const error = statusStore.getError(profileId);
const onToggle = () => statusStore.toggle(profileId);
```

Remove duplicate status helper definitions from this file and import from `domain/profile-status/model`.

**Step 4: Re-run tests**

Run: `cd "admin-package" && npm run test -- src/components/admin/ImageDatabaseManager.status.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/ImageDatabaseManager.tsx admin-package/src/components/admin/ImageDatabaseManager.status.test.tsx
git commit -m "refactor: route image manager status through shared store"
```

---

### Task 4: Refactor Library and NodeSidebar to shared store

**Files:**
- Modify: `admin-package/src/components/admin/Library.tsx`
- Modify: `admin-package/src/components/admin/node-editor/NodeSidebar.tsx`
- Modify: `admin-package/src/components/admin/views/GridView.tsx` (consume derived model helpers only)
- Test: `admin-package/src/components/admin/views/GridView.status.test.tsx`
- Test: `admin-package/src/components/admin/node-editor/NodeSidebar.knowledge.test.tsx`

**Step 1: Write failing tests**

Add assertions that both surfaces:
- render same live/draft semantics from shared model
- use shared toggle action path
- keep accessibility behavior (`role="switch"`, `aria-checked`)

**Step 2: Run tests to verify failure**

Run:
- `cd "admin-package" && npm run test -- src/components/admin/views/GridView.status.test.tsx`
- `cd "admin-package" && npm run test -- src/components/admin/node-editor/NodeSidebar.knowledge.test.tsx`

Expected: FAIL before refactor.

**Step 3: Implement minimal code**

- Remove per-component `profileStatusOverrides/saving/errors` maps.
- Read status and actions from `useProfileStatusStore`.
- Keep display logic only via `isProfileLive(status)` from domain model.

**Step 4: Re-run tests**

Run same commands as Step 2.  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/Library.tsx admin-package/src/components/admin/node-editor/NodeSidebar.tsx admin-package/src/components/admin/views/GridView.tsx admin-package/src/components/admin/views/GridView.status.test.tsx admin-package/src/components/admin/node-editor/NodeSidebar.knowledge.test.tsx
git commit -m "refactor: unify library and node sidebar profile status behavior"
```

---

### Task 5: Consolidate persistence and deprecate localStorage overrides

**Files:**
- Modify: `admin-package/src/utils/passportStatusOverrides.ts`
- Modify: `admin-package/src/domain/profile-status/useProfileStatusStore.ts`
- Test: `admin-package/src/domain/profile-status/useProfileStatusStore.test.ts`

**Step 1: Write failing test**

Add a test asserting:
- when canonical fetch succeeds, localStorage overrides are ignored for reads
- write path does not persist localStorage unless fallback mode is enabled

**Step 2: Run test to verify failure**

Run: `cd "admin-package" && npm run test -- src/domain/profile-status/useProfileStatusStore.test.ts`  
Expected: FAIL before behavior change.

**Step 3: Implement minimal behavior**

- Add a feature-flagged compatibility mode:
  - default: canonical-first, no override persistence
  - temporary fallback: allow local override read/write
- Add warning log for fallback hits so removal is data-driven.

**Step 4: Re-run test**

Run: `cd "admin-package" && npm run test -- src/domain/profile-status/useProfileStatusStore.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/utils/passportStatusOverrides.ts admin-package/src/domain/profile-status/useProfileStatusStore.ts admin-package/src/domain/profile-status/useProfileStatusStore.test.ts
git commit -m "chore: gate local status overrides behind compatibility mode"
```

---

### Task 6: Tighten backend status contract and add read endpoint adapter

**Files:**
- Modify: `admin-package/vite.config.ts`
- Modify: `admin-package/src/utils/adminStatusApi.ts`
- Test: `admin-package/src/utils/adminStatusApi.test.ts`

**Step 1: Write failing tests**

Add tests for:
- `readPassportStatuses` returns `{ [id]: status }` map
- invalid status updates are rejected and surfaced consistently
- canonical route prefixing behavior is respected

**Step 2: Run tests to verify failure**

Run: `cd "admin-package" && npm run test -- src/utils/adminStatusApi.test.ts`  
Expected: FAIL for missing endpoint adapter.

**Step 3: Implement minimal backend adapter**

- Add an endpoint in admin dev server for reading passport status map (if missing).
- Keep `update-passport-status` allowed values aligned with model.
- Ensure API helpers expose one read + one mutate contract for status.

**Step 4: Re-run tests**

Run: `cd "admin-package" && npm run test -- src/utils/adminStatusApi.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/vite.config.ts admin-package/src/utils/adminStatusApi.ts admin-package/src/utils/adminStatusApi.test.ts
git commit -m "feat: unify profile status read and update api contracts"
```

---

### Task 7: Enforce published-only frontend visibility (non-admin atlas)

**Files:**
- Modify: `src/components/pages/Index.tsx`
- Modify: `src/components/pages/Index.behavior.test.ts`

**Step 1: Write failing test**

Add case:
- non-edit mode only includes profiles with `status === "published"`
- edit/admin mode still includes all statuses

**Step 2: Run test to verify failure**

Run: `npm run test -- src/components/pages/Index.behavior.test.ts`  
Expected: FAIL under current non-strict filtering.

**Step 3: Implement minimal filter**

Use strict gate in non-edit path:

```ts
const visible = isEditMode
  ? profiles
  : profiles.filter((p) => p.status === "published");
```

**Step 4: Re-run test**

Run: `npm run test -- src/components/pages/Index.behavior.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/pages/Index.tsx src/components/pages/Index.behavior.test.ts
git commit -m "fix: gate atlas public profile visibility to published only"
```

---

### Task 8: Regression, lint, and migration cleanup checkpoint

**Files:**
- Modify (if needed): `admin-package/docs/plans/2026-02-28-profile-live-draft-signal-design.md` (note canonical-first completion)
- Modify (if needed): `README.md` / admin docs where status behavior is described

**Step 1: Run focused tests**

Run:
- `cd "admin-package" && npm run test -- src/components/admin/ImageDatabaseManager.status.test.tsx`
- `cd "admin-package" && npm run test -- src/components/admin/views/GridView.status.test.tsx`
- `cd "admin-package" && npm run test -- src/components/admin/node-editor/NodeSidebar.knowledge.test.tsx`
- `cd "admin-package" && npm run test -- src/domain/profile-status/useProfileStatusStore.test.ts`
- `npm run test -- src/components/pages/Index.behavior.test.ts`

Expected: PASS.

**Step 2: Run lint on touched files**

Run:
- `cd "admin-package" && npm run lint -- src/domain/profile-status/model.ts src/domain/profile-status/repository.ts src/domain/profile-status/useProfileStatusStore.ts src/components/admin/ImageDatabaseManager.tsx src/components/admin/Library.tsx src/components/admin/node-editor/NodeSidebar.tsx src/components/admin/views/GridView.tsx src/utils/adminStatusApi.ts`
- `npm run lint -- src/components/pages/Index.tsx src/components/pages/Index.behavior.test.ts`

Expected: No new lint errors.

**Step 3: Remove obsolete duplicate helpers (if all consumers migrated)**

Delete now-unused helper implementations and dead local state paths discovered by TypeScript.

**Step 4: Commit**

```bash
git add .
git commit -m "chore: finalize profile status unification and remove duplicate logic"
```

---

### Task 9: Final verification and handoff

**Files:**
- No code changes expected unless failures are found

**Step 1: Full verification**

Run:
- `cd "admin-package" && npm run test`
- `npm run test`

Expected: PASS, or explicitly record unrelated pre-existing failures.

**Step 2: Release notes**

Document:
- Live means exactly `published`.
- One shared status store now powers all admin status UI.
- Canonical DB status is primary read source.
- Public Atlas shows `published` profiles only.

**Step 3: Handoff evidence**

Run:
- `git status`
- `git log --oneline -n 12`

Expected: Clean staged history with scoped commits matching tasks above.
