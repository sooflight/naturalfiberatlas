import { describe, expect, it } from "vitest";
import {
  partitionByNavigationParent,
  isNavigationParentProfileId,
  getNavigationNodeDisplayOrder,
  sortProfileIdsByCanonicalOrder,
} from "./profile-sequencing";

describe("partitionByNavigationParent", () => {
  it("separates canonical ids into regular and navigation parent buckets", () => {
    const result = partitionByNavigationParent(["hemp", "plant", "regen", "jute", "animal"]);

    expect(result.regular).toEqual(["hemp", "jute"]);
    expect(result.navigationParents).toEqual(["plant", "regen", "animal"]);
  });
});

describe("isNavigationParentProfileId", () => {
  it("treats admin category nodes like seed-fibers and grass-fibers as navigation parents", () => {
    expect(isNavigationParentProfileId("seed-fibers")).toBe(true);
    expect(isNavigationParentProfileId("grass-fibers")).toBe(true);
    expect(isNavigationParentProfileId("bast-fibers")).toBe(true);
    expect(isNavigationParentProfileId("bark-fibers")).toBe(true);
    expect(isNavigationParentProfileId("leaf-fibers")).toBe(true);
    expect(isNavigationParentProfileId("fruit-fibers")).toBe(true);
  });

  it("does not treat leaf fiber profiles as navigation parents", () => {
    expect(isNavigationParentProfileId("hemp")).toBe(false);
    expect(isNavigationParentProfileId("bamboo")).toBe(false);
    expect(isNavigationParentProfileId("kapok")).toBe(false);
  });
});

describe("getNavigationNodeDisplayOrder", () => {
  it("returns nav nodes in frontend display order (fiber → plant subcats → animal → regen); textile and dyes excluded", () => {
    const order = getNavigationNodeDisplayOrder();
    const fiberIdx = order.indexOf("fiber");
    const plantIdx = order.indexOf("plant-cellulose");
    const bastIdx = order.indexOf("bast-fibers");
    const barkIdx = order.indexOf("bark-fibers");
    const seedIdx = order.indexOf("seed-fibers");
    const grassIdx = order.indexOf("grass-fibers");
    const animalIdx = order.indexOf("animal-protein");
    const regenIdx = order.indexOf("mineral-regenerated");
    const textileIdx = order.indexOf("textile");
    const dyesIdx = order.indexOf("dyes");

    expect(fiberIdx).toBeGreaterThanOrEqual(0);
    expect(plantIdx).toBeGreaterThan(fiberIdx);
    expect(bastIdx).toBeGreaterThan(plantIdx);
    expect(barkIdx).toBeGreaterThan(bastIdx);
    expect(seedIdx).toBeGreaterThan(barkIdx);
    expect(grassIdx).toBeGreaterThan(seedIdx);
    expect(animalIdx).toBeGreaterThan(grassIdx);
    expect(regenIdx).toBeGreaterThan(animalIdx);
    expect(textileIdx).toBe(-1);
    expect(dyesIdx).toBe(-1);
  });

  it("sorts nav nodes by display order when using sortProfileIdsByCanonicalOrder", () => {
    const shuffled = ["grass-fibers", "fiber", "seed-fibers", "bark-fibers", "bast-fibers"];
    const order = getNavigationNodeDisplayOrder();
    const sorted = sortProfileIdsByCanonicalOrder(shuffled, order);
    expect(sorted[0]).toBe("fiber");
    expect(sorted.indexOf("bast-fibers")).toBeLessThan(sorted.indexOf("seed-fibers"));
    expect(sorted.indexOf("bark-fibers")).toBeLessThan(sorted.indexOf("seed-fibers"));
    expect(sorted.indexOf("seed-fibers")).toBeLessThan(sorted.indexOf("grass-fibers"));
    expect(sorted[sorted.length - 1]).toBe("grass-fibers");
  });
});
