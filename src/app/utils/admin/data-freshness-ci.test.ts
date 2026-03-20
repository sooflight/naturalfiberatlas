import { describe, it, expect } from "vitest";
import { runCensus } from "./dataCensus";

/**
 * Frozen baseline for bundled admin/nav data. Bump intentionally when the
 * canonical dataset grows or shrinks (see docs/runbooks/data-freshness.md).
 */
const BUNDLED_CENSUS_BASELINE = {
  navLeafProfiles: 119,
  passports: 55,
  suppliers: 5,
  evidence: 9,
  supplierLinks: 11,
} as const;

describe("bundled data freshness (CI baseline)", () => {
  it("runCensus matches expected bundled counts", () => {
    const r = runCensus();
    expect(r.profiles.total).toBe(BUNDLED_CENSUS_BASELINE.navLeafProfiles);
    expect(r.passports.total).toBe(BUNDLED_CENSUS_BASELINE.passports);
    expect(r.suppliers.total).toBe(BUNDLED_CENSUS_BASELINE.suppliers);
    expect(r.evidence.total).toBe(BUNDLED_CENSUS_BASELINE.evidence);
    expect(r.relationships.totalLinks).toBe(BUNDLED_CENSUS_BASELINE.supplierLinks);
    expect(r.quality.errorCount).toBe(0);
  });
});
