import { describe, expect, it } from "vitest";
import { atlasNavigation as frontendNavigation } from "./atlas-navigation";
import { atlasNavigation as adminNavigation } from "./admin/atlas-navigation";

function flattenIds(
  nodes: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>,
): string[] {
  const ids: string[] = [];
  const walk = (items: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>) => {
    items.forEach((node) => {
      ids.push(node.id);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

/**
 * Frontend uses legacy IDs in top-nav; admin sidebar uses newer taxonomy IDs.
 * This mapping captures intentional equivalence so we can detect drift.
 */
const LEGACY_TO_ADMIN_EQUIVALENT: Record<string, string> = {
  plant: "plant-cellulose",
  "bast-fiber": "bast-fibers",
  "bark-fiber": "bark-fibers",
  "seed-fiber": "seed-fibers",
  "leaf-fiber": "leaf-fibers",
  "grass-fiber": "grass-fibers",
  "fruit-fiber": "fruit-fibers",
  animal: "animal-protein",
  regen: "mineral-regenerated",
};

describe("navigation parity between frontend layers and admin sidebar", () => {
  it("keeps every frontend node represented in admin navigation", () => {
    const frontendIds = flattenIds(frontendNavigation);
    const adminIds = new Set(flattenIds(adminNavigation));

    const missing: string[] = [];
    frontendIds.forEach((id) => {
      const equivalentId = LEGACY_TO_ADMIN_EQUIVALENT[id] ?? id;
      if (!adminIds.has(equivalentId)) {
        missing.push(`${id} -> ${equivalentId}`);
      }
    });

    expect(missing).toEqual([]);
  });

  it("keeps the legacy-equivalence map valid", () => {
    const frontendIds = new Set(flattenIds(frontendNavigation));
    const adminIds = new Set(flattenIds(adminNavigation));

    Object.entries(LEGACY_TO_ADMIN_EQUIVALENT).forEach(([legacyId, adminEquivalentId]) => {
      expect(frontendIds.has(legacyId)).toBe(true);
      expect(adminIds.has(adminEquivalentId)).toBe(true);
    });
  });

  it("includes all animal sub-category nodes in admin navigation", () => {
    const adminIds = new Set(flattenIds(adminNavigation));
    const requiredAnimalSubcategories = [
      "wool-fiber",
      "hair-fiber",
      "silk-fiber",
    ];

    requiredAnimalSubcategories.forEach((id) => {
      expect(adminIds.has(id)).toBe(true);
    });
  });
});

