# Image Scout Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring `src/app/components/admin` ImageScout behavior and UX to practical parity with `admin-package/src/components/admin/ImageScoutPanel.tsx` for high-throughput curation workflows.

**Architecture:** Keep current `ImageWorkspaceShell` tab model intact, but incrementally upgrade `image-scout-panel.tsx` and supporting modules. Implement parity in vertical slices (engine/data fidelity, workflow, UI power tools), with each slice shipped behind passing focused tests before moving to the next.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing `@/utils/imageSearch` provider layer, Cloudinary upload utilities

---

### Task 1: Baseline and Shared Types

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Create: `src/app/components/admin/image-scout-types.ts`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing test**

```ts
it("retains provider metadata for selected results", async () => {
  // search returns rights/license/attribution metadata
  // selecting + add should preserve metadata payload shape
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL because current model does not carry full metadata.

**Step 3: Write minimal implementation**

```ts
export interface ScoutMediaResult {
  url: string;
  provider: string;
  title: string;
  attribution?: string;
  rights?: string;
  licenseUrl?: string;
  width?: number;
  height?: number;
  tileSource?: string;
  sourceManifest?: string;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-types.ts src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "refactor: introduce typed scout media model for metadata fidelity"
```

---

### Task 2: Real IIIF Manifest Ingestion

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/image-scout-panel.test.tsx`
- Reference: `admin-package/src/utils/imageSearch.ts`

**Step 1: Write the failing tests**

```ts
it("fetches IIIF manifest and maps canvases to results", async () => {
  // mock fetchIIIFManifest response with 2 images
  // click Fetch => expect 2 real image cards
});

it("does not add raw manifest URL as an image result", async () => {
  // expect no card URL equals manifest URL when canvases exist
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL because current Add IIIF is synthetic URL insertion.

**Step 3: Write minimal implementation**

```ts
const data = await fetchIIIFManifest(manifestUrl);
const mapped = mapIiifResults(data, manifestUrl);
setResults(mapped);
setExhausted(true);
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: replace synthetic IIIF add with real manifest image ingestion"
```

---

### Task 3: Multi-Profile Targeting

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/image-workspace-shell.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("prompts for target profile when none selected", async () => {
  // open profile picker from action bar
  // choose profile => add callback uses chosen profile
});

it("keeps explicit target chip visible and clearable", async () => {
  // set target, clear target, verify UI + state
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL due single-profile-only behavior.

**Step 3: Write minimal implementation**

```ts
const [targetProfile, setTargetProfile] = useState<string | null>(activeProfileId ?? null);
// add profile picker + filter input
// route add actions through confirmed targetProfile
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-workspace-shell.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add multi-profile targeting and profile picker to scout actions"
```

---

### Task 4: Rapid Scout Queue UX Parity Slice

**Files:**
- Modify: `src/app/components/admin/rapid-scout-queue.tsx`
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Test: `src/app/components/admin/rapid-scout-queue.test.tsx` (create if missing)

**Step 1: Write the failing tests**

```ts
it("shows queue progress with active item and skip/back controls", async () => {
  // expect index indicator + progress bar + controls
});

it("auto-advances only on successful add", async () => {
  // reject add once => no advance
  // resolve add => advance
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/rapid-scout-queue.test.tsx`  
Expected: FAIL from missing enhanced queue behavior.

**Step 3: Write minimal implementation**

```ts
// add visual strip + progress fraction + completion summary
// keep success-gated advance semantics
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/rapid-scout-queue.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/rapid-scout-queue.tsx src/app/components/admin/image-scout-panel.tsx src/app/components/admin/rapid-scout-queue.test.tsx
git commit -m "feat: upgrade rapid scout queue controls and completion flow"
```

---

### Task 5: Result Context Menu + Power Actions

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Create: `src/app/components/admin/image-scout-context-menu.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("opens context menu on result and supports copy image/url", async () => {
  // right-click result
  // click copy actions
});

it("supports replace URL and updates selected result", async () => {
  // mock clipboard readText
  // replace action mutates url
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL because no result context menu exists.

**Step 3: Write minimal implementation**

```ts
// create menu state {x,y,imageUrl,index}
// actions: copy image, copy url, replace url, send to profile
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-context-menu.tsx src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add scout result context menu with copy and replace-url actions"
```

---

### Task 6: Scout Lightbox + Keyboard Navigation

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("opens lightbox and navigates with arrow keys", async () => {
  // open first result
  // ArrowRight => next result
});

it("space toggles selection inside lightbox", async () => {
  // open lightbox
  // press Space => selected count changes
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL due missing dedicated scout lightbox behavior.

**Step 3: Write minimal implementation**

```ts
// internal ScoutLightbox component with idx state
// key handlers: Escape/ArrowLeft/ArrowRight/Space
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add scout lightbox with keyboard navigation and selection toggles"
```

---

### Task 7: Upload Queue Panel and Retry UX

**Files:**
- Modify: `src/app/components/admin/cloudinary-dropzone.tsx`
- Create: `src/app/components/admin/scout-upload-queue-panel.tsx`
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("tracks dropped uploads with queued/uploading/done/failed states", async () => {
  // simulate file drop and partial failure
});

it("retries failed upload task and stages result on success", async () => {
  // retry button => successful stage
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL because no upload task queue UI/state.

**Step 3: Write minimal implementation**

```ts
type UploadTask = { id: string; label: string; status: "queued"|"uploading"|"done"|"failed"; error?: string; resultUrl?: string };
// render panel with retry + dismiss + clear finished
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/cloudinary-dropzone.tsx src/app/components/admin/scout-upload-queue-panel.tsx src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add scout upload queue with retry and task lifecycle visibility"
```

---

### Task 8: Existing Images Side Panel in Scout

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/image-workspace-shell.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("shows existing images panel with reorder/remove actions", async () => {
  // panel toggle opens existing images list
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL due no existing-image management panel.

**Step 3: Write minimal implementation**

```ts
// add left-side panel toggle
// render current profile metadata + existing images
// wire remove + reorder callbacks from shell
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-workspace-shell.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add scout-side existing images management panel"
```

---

### Task 9: Provider UX and Advanced Controls

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Test: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("renders provider pills with availability states", async () => {
  // unavailable providers show disabled affordance
});

it("shows advanced section collapsed by default", async () => {
  // IIIF/tools hidden until toggled
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL for current minimal provider select behavior.

**Step 3: Write minimal implementation**

```ts
// replace provider select with pills
// show configured count for all-sources mode
// add advanced tools disclosure panel
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: improve scout provider controls and advanced tools disclosure"
```

---

### Task 10: End-to-End Verification and Docs

**Files:**
- Modify: `README.md` (if user-visible workflow changed)
- Modify: `docs/plans/2026-03-16-image-scout-parity-implementation.md` (status notes)

**Step 1: Run scout-focused tests**

Run: `npm run test -- src/app/components/admin/image-scout-panel.test.tsx src/app/components/admin/rapid-scout-queue.test.tsx`  
Expected: PASS.

**Step 2: Run broader quality checks**

Run: `npm run typecheck && npm run build`  
Expected: PASS.

**Step 3: Run regression gate**

Run: `npm run test`  
Expected: PASS (or document unrelated pre-existing failures).

**Step 4: Update documentation**

```md
## Image Scout Parity Status
- Completed slices: IIIF, queue UX, context menu, lightbox, uploads
- Known follow-ups: [if any]
```

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-16-image-scout-parity-implementation.md
git commit -m "docs: record image scout parity rollout and verification status"
```

---

## Notes for Executor

- Keep each task small and independently shippable.
- Preserve backward compatibility of `ImageWorkspaceShell` tab flow.
- Prefer direct test assertions on behavior over snapshot-heavy tests.
- If repository is not git-initialized locally, skip commit steps and keep task boundaries in a changelog section.

---

## Implementation Status (2026-03-16)

- Completed in current session: Task 1 through Task 9.
- Implemented: real IIIF ingestion, metadata fidelity, multi-profile targeting, rapid queue upgrades, context menu actions, scout lightbox keyboard controls, upload queue with retry, existing-image remove/reorder actions, provider pills with advanced tools disclosure.
- Verification run:
  - `npm run test -- src/app/components/admin/image-scout-panel.test.tsx src/app/components/admin/rapid-scout-queue.test.tsx src/app/components/admin/image-workspace-shell.test.tsx` (pass)
  - `npm run typecheck` (pass)
  - `npm run build` (pass, with existing non-blocking chunking warnings)
