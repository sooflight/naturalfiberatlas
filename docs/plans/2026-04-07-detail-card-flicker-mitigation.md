# Detail Card Flicker Mitigation Implementation Plan

**Goal:** Reduce intermittent detail-card flicker when opening a profile by stabilizing reveal timing and reducing early compositor pressure.

**Architecture:** Keep the current detail inhale lifecycle, but add two guardrails: (1) delay detail shell reveal until profile recede finishes, and (2) defer offscreen virtual detail-slot hydration during inhale phases, then fully hydrate at settled/idle. This preserves visual design while reducing one-frame overlap flashes and burst rasterization.

**Tech Stack:** React, TypeScript, Framer Motion (`motion/react`), Vitest, Playwright.

---

## File Structure

- `src/app/utils/detail-hydration.ts`
  - New utility module for deterministic detail-shell delay and virtual slot hydration gating.
- `src/app/utils/detail-hydration.test.ts`
  - Unit tests for timing and hydration gate logic.
- `src/app/components/grid-view.tsx`
  - Integrates new timing and hydration guards into detail-slot rendering transitions.

## Execution Tasks

### Task 1: Add deterministic hydration/timing utility

- [x] Add `computeDetailShellRevealDelay()` to synchronize reveal after profile recede.
- [x] Add `shouldHydrateDetailSlotDuringInhale()` to defer offscreen virtual detail slots during inhale.

### Task 2: Add unit tests for mitigation logic

- [x] Test non-virtual detail slots hydrate immediately.
- [x] Test offscreen virtual detail slots are deferred during inhale.
- [x] Test near-viewport virtual detail slots still hydrate during inhale.
- [x] Test virtual detail slots hydrate once lifecycle settles.
- [x] Test reveal-delay behavior for reduced-motion and non-reduced-motion modes.

### Task 3: Integrate mitigations in grid render path

- [x] Replace direct detail transition delay with `computeDetailShellRevealDelay(...)`.
- [x] Apply `shouldHydrateDetailSlotDuringInhale(...)` before mounting detail slots.
- [x] Update both virtual and non-virtual detail-slot branches to share the same reveal timing.

### Task 4: Verify regressions and interaction flow

- [x] Run: `npm run test -- src/app/utils/detail-hydration.test.ts`
- [x] Run: `npm run test -- src/app/components/grid-view.test.tsx src/app/utils/plate-layout.test.ts`
- [x] Run: `npx playwright test tests/profile-layout-shift.spec.ts --project=chromium --reporter=line`
- [x] Run: `npx playwright test tests/ui-ux-audit.spec.ts --project=chromium --grep "desktop" --reporter=line`

## Verification Notes

- Profile open layout-stability spec remains green.
- Desktop UI/UX audit remains green after changes.
- Existing unrelated regression remains red:
  - `tests/nav-filter-profile-regression.spec.ts` fails on missing `Plant Plant` button selector.
