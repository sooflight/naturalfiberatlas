# Admin Profiles Row Drop Upload Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add row-targeted drag/drop image upload in Admin Profiles so dropped images are uploaded to Cloudinary and appended to that profile gallery.

**Architecture:** Extend `AdminWorkspace` profile rows with drag/drop handlers and per-row transient UI state. Reuse existing Cloudinary runtime utilities and atlas data context mutations. Verify behavior via `admin-workspace` component test with mocked Cloudinary/runtime services.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing Atlas data context + Cloudinary runtime.

---

### Task 1: Add failing drop-upload test

**Files:**
- Modify: `src/app/components/admin/admin-workspace.test.tsx`
- Test: `src/app/components/admin/admin-workspace.test.tsx`

**Step 1: Write the failing test**

Add a test that:
- renders `AdminWorkspace`
- drops an image file onto the "Cotton" profile row
- expects `uploadImageFilesToCloudinary` called
- expects `updateFiber("cotton", { galleryImages: [...] })` called with appended URLs

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/admin-workspace.test.tsx`
Expected: FAIL due to missing row drop/upload behavior.

**Step 3: Write minimal implementation**

Implement row drag/drop in `admin-workspace.tsx`:
- add row drag-over/upload state
- add file filter helper
- call Cloudinary upload runtime
- append to current `galleryImages`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/admin-workspace.test.tsx`
Expected: PASS.

**Step 5: Commit**

Skip commit unless explicitly requested by user.

### Task 2: Regressions and lint verification

**Files:**
- Modify: `src/app/components/admin/admin-workspace.tsx` (if needed)
- Modify: `src/app/components/admin/admin-workspace.test.tsx` (if needed)

**Step 1: Run targeted tests**

Run:
- `npm test -- src/app/components/admin/admin-workspace.test.tsx`

Expected: PASS with no regressions in that suite.

**Step 2: Run lints for touched files**

Use diagnostics to verify no new lint errors in modified files.

**Step 3: Fix any issues**

Apply minimal corrections until test and lint outputs are clean.

**Step 4: Final verification**

Re-run:
- `npm test -- src/app/components/admin/admin-workspace.test.tsx`

Expected: PASS.

**Step 5: Commit**

Skip commit unless explicitly requested by user.

