#!/usr/bin/env node
/**
 * Merge exportDiffJSON() output into repo-tracked catalog files.
 *
 * - Merges diff.fibers (deep) into promoted-overrides.json (gallery also in new-images).
 * - Merges supplementary keys into promoted-overrides.json (worldNames, processData, …).
 * - Updates new-images.json from diff.fibers[].galleryImages when present.
 *
 * Usage:
 *   node scripts/promote-atlas-diff.mjs <path-to-diff.json> [--dry-run]
 *   npm run ops:promote-diff -- catalog/diffs/foo.json --dry-run
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/**
 * Nav-tree compound IDs → fibers.ts canonical IDs.
 * Canonical source: src/app/data/navigation-id-registry.ts (NEW_IMAGE_PROFILE_ALIASES).
 * Keep in sync when adding new aliases to the registry.
 */
const JSON_KEY_ALIASES = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
  "bamboo-viscose": "bamboo",
  "sheep-wool": "wool",
  cotton: "organic-cotton",
};

const SUPP_KEYS = ["worldNames", "processData", "anatomyData", "careData", "quoteData"];

/**
 * Fiber profile ids in fibers.ts use 4-space-indented `id: "slug"` on object entries
 * (excludes interface `id: string`, seeAlso `{ id: ... }`).
 */
