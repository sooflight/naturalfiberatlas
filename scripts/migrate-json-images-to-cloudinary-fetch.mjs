#!/usr/bin/env node
/**
 * Rewrites third-party image URLs in JSON data to Cloudinary remote delivery:
 *   https://res.cloudinary.com/dawxvzlte/image/fetch/<encodeURIComponent(original)>
 *
 * Skips: already Cloudinary, YouTube, license URLs, localhost.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CLOUD = "dawxvzlte";

const FILES = [
  path.join(ROOT, "new-images.json"),
  path.join(ROOT, "src/app/data/admin/atlas-data.json"),
  path.join(ROOT, "src/app/data/promoted-overrides.json"),
  path.join(ROOT, "src/app/data/nav-thumb-overrides.json"),
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

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const stats = { replaced: 0 };
  const data = JSON.parse(raw);
  const next = walk("", data, stats);
  const out = `${JSON.stringify(next, null, 2)}\n`;
  fs.writeFileSync(filePath, out, "utf8");
  return stats.replaced;
}

let total = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.warn("skip missing", f);
    continue;
  }
  const n = migrateFile(f);
  console.log(path.relative(ROOT, f), n, "strings wrapped");
  total += n;
}
console.log("total", total);
