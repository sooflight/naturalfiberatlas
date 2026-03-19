import { describe, expect, it } from "vitest";
import { validateImport, computeDiff, applyImport } from "./atlasImport";
import type { CurrentAtlasState } from "@/types/atlas-import";

describe("atlasImport pipeline", () => {
  it("validates and repairs import payload shape", () => {
    const validation = validateImport(
      JSON.stringify({
        version: 1,
        entries: {
          hemp: {
            images: "https://example.com/hemp.jpg",
            tags: ["bast", "fiber"],
            era: "ancient",
          },
        },
      }),
    );

    expect(validation.valid).toBe(true);
    expect(validation.payload?.entries.hemp.images).toEqual([
      "https://example.com/hemp.jpg",
    ]);
  });

  it("computes diff and applies merge updates", () => {
    const state: CurrentAtlasState = {
      images: { hemp: ["https://example.com/a.jpg"] },
      tags: { hemp: ["bast"] },
      videos: {},
      era: { hemp: "historic" },
      origins: {},
      scientific: {},
    };

    const validation = validateImport({
      entries: {
        hemp: {
          images: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
          tags: ["bast", "durable"],
          era: "modern",
        },
      },
    });
    expect(validation.valid).toBe(true);
    expect(validation.payload).not.toBeNull();

    const diff = computeDiff(validation.payload!, state);
    expect(diff.stats.newImages).toBe(1);
    expect(diff.stats.newTags).toBe(1);
    expect(diff.stats.metadataUpdates).toBe(1);

    const merged = applyImport(diff, state);
    expect(merged.images.hemp).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
    expect(merged.tags.hemp).toEqual(["bast", "durable"]);
    expect(merged.era.hemp).toBe("modern");
  });

  it("normalizes videos as strings or objects and dedupes by url", () => {
    const state: CurrentAtlasState = {
      images: {},
      tags: {},
      videos: { hemp: ["https://example.com/v1.mp4"] },
      era: {},
      origins: {},
      scientific: {},
    };

    const validation = validateImport({
      entries: {
        hemp: {
          videos: [
            "https://example.com/v1.mp4",
            { url: "https://example.com/v2.mp4", caption: "Overview" },
          ],
        },
      },
    });
    expect(validation.valid).toBe(true);
    expect(validation.payload?.entries.hemp.videos).toEqual([
      "https://example.com/v1.mp4",
      { url: "https://example.com/v2.mp4", caption: "Overview" },
    ]);

    const diff = computeDiff(validation.payload!, state);
    expect(diff.stats.newVideos).toBe(1);
    const merged = applyImport(diff, state);
    expect(merged.videos.hemp).toEqual([
      "https://example.com/v1.mp4",
      "https://example.com/v2.mp4",
    ]);
  });
});
