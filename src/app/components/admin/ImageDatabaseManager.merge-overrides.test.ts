import { describe, expect, it } from "vitest";
import { mergeAtlasImagesWithNavigationOverrides } from "./ImageDatabaseManager";

describe("mergeAtlasImagesWithNavigationOverrides", () => {
  it("does not let a stale empty local row wipe a non-empty recomputed atlas map", () => {
    const atlasMap = {
      knitting: ["https://cdn.example/knit-1.jpg", "https://cdn.example/knit-2.jpg"],
    };
    const previousMap = {
      knitting: [],
    };
    const getFiberById = (id: string) =>
      id === "knitting"
        ? { id: "knitting", galleryImages: [{ url: "https://cdn.example/knit-1.jpg" }] }
        : undefined;

    const merged = mergeAtlasImagesWithNavigationOverrides(
      atlasMap,
      previousMap,
      new Set(),
      getFiberById,
    );

    expect(merged.knitting).toEqual(atlasMap.knitting);
  });

  it("still preserves an explicit empty row when the recomputed atlas map is also empty", () => {
    const atlasMap = { hemp: [] as string[] };
    const previousMap = { hemp: [] };
    const getFiberById = (id: string) =>
      id === "hemp" ? { id: "hemp", galleryImages: [] } : undefined;

    const merged = mergeAtlasImagesWithNavigationOverrides(
      atlasMap,
      previousMap,
      new Set(),
      getFiberById,
    );

    expect(merged.hemp).toEqual([]);
  });
});
