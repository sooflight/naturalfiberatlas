#!/usr/bin/env node
/**
 * Operator workflow: verify bundle baseline, optional cache bust, optional API parity, optional reseed hook.
 */
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("=== Data freshness recovery ===\n");
console.log("A) Clear browser overrides: Admin → Health → Reset local atlas overrides\n");

console.log("B) Bundled census baseline (vitest)…");
run("npx", ["vitest", "run", "src/app/utils/admin/data-freshness-ci.test.ts"]);

const skipCache = process.env.NFA_SKIP_CACHE_INVALIDATION === "1";
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.VITE_UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.VITE_UPSTASH_REDIS_REST_TOKEN;
if (!skipCache && upstashUrl && upstashToken) {
  console.log("\nC) Upstash cache invalidation…");
  run("node", ["scripts/invalidate-upstash-cache.mjs"]);
} else {
  console.log(
    skipCache
      ? "\nC) Skipping Upstash (NFA_SKIP_CACHE_INVALIDATION=1)"
      : "\nC) Skipping Upstash (no UPSTASH_* / VITE_UPSTASH_* in env)",
  );
}

console.log("\nD) Optional API parity…");
run("node", ["scripts/data-freshness-api-parity.mjs"]);

console.log("\nE) Optional remote reseed hook…");
run("node", ["scripts/reseed-remote-from-bundle.mjs"]);

console.log("\n=== Done ===");
