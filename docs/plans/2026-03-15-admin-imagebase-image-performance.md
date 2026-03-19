# Admin ImageBase Image Performance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Admin ImageBase previews load faster and scroll smoother by serving right-sized preview assets, improving load priority policy, and reducing decode/render overhead without changing full-resolution editing behavior.

**Architecture:** Introduce a small preview URL utility and evolve `LazyImage` into a smarter image primitive for admin surfaces. Route all preview call sites in `ImageDatabaseManager` and related tiles through this utility so card/list/grid views request optimized assets while lightbox/original actions remain untouched. Roll out in phased, test-first steps so behavior can be verified per change.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library

---

### Task 1: Add preview URL utility with safe fallback

**Files:**
- Create: `admin-package/src/components/admin/image-preview-utils.ts`
- Test: `admin-package/src/components/admin/image-preview-utils.test.ts`

**Step 1: Write the failing test**

Add tests that assert:
- transformed preview URL is produced for supported hosts/patterns
- fallback returns original URL for unknown/unsupported hosts
- function returns predictable size presets for list/grid/card contexts

**Step 2: Run test to verify it fails**

Run: `npm run test -- admin-package/src/components/admin/image-preview-utils.test.ts`  
Expected: FAIL because utility file/functions do not exist yet.

**Step 3: Write minimal implementation**

Implement utility functions:
- `buildPreviewImageSrc(url, preset)`
- `buildPreviewSrcSet(url, preset)`
- `getPreviewSizes(layoutMode, zoom)`
- `isTransformableImageHost(url)`

Include conservative fallback behavior to preserve existing rendering.

**Step 4: Run test to verify it passes**

Run: `npm run test -- admin-package/src/components/admin/image-preview-utils.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/image-preview-utils.ts admin-package/src/components/admin/image-preview-utils.test.ts
git commit -m "feat(admin): add preview image URL utility with safe fallback"
```

### Task 2: Upgrade `LazyImage` to support responsive/perf hints

**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.tsx`
- Test: `admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`

**Step 1: Write the failing test**

Add/extend tests that verify preview images can receive:
- `srcSet`
- `sizes`
- `decoding="async"`
- configurable `fetchPriority` / eager strategy for first viewport images

**Step 2: Run test to verify it fails**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`  
Expected: FAIL because current `LazyImage` does not expose/assert these props.

**Step 3: Write minimal implementation**

Refactor internal `LazyImage`:
- extend prop signature for responsive/perf attributes
- default `decoding="async"`
- preserve existing opacity transition behavior

**Step 4: Run test to verify it passes**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/ImageDatabaseManager.tsx admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx
git commit -m "feat(admin): extend LazyImage with responsive performance hints"
```

### Task 3: Route compact/list/grid previews through preview utility

**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.tsx`
- Test: `admin-package/src/components/admin/ImageDatabaseManager.parity.test.tsx`

**Step 1: Write the failing test**

Add assertions that in browse surfaces:
- preview tile uses utility-generated preview `src` (not raw original)
- lightbox/open actions still use original URL ordering

**Step 2: Run test to verify it fails**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.parity.test.tsx`  
Expected: FAIL because previews currently bind directly to raw URL.

**Step 3: Write minimal implementation**

Update preview call sites (`CompactProfileTile`, expanded image grid previews, and related preview blocks):
- use utility `src/srcSet/sizes`
- keep action handlers and state updates tied to original source URL arrays

**Step 4: Run test to verify it passes**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.parity.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/ImageDatabaseManager.tsx admin-package/src/components/admin/ImageDatabaseManager.parity.test.tsx
git commit -m "feat(admin): serve optimized preview sources in image browse surfaces"
```

### Task 4: Add above-the-fold eager policy for first paint

**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.tsx`
- Test: `admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`

**Step 1: Write the failing test**

Add tests that verify:
- first N visible preview images are marked eager/high-priority
- remaining previews stay lazy
- behavior differs correctly by compact/grid/list mode where needed

**Step 2: Run test to verify it fails**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`  
Expected: FAIL because no bounded eager strategy exists.

**Step 3: Write minimal implementation**

Implement a bounded eager policy:
- derive index-based threshold for above-the-fold previews
- set `loading="eager"` + `fetchPriority="high"` for early items only
- keep all remaining items `loading="lazy"`

**Step 4: Run test to verify it passes**

Run: `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add admin-package/src/components/admin/ImageDatabaseManager.tsx admin-package/src/components/admin/ImageDatabaseManager.view-mode.test.tsx
git commit -m "feat(admin): prioritize above-the-fold image previews"
```

### Task 5: Regressions + verification sweep

**Files:**
- Verify existing tests under: `admin-package/src/components/admin/*.test.tsx`

**Step 1: Run focused admin test set**

Run:
- `npm run test -- admin-package/src/components/admin/ImageDatabaseManager.*.test.tsx`
- `npm run test -- admin-package/src/components/admin/Library.integration.test.tsx`

Expected: PASS.

**Step 2: Run broader project verification**

Run:
- `npm run test`
- `npm run build`

Expected: PASS for both.

**Step 3: Manual smoke check (admin browse modes)**

Validate:
- first viewport images paint quickly
- scrolling stays smooth with larger profile sets
- lightbox still opens original assets correctly

**Step 4: Commit final verification/docs updates (if any)**

```bash
git add .
git commit -m "test(admin): verify image preview performance improvements across imagebase"
```
