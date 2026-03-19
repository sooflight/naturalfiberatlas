# Image Scout Robustness Upgrade: Design

**Date:** 2026-03-15  
**Status:** Implemented (scoped verification passed; full CI currently blocked by unrelated `admin-feature-flags` test failure)  
**Scope:** `src/app/components/admin/image-scout-panel.tsx` and supporting admin image workspace paths

---

## Overview

The current `ImageScoutPanel` in app code is functional but not robust. It relies on synthetic search results and lacks the resilience patterns present in the imported admin implementation.

This design upgrades scout behavior to a high-impact, low-regression architecture:
- Keep existing host integration contract and current workspace tab flow.
- Replace synthetic search with real provider-backed search + normalized results.
- Add resilient paging, de-duplication, partial-failure reporting, and stronger tests.

---

## Goals

1. Replace synthetic search results with real, provider-backed image search.
2. Preserve current workspace integration (`ImageWorkspaceShell`, `RapidScoutQueue`) without API breakage.
3. Improve reliability under network errors and multi-provider variance.
4. Increase confidence with targeted unit + integration tests.

---

## Non-Goals

- Full UI/UX parity transplant of `admin-package` `ImageScoutPanel` in one pass.
- Reworking unrelated admin tabs or changing atlas data schemas.
- Introducing backend services; solution remains frontend-only compatible.

---

## Current Pain Points

- Search uses `buildSyntheticResults()` rather than provider APIs.
- Provider select exists but does not drive real source behavior.
- No load-more/pagination model.
- Minimal error semantics (no partial-provider success model).
- Tests only cover upload drop path and miss core scouting flows.

---

## Proposed Architecture

### 1) Extract Search Engine from UI

Create a dedicated scout search module (app-local) and keep UI focused on interaction state.

**New module responsibilities:**
- Provider adapter orchestration (all-mode and single-provider mode).
- Query execution, pagination cursor/page state, exhaustion tracking.
- Normalization into a consistent result shape for panel rendering.
- De-duplication during merge/append.
- Lightweight error categorization for better operator feedback.

**Panel responsibilities:**
- Inputs, provider tabs/select, result grid, selection/staging, add actions.
- Calling search engine methods and rendering status states.

### 2) Maintain Existing Host Contract

Do not change current prop shape for app panel:
- `profileId`
- `existingImages`
- `onAddImages(images, mode)`

This avoids ripple changes in:
- `src/app/components/admin/image-workspace-shell.tsx`
- `src/app/components/admin/rapid-scout-queue.tsx`

### 3) Introduce Explicit Search Run State

Panel runtime should model:
- `idle`
- `searching`
- `partial` (some providers failed, some succeeded)
- `ready`
- `exhausted`
- `error`

This prevents ambiguous UI and supports operator trust.

---

## Data Flow

1. User enters query and triggers search.
2. Panel issues a run request with a run id (stale-response protection).
3. Search engine returns normalized results + continuation state.
4. Panel renders results and status badges/messages.
5. On `Load More`, panel requests continuation and appends unique results only.
6. Selection state stays stable across pagination and source changes.

---

## Reliability Rules

- **Stale run guard:** Ignore responses not matching latest run id.
- **Provider timeout:** Bounded timeout per provider request.
- **Retry policy:** One retry for transient failure classes.
- **Partial success policy:** Return successful provider results even if others fail.
- **Deterministic dedupe:** Canonical URL key with normalized comparison.

---

## Interaction/UX Decisions

- Keep current primary controls (`Search`, provider selector, `Add Direct`, `Upload & Add`).
- Preserve current IIIF and drag/drop affordances; route through normalized add path.
- Add `Load More` with exhaustion affordance.
- Keep manual search trigger as default (no auto search on every keypress by default).
- Enable duplicate-skip by default when adding images to avoid repetitive gallery entries.

---

## Test Strategy

### Panel Integration Tests

Expand `src/app/components/admin/image-scout-panel.test.tsx` to cover:
- Real search success rendering.
- Provider error + partial success messaging.
- Pagination + append + de-dup behavior.
- Stale response ignored when newer run completes.
- Queue progression only after successful add.
- URL drop vs file drop handling.
- IIIF manifest parse success/failure branch.

### Search Engine Unit Tests

New test file for module behavior:
- Normalization validity for each provider adapter.
- Continuation state transitions.
- Exhaustion determination logic.
- Error categorization and retry handling.
- URL canonicalization and dedupe correctness.

---

## Risks and Mitigations

- **Risk:** Provider schema mismatch at runtime.  
  **Mitigation:** strict normalization guards + fallback defaults + adapter tests.

- **Risk:** UI regressions while replacing synthetic flow.  
  **Mitigation:** preserve prop contract, keep visual structure, add integration tests first.

- **Risk:** Search latency in all-provider mode.  
  **Mitigation:** bounded parallelism + partial-result render + explicit loading indicators.

---

## Success Criteria

- Search returns real provider content (no synthetic URLs).
- Load-more works with no duplicate result cards.
- Failed providers do not block successful providers.
- Queue flow remains stable; advances only after successful add.
- New tests cover core scouting behavior and pass in CI.

---

## Files in Scope

**Modify:**
- `src/app/components/admin/image-scout-panel.tsx`
- `src/app/components/admin/image-scout-panel.test.tsx`

**Create (design target):**
- `src/app/components/admin/image-scout-search.ts`
- `src/app/components/admin/image-scout-search.test.ts`

**Reference only:**
- `admin-package/src/components/admin/ImageScoutPanel.tsx`
- `src/app/components/admin/image-workspace-shell.tsx`
- `src/app/components/admin/rapid-scout-queue.tsx`

