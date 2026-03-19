# Profile Sequence Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure Admin left sidebar, ImageBase, Grid, Knowledge, and frontend-facing profile lists use one canonical sequence and isolate navigation-parent profiles into their own category.

**Architecture:** Use `useAtlasData().fiberIndex` / `dataSource.resolveFiberOrder` as the only ordering source. Add shared profile-sequencing helpers for parent-profile classification and canonical sorting. Update list builders to consume those helpers so all surfaces stay aligned.

**Tech Stack:** React, TypeScript, Vitest.

---

### Task 1: Add shared sequencing utilities
**Files:**
- Create: `src/app/data/profile-sequencing.ts`
- Test: `src/app/components/admin/library-profile-count-sync.test.ts`

### Task 2: Align Knowledge + Admin sidebar ordering
**Files:**
- Modify: `admin-package/src/components/admin/Library.tsx`
- Modify: `admin-package/src/components/admin/node-editor/NodeSidebar.tsx`
- Test: `src/app/components/admin/library-profile-count-sync.test.ts`

### Task 3: Align ImageBase ordering to canonical sequence
**Files:**
- Modify: `admin-package/src/components/admin/ImageDatabaseManager.tsx`
- Test: `admin-package/src/components/admin/ImageDatabaseManager.order.test.tsx`

### Task 4: Verification
**Files:**
- Verify: updated tests and lint on touched files.
