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
| Merge + overrides | [`src/app/data/data-provider.ts`](../../src/app/data/data-provider.ts) | `LocalStorageSource`: bundle + `localStorage` patches |

**Production** serves **bundle only** (no `localStorage`). **Local dev** shows bundle + overrides.

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

[`scripts/promote-atlas-diff.mjs`](../../scripts/promote-atlas-diff.mjs) **merges `galleryImages` from the diff into** `new-images.json` (resolved `profileKey` / aliases match [`atlas-data.ts`](../../src/app/data/atlas-data.ts) `jsonKeyAliases`).

### What still requires manual edits

- **`fibers.ts`** — field patches (name, about, …) from the diff are **not** auto-written to TS (no safe codegen without an AST pipeline).
- **`atlas-data.ts`** — supplementary table overrides (`worldNames`, `processData`, …): apply by hand or future tooling; the script **warns** if these keys are present in the diff.

Use **merged catalog export** (`exportEffectiveJSON()` on the data source; Layers control in Admin header) when you need a full merged snapshot for auditing or downstream tools — it does **not** replace Git as canonical source.

## Related commands

| Command | Purpose |
|---------|---------|
| `npm run ops:promote-diff -- <file.json> [--dry-run]` | Apply mechanical merges from diff JSON |
| `npm run ops:data-parity` | Bundled census + optional API parity |
| `npm run ops:invalidate-cache` | Clear Upstash material cache |

## CI

[`ci:verify`](../../package.json) runs typecheck, tests, build, audit, and `check:no-supabase`. Keeping Tier A consistent is enforced by tests such as [`data-freshness-ci.test.ts`](../../src/app/utils/admin/data-freshness-ci.test.ts); update baselines when you intentionally change bundled counts.
