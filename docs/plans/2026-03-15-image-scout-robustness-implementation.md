# Image Scout Robustness Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace synthetic Image Scout behavior with resilient provider-backed search, pagination, dedupe, and robust test coverage while preserving current workspace integration.

**Architecture:** Keep `ImageScoutPanel` as the UI shell and move network/provider logic into a dedicated search engine module. Use test-first implementation for each reliability layer (normalization, paging, stale-run protection, partial failures), then wire panel state to the new module without breaking existing panel props.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing app admin components

---

### Task 1: Create Scout Search Engine Module

**Files:**
- Create: `src/app/components/admin/image-scout-search.ts`
- Test: `src/app/components/admin/image-scout-search.test.ts`
- Reference: `admin-package/src/components/admin/ImageScoutPanel.tsx`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  canonicalizeImageUrl,
  mergeUniqueResults,
  createScoutRunState,
} from "./image-scout-search";

describe("image-scout-search", () => {
  it("canonicalizeImageUrl normalizes host/query noise", () => {
    expect(canonicalizeImageUrl("HTTPS://EXAMPLE.com/a.jpg?utm=1")).toBe("https://example.com/a.jpg");
  });

  it("mergeUniqueResults appends only unseen urls", () => {
    const prev = [{ imageUrl: "https://x/a.jpg", title: "a" }];
    const next = [
      { imageUrl: "https://x/a.jpg?utm=1", title: "dup" },
      { imageUrl: "https://x/b.jpg", title: "b" },
    ];
    const merged = mergeUniqueResults(prev as any, next as any);
    expect(merged).toHaveLength(2);
  });

  it("createScoutRunState increments run id for stale guard", () => {
    const s1 = createScoutRunState();
    const s2 = createScoutRunState(s1);
    expect(s2.runId).toBe(s1.runId + 1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/image-scout-search.test.ts`  
Expected: FAIL with module/function not found.

**Step 3: Write minimal implementation**

```ts
export function canonicalizeImageUrl(input: string): string {
  try {
    const u = new URL(input.trim());
    u.hash = "";
    const params = new URLSearchParams(u.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => params.delete(k));
    u.search = params.toString() ? `?${params.toString()}` : "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return input.trim().toLowerCase();
  }
}

export function mergeUniqueResults<T extends { imageUrl: string }>(prev: T[], next: T[]): T[] {
  const seen = new Set(prev.map((r) => canonicalizeImageUrl(r.imageUrl)));
  const out = [...prev];
  for (const item of next) {
    const key = canonicalizeImageUrl(item.imageUrl);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function createScoutRunState(prev?: { runId: number }) {
  return { runId: (prev?.runId ?? 0) + 1 };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/image-scout-search.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-search.ts src/app/components/admin/image-scout-search.test.ts
git commit -m "test: add scout search engine core normalization and dedupe utilities"
```

---

### Task 2: Add Provider Execution + Pagination State

**Files:**
- Modify: `src/app/components/admin/image-scout-search.ts`
- Modify: `src/app/components/admin/image-scout-search.test.ts`

**Step 1: Write the failing tests**

```ts
it("returns partial success when one provider fails", async () => {
  const out = await runScoutSearch({
    query: "hemp",
    provider: "all",
    adapters: {
      openverse: async () => [{ imageUrl: "https://x/1.jpg", title: "ok" }],
      wikimedia: async () => {
        throw new Error("timeout");
      },
    },
  } as any);
  expect(out.results.length).toBe(1);
  expect(out.status).toBe("partial");
  expect(out.providerErrors.wikimedia).toMatch(/timeout/i);
});

it("marks exhausted when all providers done", async () => {
  const out = await runScoutSearch({
    query: "hemp",
    provider: "all",
    adapters: {
      openverse: async () => [],
      wikimedia: async () => [],
    },
  } as any);
  expect(out.exhausted).toBe(true);
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/image-scout-search.test.ts`  
Expected: FAIL with missing `runScoutSearch`.

**Step 3: Write minimal implementation**

```ts
export async function runScoutSearch(opts: any) {
  const providers = opts.provider === "all" ? Object.keys(opts.adapters) : [opts.provider];
  const providerErrors: Record<string, string> = {};
  let results: any[] = [];
  let exhausted = true;

  for (const id of providers) {
    try {
      const batch = await opts.adapters[id](opts);
      if (Array.isArray(batch) && batch.length > 0) exhausted = false;
      results = mergeUniqueResults(results, Array.isArray(batch) ? batch : []);
    } catch (err: any) {
      providerErrors[id] = err?.message || "provider failed";
    }
  }

  const hasErrors = Object.keys(providerErrors).length > 0;
  const status = hasErrors && results.length > 0 ? "partial" : hasErrors ? "error" : "ready";
  return { results, status, exhausted, providerErrors };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/image-scout-search.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-search.ts src/app/components/admin/image-scout-search.test.ts
git commit -m "feat: add provider fanout and partial-failure search handling"
```

---

### Task 3: Wire Panel to Search Engine (Replace Synthetic Results)

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/image-scout-panel.test.tsx`
- Reference: `src/app/components/admin/image-workspace-shell.tsx`
- Reference: `src/app/components/admin/rapid-scout-queue.tsx`

**Step 1: Write the failing integration tests**

```ts
it("shows real search results and not synthetic URLs", async () => {
  // mock engine return
  // render panel
  // click Search
  // expect card with provided title/url
  // expect no images.example.com URL usage
});

it("ignores stale run results when latest run completes first", async () => {
  // run A resolves late, run B resolves early
  // expect UI shows run B results only
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL because panel still uses `buildSyntheticResults`.

**Step 3: Write minimal implementation**

```ts
// remove buildSyntheticResults usage
// add search engine import
// maintain existing prop contract
// add runId guard:
const runRef = useRef(0);
const onSearch = async () => {
  const runId = ++runRef.current;
  setStatus("searching");
  const out = await runScoutSearch(...);
  if (runId !== runRef.current) return;
  setResults(out.results);
  setStatus(out.status);
  setExhausted(out.exhausted);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: wire image scout panel to robust provider-backed search flow"
```

---

### Task 4: Add Load More, Exhaustion, and Deduped Append

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("appends next page results and dedupes by canonical URL", async () => {
  // search returns page 1
  // load more returns duplicate + new
  // expect only new appended
});

it("shows exhausted state when no more provider data", async () => {
  // load more returns empty/all exhausted
  // expect load more hidden/disabled and exhausted message visible
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL on missing load-more state behavior.

**Step 3: Write minimal implementation**

```ts
const [exhausted, setExhausted] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);

const onLoadMore = async () => {
  if (loadingMore || exhausted) return;
  setLoadingMore(true);
  const out = await runScoutSearch({ ...state, mode: "append" });
  setResults((prev) => mergeUniqueResults(prev, out.results));
  setExhausted(out.exhausted);
  setLoadingMore(false);
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx
git commit -m "feat: add deduped load-more pagination and exhaustion state to image scout"
```

---

### Task 5: Strengthen Add Flow + Duplicate Skip + Queue Safety

**Files:**
- Modify: `src/app/components/admin/image-scout-panel.tsx`
- Modify: `src/app/components/admin/rapid-scout-queue.tsx` (only if queue needs explicit success check)
- Modify: `src/app/components/admin/image-scout-panel.test.tsx`

**Step 1: Write the failing tests**

```ts
it("skips URLs already in existingImages by default on add", async () => {
  // existing has a.jpg, selected has a.jpg + b.jpg
  // expect onAddImages called with only b.jpg
});

it("queue advances only after successful add callback", async () => {
  // mock onAddImages reject once
  // expect queue index unchanged and error shown
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: FAIL on duplicate skip and queue-success gating.

**Step 3: Write minimal implementation**

```ts
const existingUrlSet = useMemo(
  () => new Set(existingImages.map((x) => canonicalizeImageUrl(x.url))),
  [existingImages],
);

const selectedResults = useMemo(
  () => results.filter((r) => selected.has(r.url) && !existingUrlSet.has(canonicalizeImageUrl(r.url))),
  [results, selected, existingUrlSet],
);

// add handlers:
try {
  await Promise.resolve(onAddImages(images, mode));
  // only then clear + advance
} catch {
  // preserve selection and surface error state
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/components/admin/image-scout-panel.tsx src/app/components/admin/image-scout-panel.test.tsx src/app/components/admin/rapid-scout-queue.tsx
git commit -m "fix: harden add/queue flow with duplicate-skip and success-gated progression"
```

---

### Task 6: Verification, Lint, and Documentation Sync

**Files:**
- Modify: `README.md` (if behavior or setup notes changed)
- Modify: `docs/plans/2026-03-15-image-scout-robustness-design.md` (status update only)

**Step 1: Run focused tests**

Run: `npm test -- src/app/components/admin/image-scout-search.test.ts src/app/components/admin/image-scout-panel.test.tsx`  
Expected: PASS.

**Step 2: Run quality checks**

Run: `npm run typecheck && npm run build`  
Expected: PASS with no new type/build errors.

**Step 3: Run lints/diagnostics for changed files**

Run: `npm run ci:verify`  
Expected: PASS (or document pre-existing failures outside modified scope).

**Step 4: Update docs status**

```md
**Status:** Implemented and Verified
```

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-15-image-scout-robustness-design.md
git commit -m "docs: finalize image scout robustness verification notes"
```

---

## Notes for Executor

- Keep edits ASCII-only.
- Do not alter panel prop contracts consumed by workspace shell unless explicitly required.
- Prefer additive, low-regression changes over broad UI rewrite.
- If an adapter/provider is unavailable at runtime, degrade gracefully and keep panel usable.
- Use `@superpowers/test-driven-development` rigor while implementing each task.

