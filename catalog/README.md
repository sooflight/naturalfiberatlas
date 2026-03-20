# Catalog promotion artifacts

Optional staging area for **atlas diff JSON** files before they are merged into the repo.

- **`diffs/`** — Drop `exportDiffJSON()` exports here while preparing a PR (e.g. `my-change.diff.json`). Nothing in this folder is read automatically by the app.
- **Promotion** — From repo root:  
  `npm run ops:promote-diff -- catalog/diffs/your-export.json`  
  See [Data publishing architecture](../docs/architecture/data-publishing.md).

The **canonical** published data remains under `src/app/data/`, `new-images.json`, etc., after you run the script and commit.
