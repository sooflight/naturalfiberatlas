import { describe, expect, it } from "vitest";
import {
  chunkGalleryForContactSheets,
  computePlateLayout,
  classifyZone,
  CONTACT_SHEET_MAX_IMAGES_PER_CARD,
} from "./plate-layout";
import { fiberIndex } from "../data/atlas-data";
import { getGalleryImages } from "../data/atlas-data";
import type { GalleryImageEntry } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";

function makeVisibility(keys: number[]): { ratios: Map<number, number> } {
  const ratios = new Map<number, number>();
  for (const k of keys) ratios.set(k, 1);
  return { ratios };
}

describe("computePlateLayout", () => {
  it("assigns plates to virtual indices beyond filtered.length when slots exceed profile count", () => {
    const cols = 4;
    const filtered = fiberIndex.filter((f) => ["hemp", "jute", "flax-linen"].includes(f.id));
    expect(filtered.length).toBe(3);

    const selectedId = "hemp";
    const visibility = makeVisibility([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const gallery = getGalleryImages(selectedId);

    const result = computePlateLayout(selectedId, filtered, cols, visibility, gallery);

    expect(result.plateAssignments.size).toBeGreaterThan(0);
    const maxAssignedIndex = Math.max(...result.plateAssignments.keys());
    expect(maxAssignedIndex).toBeGreaterThanOrEqual(filtered.length - 1);
    expect(maxAssignedIndex).toBeGreaterThanOrEqual(2);
  });

  it("returns empty result when selectedId is null", () => {
    const filtered = fiberIndex.slice(0, 5);
    const result = computePlateLayout(null, filtered, 4, { ratios: new Map() });
    expect(result.plateAssignments.size).toBe(0);
    expect(result.detailInhaleDelays.size).toBe(0);
  });

  it("returns empty result when selected fiber is not in filtered set", () => {
    const filtered = fiberIndex.filter((f) => f.id === "jute");
    const result = computePlateLayout("hemp", filtered, 4, { ratios: new Map() });
    expect(result.plateAssignments.size).toBe(0);
  });

  it("assigns detail plates only to a row-major pool prefix (fill rows L→R before deeper rows)", () => {
    const cols = 4;
    const filtered = fiberIndex.slice(0, 8);
    const selectedIndex = 5;
    const selectedId = filtered[selectedIndex]!.id;
    const visibility = makeVisibility([0, 1, 2, 3, 4, 5, 6, 7]);

    const result = computePlateLayout(selectedId, filtered, cols, visibility);
    const poolSize = result.plateAssignments.size;
    expect(poolSize).toBeGreaterThan(0);

    const selRow = Math.floor(selectedIndex / cols);
    const real: number[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i === selectedIndex) continue;
      if (Math.floor(i / cols) < selRow - 1) continue;
      real.push(i);
    }
    real.sort((a, b) => a - b);
    const virtual: number[] = [];
    let next = filtered.length;
    while (real.length + virtual.length < poolSize) {
      const row = Math.floor(next / cols);
      if (row >= selRow - 1) virtual.push(next);
      next += 1;
    }
    const expectedPool = [...real, ...virtual].sort((a, b) => a - b).slice(0, poolSize);

    const assigned = [...result.plateAssignments.keys()].sort((a, b) => a - b);
    expect(assigned).toEqual(expectedPool);
  });

  it("assigns one youtubeEmbed cell per valid URL with distinct slot indices", () => {
    dataSource.resetToDefaults();
    dataSource.updateFiber("lotus", {
      youtubeEmbedUrls: [
        "https://youtu.be/dQw4w9WgXcQ",
        "https://youtu.be/9bZkp7q19f0",
      ],
    });
    const cols = 4;
    const filtered = fiberIndex;
    const visibility = makeVisibility(Array.from({ length: filtered.length + 40 }, (_, i) => i));
    const result = computePlateLayout("lotus", filtered, cols, visibility);
    const ytCells = [...result.plateAssignments.entries()].filter(([, pt]) => pt === "youtubeEmbed");
    expect(ytCells.length).toBe(2);
    const slots = ytCells.map(([cell]) => result.youtubeEmbedSlotByCell.get(cell)).sort();
    expect(slots).toEqual([0, 1]);
    dataSource.resetToDefaults();
  });

  it("places one contactSheet cell per 12-image gallery chunk with correct global offsets", () => {
    const cols = 4;
    const filtered = fiberIndex.filter((f) => ["hemp", "jute", "flax-linen"].includes(f.id));
    const selectedId = "hemp";
    const visibility = makeVisibility(Array.from({ length: 40 }, (_, i) => i));
    const many: GalleryImageEntry[] = Array.from({ length: 25 }, (_, i) => ({
      url: `https://example.com/x/${i}.jpg`,
    }));
    const result = computePlateLayout(selectedId, filtered, cols, visibility, many);
    const contactCells = [...result.plateAssignments.entries()].filter(([, pt]) => pt === "contactSheet");
    expect(contactCells.length).toBe(3);
    const starts = [...result.gallerySlotStartIndex.values()].sort((a, b) => a - b);
    expect(starts).toEqual([0, 12, 24]);
    const totalThumbs = [...result.gallerySlotImages.values()].reduce((n, imgs) => n + imgs.length, 0);
    expect(totalThumbs).toBe(25);
  });
});

describe("chunkGalleryForContactSheets", () => {
  it(`splits into chunks of up to ${CONTACT_SHEET_MAX_IMAGES_PER_CARD} with correct startIndex`, () => {
    const imgs: GalleryImageEntry[] = Array.from({ length: 25 }, (_, i) => ({
      url: `https://example.com/g/${i}.jpg`,
    }));
    const q = chunkGalleryForContactSheets(imgs);
    expect(q.length).toBe(3);
    expect(q[0]!.images.length).toBe(12);
    expect(q[1]!.images.length).toBe(12);
    expect(q[2]!.images.length).toBe(1);
    expect(q[0]!.startIndex).toBe(0);
    expect(q[1]!.startIndex).toBe(12);
    expect(q[2]!.startIndex).toBe(24);
  });
});

describe("classifyZone", () => {
  it("classifies right when same row, column greater", () => {
    expect(classifyZone(1, 0, 4)).toBe("right");
  });

  it("classifies below when same column, row greater", () => {
    expect(classifyZone(4, 0, 4)).toBe("below");
  });
});
