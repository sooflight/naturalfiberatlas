import { describe, expect, it } from "vitest";
import { mergePreservingExistingImages } from "./image-save-guard";

describe("mergePreservingExistingImages", () => {
  it("preserves existing gallery entries when adding one new image", () => {
    const existing = [
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/a.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/b.jpg",
    ];
    const incoming = ["https://res.cloudinary.com/demo/image/upload/v1/atlas/c.jpg"];

    expect(mergePreservingExistingImages(existing, incoming)).toEqual([
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/a.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/b.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/c.jpg",
    ]);
  });

  it("deduplicates by URL across string and rich media entries", () => {
    const existing = ["https://res.cloudinary.com/demo/image/upload/v1/atlas/a.jpg"];
    const incoming = [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/a.jpg",
        provider: "cloudinary",
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/d.jpg",
        provider: "openverse",
      },
    ];

    expect(mergePreservingExistingImages(existing, incoming)).toEqual([
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/a.jpg",
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/d.jpg",
        provider: "openverse",
      },
    ]);
  });
});
