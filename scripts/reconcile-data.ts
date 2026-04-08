#!/usr/bin/env npx tsx
/**
 * ops:reconcile — Automated data reconciliation that keeps bundled JSON files
 * aligned with the canonical TypeScript catalog.
 *
 * What it fixes:
 *   1. Hero image alignment: ensures every new-images.json profile that maps
 *      to a fiber in fibers.ts has the canonical hero URL as its first link.
 *   2. Stale promoted overrides: removes entries from promoted-overrides.json
 *      whose IDs no longer exist in the fiber catalog or redirect table.
 *   3. Reports any data-freshness baseline drift (doesn't auto-fix — that
 *      requires a deliberate decision to bump the frozen counts).
 *
 * Usage:
 *   npx tsx scripts/reconcile-data.ts           # apply fixes
 *   npx tsx scripts/reconcile-data.ts --dry-run  # preview only
 *   npm run ops:reconcile                        # via package.json
 *   npm run ops:reconcile -- --dry-run
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = join(fileURLToPath(import.meta.url), "..");
const root = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const { fibers } = await import("../src/app/data/fibers");
  const { CANONICAL_FIBER_ID_REDIRECTS } = await import("../src/app/data/fiber-id-redirects");
  const { NEW_IMAGE_PROFILE_ALIASES } = await import("../src/app/data/navigation-id-registry");
  const { runCensus } = await import("../src/app/utils/admin/dataCensus");

  const fiberIds = new Set(fibers.map((f: any) => f.id));
  const heroes = new Map(fibers.map((f: any) => [f.id, f.image as string]));
  const redirectSources = new Set(Object.keys(CANONICAL_FIBER_ID_REDIRECTS));

  let totalFixes = 0;

  // ── 1. Hero image reconciliation ──

  const niPath = join(root, "new-images.json");
  const niData = JSON.parse(readFileSync(niPath, "utf-8"));
  const profiles: any[] = niData.profiles ?? [];
  const heroFixes: string[] = [];

  for (const profile of profiles) {
    const key = profile.profileKey ?? "";
    const resolvedId = NEW_IMAGE_PROFILE_ALIASES[key] ?? key;
    const hero = heroes.get(resolvedId);
    if (!hero) continue;
    const links: string[] = profile.imageLinks ?? [];
    if (links.length === 0) continue;
    if (links.includes(hero)) continue;
    profile.imageLinks = [hero, ...links];
    heroFixes.push(resolvedId);
  }

  if (heroFixes.length > 0) {
    console.log(`[hero] Prepended hero URL for ${heroFixes.length} profiles: ${heroFixes.join(", ")}`);
    if (!dryRun) {
      writeFileSync(niPath, JSON.stringify(niData, null, 2) + "\n", "utf-8");
      console.log("[hero] Wrote new-images.json");
    }
    totalFixes += heroFixes.length;
  } else {
    console.log("[hero] All profiles aligned — no changes needed.");
  }

  // ── 2. Stale promoted overrides cleanup ──

  const poPath = join(root, "src/app/data/promoted-overrides.json");
  const poData = JSON.parse(readFileSync(poPath, "utf-8"));
  const fiberOverrides = poData.fibers ?? {};
  const stale: string[] = [];

  for (const id of Object.keys(fiberOverrides)) {
    if (fiberIds.has(id)) continue;
    if (redirectSources.has(id)) continue;
    stale.push(id);
  }

  if (stale.length > 0) {
    console.log(`[overrides] Removing ${stale.length} stale entries: ${stale.join(", ")}`);
    for (const id of stale) delete fiberOverrides[id];
    if (!dryRun) {
      writeFileSync(poPath, JSON.stringify(poData, null, 2) + "\n", "utf-8");
      console.log("[overrides] Wrote promoted-overrides.json");
    }
    totalFixes += stale.length;
  } else {
    console.log("[overrides] No stale entries found.");
  }

  // ── 3. Data freshness drift report ──

  const baseline = {
    navLeafProfiles: 151,
    passports: 59,
    unifiedBundledPublishedLive: 79,
    unifiedBundledCatalogRows: 174,
    unifiedOrphanPassportKeys: 5,
    suppliers: 5,
    evidence: 9,
    supplierLinks: 11,
  };

  const r = runCensus();
  const drifts: string[] = [];
  const check = (label: string, actual: number, expected: number) => {
    if (actual !== expected) drifts.push(`${label}: expected ${expected}, got ${actual}`);
  };

  check("navLeafProfiles", r.profiles.total, baseline.navLeafProfiles);
  check("passports", r.passports.total, baseline.passports);
  check("publishedLive", r.unifiedCatalog.publishedLive, baseline.unifiedBundledPublishedLive);
  check("catalogRows", r.unifiedCatalog.totalCatalogRows, baseline.unifiedBundledCatalogRows);
  check("orphanPassportKeys", r.unifiedCatalog.orphanPassportKeys, baseline.unifiedOrphanPassportKeys);
  check("suppliers", r.suppliers.total, baseline.suppliers);
  check("evidence", r.evidence.total, baseline.evidence);
  check("supplierLinks", r.relationships.totalLinks, baseline.supplierLinks);

  if (drifts.length > 0) {
    console.log(`\n[freshness] Baseline drift detected (update data-freshness-ci.test.ts):`);
    for (const d of drifts) console.log(`  - ${d}`);
  } else {
    console.log("[freshness] Baseline counts match.");
  }

  // ── Summary ──

  if (dryRun) {
    console.log(`\n[dry-run] Would have applied ${totalFixes} fix(es). Re-run without --dry-run to apply.`);
  } else if (totalFixes > 0) {
    console.log(`\nApplied ${totalFixes} fix(es).`);
  } else {
    console.log("\nEverything is aligned. No changes needed.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
