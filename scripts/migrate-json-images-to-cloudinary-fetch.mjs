#!/usr/bin/env node
/**
 * Rewrites third-party image URLs in catalog data to Cloudinary remote delivery:
 *   https://res.cloudinary.com/dawxvzlte/image/fetch/<encodeURIComponent(original)>
 *
 * JSON: deep-walks listed files. TypeScript: replaces double-quoted `https://…` literals
 * (same exclusions). Idempotent — already-Cloudinary strings are skipped.
 *
 * Skips: already Cloudinary, YouTube, Creative Commons license URLs, localhost.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLOUD = "dawxvzlte";

const JSON_FILES = [
  path.join(ROOT, "new-images.json"),
  path.join(ROOT, "src/app/data/admin/atlas-data.json"),
  path.join(ROOT, "src/app/data/promoted-overrides.json"),
];

/** Fiber / plate literals that are not valid JSON documents. */
const TS_DATA_FILES = [
  path.join(ROOT, "src/app/data/fibers.ts"),
  path.join(ROOT, "src/app/data/atlas-data.ts"),
  path.join(ROOT, "src/app/data/recovered-archived-profiles.ts"),
];

function shouldWrapString(key, s) {
  if (typeof s !== "string" || s.length < 8) return false;
  if (!/^https?:\/\//i.test(s)) return false;
  if (s.includes("res.cloudinary.com")) return false;
  if (key === "licenseUrl") return false;
  if (/youtu\.be|youtube\.com/i.test(s)) return false;
  if (/creativecommons\.org/i.test(s)) return false;
  if (/localhost|127\.0\.0\.1/i.test(s)) return false;
  return true;
}

function wrap(s) {
  return `https://res.cloudinary.com/${CLOUD}/image/fetch/${encodeURIComponent(s)}`;
}

function walk(key, val, stats) {
  if (typeof val === "string") {
    if (shouldWrapString(key, val)) {
      stats.replaced += 1;
      return wrap(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map((item, i) => walk(String(i), item, stats));
  }
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = walk(k, v, stats);
    }
    return out;
  }
  return val;
}

function migrateJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const stats = { replaced: 0 };
  const data = JSON.parse(raw);
  const next = walk("", data, stats);
  const out = `${JSON.stringify(next, null, 2)}\n`;
  fs.writeFileSync(filePath, out, "utf8");
  return stats.replaced;
}

function shouldWrapBareUrl(s) {
  return shouldWrapString("", s);
}

function migrateTsDataFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const re = /"https?:\/\/[^"\\]*(?:\\.[^"\\]*)*"/g;
  const matches = [...content.matchAll(re)].map((m) => m[0].slice(1, -1));
  const unique = [...new Set(matches)].filter(shouldWrapBareUrl);
  unique.sort((a, b) => b.length - a.length);
  let replaced = 0;
  for (const u of unique) {
    const before = content;
    const w = wrap(u);
    content = content.split(u).join(w);
    if (content !== before) replaced += before.split(u).length - 1;
  }
  if (replaced > 0) fs.writeFileSync(filePath, content, "utf8");
  return replaced;
}

let total = 0;
for (const f of JSON_FILES) {
  if (!fs.existsSync(f)) {
    console.warn("skip missing", f);
    continue;
  }
  const n = migrateJsonFile(f);
  console.log(path.relative(ROOT, f), n, "strings wrapped");
  total += n;
}
for (const f of TS_DATA_FILES) {
  if (!fs.existsSync(f)) {
    console.warn("skip missing", f);
    continue;
  }
  const n = migrateTsDataFile(f);
  console.log(path.relative(ROOT, f), n, "quoted URLs wrapped");
  total += n;
}
console.log("total", total);
