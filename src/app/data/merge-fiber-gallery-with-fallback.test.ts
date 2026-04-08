import { describe, expect, it } from "vitest";
import { getGalleryImages, mergeFiberGalleryWithFallback } from "./atlas-data";

describe("mergeFiberGalleryWithFallback", () => {
  it("returns no images when galleryImages is explicitly empty (curator cleared gallery)", () => {
    const id = "water-hyacinth";
    const baseline = getGalleryImages(id);
    expect(baseline.length).toBeGreaterThan(0);

    const merged = mergeFiberGalleryWithFallback(id, { galleryImages: [] });
    expect(merged).toEqual([]);
  });

  it("still merges baseline URLs when the profile has at least one gallery row", () => {
    const id = "bamboo";
    const baseline = getGalleryImages(id);
    expect(baseline.length).toBeGreaterThan(1);

    const first = baseline[0]!;
    const merged = mergeFiberGalleryWithFallback(id, { galleryImages: [first] });
    expect(merged.length).toBeGreaterThanOrEqual(1);
    expect(merged.map((e) => e.url)).toContain(first.url);
  });
});
