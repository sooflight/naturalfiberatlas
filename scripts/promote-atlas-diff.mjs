#!/usr/bin/env node
/**
 * Merge exportDiffJSON() output into repo-tracked catalog files.
 *
 * Currently: updates new-images.json from diff.fibers[].galleryImages when present.
 * Warns when supplementary table keys exist (manual edit atlas-data.ts required).
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

/** Same keys as src/app/data/atlas-data.ts jsonKeyAliases */
const JSON_KEY_ALIASES = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
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

Reads Admin exportDiffJSON-shaped file and merges galleryImages into new-images.json.
Warns if supplementary overrides are present — edit src/app/data/atlas-data.ts manually.

Does not patch fibers.ts (apply fiber field changes manually).`);
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

  for (const k of SUPP_KEYS) {
    if (diff[k] && typeof diff[k] === "object" && Object.keys(diff[k]).length > 0) {
      console.warn(
        `[promote-atlas-diff] Diff contains "${k}" overrides — merge into src/app/data/atlas-data.ts manually (see docs/architecture/data-publishing.md).`,
      );
    }
  }

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

  payload.exportedAt = new Date().toISOString();
  payload.profileCount = profiles.length;
  payload.imageLinkCount = profiles.reduce((sum, p) => sum + (Array.isArray(p.imageLinks) ? p.imageLinks.length : 0), 0);

  if (galleryUpdates === 0) {
    console.log("[promote-atlas-diff] No galleryImages patches in diff — new-images.json unchanged.");
    if (dryRun) {
      console.log("  (dry-run: would make no file changes)");
    }
    process.exit(0);
  }

  const outJson = `${JSON.stringify(payload, null, 2)}\n`;

  if (dryRun) {
    console.log("[promote-atlas-diff] Dry run — no files written.");
    console.log(`  Gallery profile updates: ${galleryUpdates}`);
    if (touchedKeys.length) console.log(`  profileKeys: ${touchedKeys.join(", ")}`);
    console.log(`  New imageLinkCount: ${payload.imageLinkCount}`);
    process.exit(0);
  }

  writeFileSync(newImagesPath, outJson, "utf8");
  console.log(`[promote-atlas-diff] Wrote ${path.relative(root, newImagesPath)}`);
  console.log(`  Gallery profile updates: ${galleryUpdates}${touchedKeys.length ? ` (${touchedKeys.join(", ")})` : ""}`);
  console.log(`  imageLinkCount: ${payload.imageLinkCount}`);
}

main();
