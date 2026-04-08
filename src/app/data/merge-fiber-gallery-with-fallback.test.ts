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

  it("keeps override rows authoritative when galleryImages is provided", () => {
    const id = "bamboo";
    const baseline = getGalleryImages(id);
    expect(baseline.length).toBeGreaterThan(1);

    const first = baseline[0]!;
    const merged = mergeFiberGalleryWithFallback(id, { galleryImages: [first] });
    expect(merged).toEqual([first]);
  });
});
