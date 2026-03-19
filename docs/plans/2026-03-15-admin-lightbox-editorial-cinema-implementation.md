# Admin Lightbox Editorial Cinema Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a deep visual redesign of the Admin package lightbox while preserving existing navigation/crop workflows and callback contracts.

**Architecture:** Keep the current single-component `ImageLightbox` structure but introduce a clearer internal UI-state model for cinematic chrome visibility and crop-mode editing. Refine presentation and interaction layers in-place (top cluster, edge navigation, filmstrip dock) without changing integration props. Add focused tests for keyboard/ARIA and crop-mode safety behaviors.

**Tech Stack:** React, TypeScript, Tailwind utility classes, Vitest + React Testing Library

---

### Task 1: Add/extend Lightbox interaction tests

**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.parity.test.tsx` (if suitable)
- Or Create: `admin-package/src/components/admin/image-database/ImageLightbox.test.tsx`

**Step 1: Write failing test**
- Add tests for:
  - Crop mode toggle and action visibility
  - Keyboard navigation behavior (`ArrowLeft`, `ArrowRight`, `Escape`)
  - Navigation controls hidden while cropping

**Step 2: Run test to verify it fails**
- Run: `npm test -- ImageLightbox`
- Expected: FAIL due to missing updated DOM behaviors/selectors

**Step 3: Write minimal implementation**
- Add/adjust semantics and testable structure in `ImageLightbox.tsx`.

**Step 4: Run test to verify it passes**
- Run: `npm test -- ImageLightbox`
- Expected: PASS for new behavior tests

### Task 2: Implement Editorial Cinema visual redesign

**Files:**
- Modify: `admin-package/src/components/admin/image-database/ImageLightbox.tsx`

**Step 1: Introduce cinematic UI state**
- Track UI activity/hover mode and crop edit mode visual variants.

**Step 2: Refactor top controls**
- Replace full-width header feel with floating utility cluster.
- Include current image index and metadata in compact hierarchy.

**Step 3: Refactor navigation affordances**
- Add edge hit-zones and upgraded button styling.
- Keep arrow key behavior and click handlers unchanged.

**Step 4: Refactor bottom filmstrip dock**
- Upgrade thumbnail rail styling and active state emphasis.
- Keep click-to-jump and crop-cancel-on-switch behavior.

**Step 5: Enhance crop visual system**
- Improve handle visibility, ratio controls, and state clarity.
- Keep crop math and Cloudinary URL generation behavior unchanged.

### Task 3: Accessibility and reduced-motion pass

**Files:**
- Modify: `admin-package/src/components/admin/image-database/ImageLightbox.tsx`

**Step 1: Add/verify ARIA and labels**
- Improve labels for close/navigation/crop controls.
- Ensure current-position text is announced clearly.

**Step 2: Respect reduced motion**
- Gate non-essential transitions under `prefers-reduced-motion`.

**Step 3: Validate keyboard flow**
- Ensure focusable controls remain usable in both normal and crop modes.

### Task 4: Verify and finalize

**Files:**
- Modify: `admin-package/src/components/admin/image-database/ImageLightbox.tsx`
- Test: `admin-package` test targets

**Step 1: Run targeted tests**
- Run: `npm test -- ImageLightbox`
- Expected: PASS

**Step 2: Run broader admin test slice**
- Run: `npm test -- ImageDatabaseManager`
- Expected: PASS/no regressions in related behavior

**Step 3: Run lints for touched files**
- Use IDE diagnostics and fix introduced issues.