function extractFiberIdsFromFibersTs(source) {
  const ids = new Set();
  const re = /^\s{4}id:\s*"([^"]+)"/gm;
  let m;
  while ((m = re.exec(source)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

function resolveProfileKey(fiberId, profiles) {
  for (const p of profiles) {
    const resolved = JSON_KEY_ALIASES[p.profileKey] ?? p.profileKey;
    if (resolved === fiberId) return p.profileKey;
  }
  return fiberId;
}

function urlsFromGallery(galleryImages) {
  if (!Array.isArray(galleryImages)) return [];
  return galleryImages.map((g) => (g && typeof g === "object" ? g.url : null)).filter(Boolean);
}

function mergeDeep(a, b) {
  if (b === undefined) return a;
  if (Array.isArray(b)) return b;
  if (b !== null && typeof b === "object") {
    const base = a !== null && typeof a === "object" && !Array.isArray(a) ? a : {};
    const out = { ...base };
    for (const [k, v] of Object.entries(b)) {
      out[k] = mergeDeep(out[k], v);
    }
    return out;
  }
  return b;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  const positional = argv.filter((a) => !a.startsWith("-"));
  const fileArg = positional[0];
  return { dryRun, fileArg };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: node scripts/promote-atlas-diff.mjs <exportDiff.json> [--dry-run]

Merges diff into promoted-overrides.json and new-images.json (gallery URLs).
Warns for unknown fiber ids. Supplementary keys merge into promoted-overrides;
complex atlas-data.ts edits may still need manual review.

Does not patch fibers.ts (new fibers / structural edits — edit TS manually).`);
    process.exit(0);
  }

  const { dryRun, fileArg } = parseArgs(argv);
  if (!fileArg) {
    console.error("[promote-atlas-diff] Missing path to diff JSON. Use --help for usage.");
    process.exit(1);
  }

  const diffPath = path.isAbsolute(fileArg) ? fileArg : path.join(root, fileArg);
  let diff;
  try {
    diff = JSON.parse(readFileSync(diffPath, "utf8"));
  } catch (e) {
    console.error("[promote-atlas-diff] Failed to read or parse JSON:", diffPath, e);
    process.exit(1);
  }

  const fibersPath = path.join(root, "src/app/data/fibers.ts");
  const fibersSource = readFileSync(fibersPath, "utf8");
  const validIds = extractFiberIdsFromFibersTs(fibersSource);

  if (diff.fibers && typeof diff.fibers === "object") {
    for (const id of Object.keys(diff.fibers)) {
      if (!validIds.has(id)) {
        console.warn(`[promote-atlas-diff] Unknown fiber id (not matched in fibers.ts): ${id}`);
      }
    }
  }

  const promotedPath = path.join(root, "src/app/data/promoted-overrides.json");
  let po = {};
  try {
    po = JSON.parse(readFileSync(promotedPath, "utf8"));
  } catch {
    po = {};
  }
  const poBefore = JSON.stringify(po);

  if (diff.fibers && typeof diff.fibers === "object") {
    po.fibers = po.fibers && typeof po.fibers === "object" ? { ...po.fibers } : {};
    for (const [fiberId, patch] of Object.entries(diff.fibers)) {
      if (!patch || typeof patch !== "object") continue;
      po.fibers[fiberId] = mergeDeep(po.fibers[fiberId] ?? {}, patch);
    }
  }

  for (const k of SUPP_KEYS) {
    if (!diff[k] || typeof diff[k] !== "object" || Object.keys(diff[k]).length === 0) continue;
    const table = diff[k];
    po[k] = po[k] && typeof po[k] === "object" ? { ...po[k] } : {};
    for (const [entityId, patch] of Object.entries(table)) {
      if (!patch || typeof patch !== "object") {
        po[k][entityId] = patch;
        continue;
      }
      po[k][entityId] = mergeDeep(po[k][entityId] ?? {}, patch);
    }
    console.warn(
      `[promote-atlas-diff] Merged "${k}" into promoted-overrides.json — verify shapes match atlas-data.ts expectations.`,
    );
  }

  const promotedChanged = JSON.stringify(po) !== poBefore;

  const newImagesPath = path.join(root, "new-images.json");
  const payload = JSON.parse(readFileSync(newImagesPath, "utf8"));
  if (!Array.isArray(payload.profiles)) {
    console.error("[promote-atlas-diff] new-images.json missing profiles array.");
    process.exit(1);
  }

  const profiles = payload.profiles;
  let galleryUpdates = 0;
  const touchedKeys = [];

  if (diff.fibers && typeof diff.fibers === "object") {
    for (const [fiberId, patch] of Object.entries(diff.fibers)) {
      if (!patch || typeof patch !== "object") continue;
      if (!("galleryImages" in patch)) continue;
      const urls = urlsFromGallery(patch.galleryImages);
      if (urls.length === 0) continue;

      const profileKey = resolveProfileKey(fiberId, profiles);
      let idx = profiles.findIndex((p) => p.profileKey === profileKey);
      if (idx === -1) {
        profiles.push({
          profileKey,
          imageLinks: urls,
          imageCount: urls.length,
        });
        idx = profiles.length - 1;
      } else {
        profiles[idx].imageLinks = urls;
        profiles[idx].imageCount = urls.length;
      }
      galleryUpdates += 1;
      touchedKeys.push(profileKey);
    }
  }

  if (galleryUpdates > 0) {
    payload.exportedAt = new Date().toISOString();
    payload.profileCount = profiles.length;
    payload.imageLinkCount = profiles.reduce(
      (sum, p) => sum + (Array.isArray(p.imageLinks) ? p.imageLinks.length : 0),
      0,
    );
  }

  const newImagesBefore = readFileSync(newImagesPath, "utf8");
  const newImagesOut = galleryUpdates > 0 ? `${JSON.stringify(payload, null, 2)}\n` : newImagesBefore;
  const newImagesChanged = galleryUpdates > 0 && newImagesOut !== newImagesBefore;

  if (!promotedChanged && !newImagesChanged) {
    console.log("[promote-atlas-diff] No applicable changes in diff — promoted-overrides.json and new-images.json unchanged.");
    if (dryRun) console.log("  (dry-run)");
    process.exit(0);
  }

  if (dryRun) {
    console.log("[promote-atlas-diff] Dry run — no files written.");
    if (promotedChanged) console.log("  Would update promoted-overrides.json");
    if (galleryUpdates > 0) {
      console.log(`  Gallery profile updates: ${galleryUpdates}`);
      if (touchedKeys.length) console.log(`  profileKeys: ${touchedKeys.join(", ")}`);
      console.log(`  New imageLinkCount: ${payload.imageLinkCount}`);
    }
    process.exit(0);
  }

  if (promotedChanged) {
    writeFileSync(promotedPath, `${JSON.stringify(po, null, 2)}\n`, "utf8");
    console.log(`[promote-atlas-diff] Wrote ${path.relative(root, promotedPath)}`);
  }

  if (newImagesChanged) {
    writeFileSync(newImagesPath, newImagesOut, "utf8");
    console.log(`[promote-atlas-diff] Wrote ${path.relative(root, newImagesPath)}`);
    console.log(
      `  Gallery profile updates: ${galleryUpdates}${touchedKeys.length ? ` (${touchedKeys.join(", ")})` : ""}`,
    );
    console.log(`  imageLinkCount: ${payload.imageLinkCount}`);
  } else if (promotedChanged && galleryUpdates === 0) {
    console.log("[promote-atlas-diff] new-images.json unchanged (no galleryImages in diff).");
  }
}

main();
