import { describe, expect, it } from "vitest";
import { getGalleryImages, mergeFiberGalleryWithFallback } from "../../data/atlas-data";
import {
  mergeAtlasImagesFromClientPatch,
  mergeNewImagesJsonPayload,
} from "./mergeAtlasImagesPatch";

describe("admin image delete flow", () => {
  it("removes catalog rows and keeps the public gallery empty after explicit clear", () => {
    const fiberId = "water-hyacinth";
    const baseline = getGalleryImages(fiberId);
    expect(baseline.length).toBeGreaterThan(0);

    const firstUrl = baseline[0]?.url ?? "";
    expect(firstUrl.length).toBeGreaterThan(0);

    const mergedAtlasImages = mergeAtlasImagesFromClientPatch(
      { [fiberId]: [firstUrl] },
      { [fiberId]: [] },
    );
    expect(mergedAtlasImages[fiberId]).toBeUndefined();

    const mergedNewImages = mergeNewImagesJsonPayload(
      {
        profiles: [{ profileKey: fiberId, imageLinks: [firstUrl], imageCount: 1 }],
      },
      {
        exportedAt: "2026-04-08T00:00:00.000Z",
        profiles: [{ profileKey: fiberId, imageLinks: [] }],
      },
    );
    expect(mergedNewImages.profiles.some((p) => p.profileKey === fiberId)).toBe(false);

    const mergedPublicGallery = mergeFiberGalleryWithFallback(fiberId, { galleryImages: [] });
    expect(mergedPublicGallery).toEqual([]);
  });
});
