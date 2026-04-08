# Data publishing architecture (GitHub as source of truth)

This document defines how **publishable atlas data** flows from editing to **GitHub** and then to **Vercel**. It complements [Data freshness runbook](../runbooks/data-freshness.md), which covers caches and recovery.

## Principles

1. **Canonical store for the public catalog** — Git: TypeScript + JSON under this repo that the production build bundles.
2. **Draft layer** — Browser `localStorage` (`atlas:*`) and admin-only keys are **not** published until promoted into Git.
3. **Remote services** (material APIs, Upstash Redis) are **not** the static catalog’s database; they cache or power separate workflows.

## Tier A — Published catalog (must be in Git)

| Artifact | Path | Role |
|----------|------|------|
| Fiber profiles | [`src/app/data/fibers.ts`](../../src/app/data/fibers.ts) | Core `FiberProfile` list |
| Supplementary tables | [`src/app/data/atlas-data.ts`](../../src/app/data/atlas-data.ts) | `worldNames`, `processData`, `anatomyData`, `careData`, `quoteData`, gallery maps |
| Bulk gallery URLs | [`new-images.json`](../../new-images.json) | Per-profile `imageLinks` merged at runtime with curated maps |
| Promoted patches | [`src/app/data/promoted-overrides.json`](../../src/app/data/promoted-overrides.json) | Build-time merge into bundled fibers + supplementary tables (from `ops:promote-diff` or dev autosync). Optional top-level **`navThumbOverrides`** (`nodeId → imageUrl`) powers **public** nav thumbs when set; omit or use `{}` to fall back to `THUMB_IDS` + bundled heroes. |
| Grid order | [`src/app/data/fiber-order.json`](../../src/app/data/fiber-order.json) | Canonical `global` / `groups` order — **www** uses this; admin can override via `localStorage` locally, then dev reorder POSTs update the JSON |
| Merge + overrides | [`src/app/data/data-provider.ts`](../../src/app/data/data-provider.ts) | `LocalStorageSource`: bundle + `localStorage` patches |

**Production** serves **bundle only** (no `localStorage`). The app enforces this when `VITE_ENABLE_ADMIN=false`: `atlas:*` draft keys in the browser are ignored so returning visitors are not stuck on old hero images from past sessions. **Local dev** shows bundle + overrides.

**Automated check:** After every `vite build`, [`verify-bundle-in-dist.test.ts`](../../src/app/utils/admin/verify-bundle-in-dist.test.ts) asserts that `dist/assets/atlas-content-*.js` contains every fiber `id` from `fibers.ts` and that `new-images-*.js` embeds URLs from [`new-images.json`](../../new-images.json). It runs at the end of `npm run verify` and in `npm run ci:verify`. If you edited data only in the browser, this test still passes until you merge into those files and rebuild—use it to confirm the **built** output matches Git before deploying.

## Tier B — Admin / machine config (optional for a reproducible public build)

API keys, Cloudinary config, image DB scratch state, workbench UI, etc. live in `localStorage` or env. They do **not** need to be in Git for the public site to build.

## Tier C — Remote + cache

- **Upstash** (`VITE_UPSTASH_*`): response cache for material/node fetches — safe to invalidate.
- **HTTP APIs** (`VITE_API_BASE_URL`, etc.): live data for admin; not a substitute for Tier A on the static grid.

## Promote workflow (draft → Git)

```mermaid
flowchart LR
  Admin[Admin UI edits]
  LS[localStorage atlas:*]
  Diff[exportDiffJSON in browser]
  File[Save diff JSON file]
  Script[npm run ops:promote-diff]
  PR[Commit and open PR]
  Merge[Merge to main]
  Vercel[Vercel deploy]

  Admin --> LS
  LS --> Diff
  Diff --> File
  File --> Script
  Script --> PR
  PR --> Merge
  Merge --> Vercel
```

1. In Admin **Knowledge** header, use the **diff** download (file icon with green tint) to save `atlas-diff-*.json` — this is **`exportDiffJSON()`** (minimal delta vs bundle). The plain Download icon is raw storage keys; use diff for promotion.
2. Save the JSON to e.g. [`catalog/diffs/`](../../catalog/diffs/) (optional) for review.
3. Run **`npm run ops:promote-diff -- path/to/diff.json`** (see script help for `--dry-run`).
4. Review `git diff` (especially `new-images.json` and any manual follow-ups).
5. Commit, push, merge; Vercel builds from Git.

### What the promote script does today

[`scripts/promote-atlas-diff.mjs`](../../scripts/promote-atlas-diff.mjs) **deep-merges** `diff.fibers` into [`promoted-overrides.json`](../../src/app/data/promoted-overrides.json) (same shape as runtime overrides), **merges** supplementary keys (`worldNames`, `processData`, etc.) into that file, and **merges `galleryImages`** into [`new-images.json`](../../new-images.json) (resolved `profileKey` / aliases match [`atlas-data.ts`](../../src/app/data/atlas-data.ts) `jsonKeyAliases`). Use `--dry-run` to preview.

### What still requires manual edits

- **`fibers.ts`** — **new fiber ids** or structural TS edits are **not** generated from the diff; add profiles in TS when needed.
- **`atlas-data.ts`** — if merged supplementary data in `promoted-overrides.json` must match hand-maintained types, **review** the diff after promote.

Use **merged catalog export** (`exportEffectiveJSON()` on the data source; Layers control in Admin header) when you need a full merged snapshot for auditing or downstream tools — it does **not** replace Git as canonical source.

## Related commands

| Command | Purpose |
|---------|---------|
| `npm run ops:promote-diff -- <file.json> [--dry-run]` | Merge diff into `promoted-overrides.json` + `new-images.json` |
| `npm run ops:data-parity` | Bundled census + optional API parity |
| `npm run ops:invalidate-cache` | Clear Upstash material cache |

## Single release checklist (Admin → Git → www)

1. Export diff: Admin **Knowledge** header → **exportDiffJSON** (`atlas-diff-*.json`).
2. Run **`npm run ops:promote-diff -- path/to/atlas-diff-*.json`** (use `--dry-run` first if unsure).
3. If you reordered the **grid** in dev, ensure [`fiber-order.json`](../../src/app/data/fiber-order.json) was updated (dev server POSTs on reorder) and is included in the commit.
4. **`git diff`** — review `promoted-overrides.json` (including `navThumbOverrides` when present), `new-images.json`, `fiber-order.json`.
5. **`npm run verify`** — typecheck, tests, production build, bundle-in-dist checks.
6. Commit, push **`main`**, confirm Vercel Production matches the same commit SHA.

## CI

[`ci:verify`](../../package.json) runs typecheck, tests, build, bundle verification, audit, and `check:no-supabase`. [`catalog-integrity.test.ts`](../../src/app/utils/admin/catalog-integrity.test.ts) ensures `fiber-order.json` ids ⊆ `fibers.ts`. [`data-freshness-ci.test.ts`](../../src/app/utils/admin/data-freshness-ci.test.ts) freezes admin census baselines — bump when you intentionally change counts.
