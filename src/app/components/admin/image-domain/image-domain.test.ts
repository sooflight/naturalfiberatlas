import { describe, expect, it } from "vitest";
import type { GalleryImageEntry } from "../../../data/fibers";
import {
  buildProfileImageLinksExport,
  promoteHeroImage,
  safeMergeImageImport,
  toDomainImages,
  toGalleryImages,
} from "./adapters";

describe("image-domain adapters", () => {
  it("maps gallery images to domain images and back", () => {
    const gallery: GalleryImageEntry[] = [
      {
        url: "https://example.com/a.jpg",
        title: "A",
        attribution: "Museum",
        provider: "wikimedia",
        rights: "CC-BY",
      },
    ];

    const domain = toDomainImages(gallery);
    expect(domain[0].provider).toBe("wikimedia");

    const roundtrip = toGalleryImages(domain);
    expect(roundtrip[0].url).toBe("https://example.com/a.jpg");
    expect(roundtrip[0].rights).toBe("CC-BY");
  });

  it("promotes hero image to index zero", () => {
    const promoted = promoteHeroImage(
      [
        { id: "a", url: "a" },
        { id: "b", url: "b" },
      ],
      1,
    );

    expect(promoted[0].id).toBe("b");
    expect(promoted[1].id).toBe("a");
  });

  it("builds export metadata and merge stats", () => {
    const exportPayload = buildProfileImageLinksExport({
      hemp: [{ id: "1", url: "https://example.com/1.jpg" }],
      flax: [{ id: "2", url: "https://example.com/2.jpg" }],
    });

    expect(exportPayload.profileCount).toBe(2);
    expect(exportPayload.imageLinkCount).toBe(2);

    const mergeResult = safeMergeImageImport(
      { hemp: [{ id: "1", url: "https://example.com/1.jpg" }] },
      {
        hemp: [
          { id: "1", url: "https://example.com/1.jpg" },
          { id: "3", url: "https://example.com/3.jpg" },
        ],
      },
    );

    expect(mergeResult.stats.updatedProfiles).toBe(1);
    expect(mergeResult.stats.newImages).toBe(1);
    expect(mergeResult.merged.hemp).toHaveLength(2);
  });
});
