#!/usr/bin/env node
/**
 * Optional: compare /materials list length to bundled slug count in admin atlas-data.json.
 * Requires NFA_API_BASE_URL or VITE_API_BASE_URL (and bearer if your API needs it).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const base = (
  process.env.NFA_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  ""
).replace(/\/+$/, "");
const token = process.env.NFA_API_BEARER_TOKEN || process.env.VITE_API_BEARER_TOKEN || "";

if (!base) {
  console.log("[data-freshness-api-parity] No API base URL set; skip remote parity (set NFA_API_BASE_URL or VITE_API_BASE_URL).");
  process.exit(0);
}

const atlasPath = join(root, "src/app/data/admin/atlas-data.json");
const atlas = JSON.parse(readFileSync(atlasPath, "utf8"));
const bundledSlugs = Object.keys(atlas.images || {}).length;

const url = `${base}/materials`;
const headers = { "Content-Type": "application/json" };
if (token) headers.Authorization = `Bearer ${token}`;

const res = await fetch(url, { headers });
if (!res.ok) {
  console.error(`[data-freshness-api-parity] GET ${url} failed: ${res.status}`);
  process.exit(1);
}

const body = await res.json();
const remote = Array.isArray(body?.materials) ? body.materials.length : null;
if (remote == null) {
  console.error("[data-freshness-api-parity] Response missing materials array.");
  process.exit(1);
}

console.log(`[data-freshness-api-parity] bundled image slugs: ${bundledSlugs}, remote materials: ${remote}`);

if (remote !== bundledSlugs) {
  console.error(
    "[data-freshness-api-parity] Mismatch — refresh cache, re-seed API, or update bundle (see docs/runbooks/data-freshness.md).",
  );
  process.exit(1);
}
