import { describe, expect, it } from "vitest";
import {
  buildLayoutCandidatePool,
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

  it("places Identity (about) immediately left or right of the hero when the grid has 2+ columns", () => {
    const cols = 4;
    const filtered = fiberIndex.slice(0, 16);
    const visibility = makeVisibility(Array.from({ length: filtered.length + 40 }, (_, i) => i));
    for (let selectedIndex = 0; selectedIndex < filtered.length; selectedIndex++) {
      const selectedId = filtered[selectedIndex]!.id;
      const result = computePlateLayout(selectedId, filtered, cols, visibility);
      const aboutCell = [...result.plateAssignments.entries()].find(([, pt]) => pt === "about")?.[0];
      expect(aboutCell, `about missing for ${selectedId}`).toBeDefined();
      const zone = classifyZone(aboutCell!, selectedIndex, cols);
      expect(zone === "right" || zone === "left").toBe(true);
    }
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
    const allCandidates = [...real, ...virtual].sort((a, b) => a - b);
    const expectedPool = [...buildLayoutCandidatePool(allCandidates, poolSize, selectedIndex, cols)].sort(
      (a, b) => a - b,
    );

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

  it("assigns one quote cell per 3 quotes with distinct chunk slot indices", () => {
    dataSource.resetToDefaults();
    dataSource.updateQuoteData("lotus", [
      { text: "Quote one.", attribution: "A" },
      { text: "Quote two.", attribution: "B" },
      { text: "Quote three.", attribution: "C" },
      { text: "Quote four.", attribution: "D" },
    ]);
    const cols = 4;
    const filtered = fiberIndex;
    const visibility = makeVisibility(Array.from({ length: filtered.length + 40 }, (_, i) => i));
    const result = computePlateLayout("lotus", filtered, cols, visibility);
    const quoteCells = [...result.plateAssignments.entries()].filter(([, pt]) => pt === "quote");
    expect(quoteCells.length).toBe(2);
    const slots = quoteCells.map(([cell]) => result.quoteChunkSlotByCell.get(cell)).sort();
    expect(slots).toEqual([0, 1]);
    dataSource.resetToDefaults();
  });

  it("places one contactSheet cell per 12-image gallery chunk with correct global offsets", () => {
    const cols = 4;
    const filtered = fiberIndex.filter((f) => ["hemp", "jute", "flax-linen"].includes(f.id));
    const selectedId = "hemp";
    const visibility = makeVisibility(Array.from({ length: 40 }, (_, i) => i));
    const many: GalleryImageEntry[] = Array.from({ length: 27 }, (_, i) => ({
      url: `https://example.com/x/${i}.jpg`,
    }));
    const result = computePlateLayout(selectedId, filtered, cols, visibility, many);
    const contactCells = [...result.plateAssignments.entries()].filter(([, pt]) => pt === "contactSheet");
    expect(contactCells.length).toBe(3);
    const starts = [...result.gallerySlotStartIndex.values()].sort((a, b) => a - b);
    expect(starts).toEqual([0, 12, 24]);
    const totalThumbs = [...result.gallerySlotImages.values()].reduce((n, imgs) => n + imgs.length, 0);
    expect(totalThumbs).toBe(27);
  });

  it("omits a final contactSheet when the gallery tail is 1–2 images after full dozens", () => {
    const cols = 4;
    const filtered = fiberIndex.filter((f) => ["hemp", "jute", "flax-linen"].includes(f.id));
    const selectedId = "hemp";
    const visibility = makeVisibility(Array.from({ length: 40 }, (_, i) => i));
    const twentyFive: GalleryImageEntry[] = Array.from({ length: 25 }, (_, i) => ({
      url: `https://example.com/x/${i}.jpg`,
    }));
    const r25 = computePlateLayout(selectedId, filtered, cols, visibility, twentyFive);
    expect(
      [...r25.plateAssignments.values()].filter((pt) => pt === "contactSheet").length,
    ).toBe(2);
    expect(
      [...r25.gallerySlotImages.values()].reduce((n, imgs) => n + imgs.length, 0),
    ).toBe(24);

    const twentySix: GalleryImageEntry[] = Array.from({ length: 26 }, (_, i) => ({
      url: `https://example.com/y/${i}.jpg`,
    }));
    const r26 = computePlateLayout(selectedId, filtered, cols, visibility, twentySix);
    expect(
      [...r26.plateAssignments.values()].filter((pt) => pt === "contactSheet").length,
    ).toBe(2);
    expect(
      [...r26.gallerySlotImages.values()].reduce((n, imgs) => n + imgs.length, 0),
    ).toBe(24);
  });
});

describe("chunkGalleryForContactSheets", () => {
  it(`splits into chunks of up to ${CONTACT_SHEET_MAX_IMAGES_PER_CARD} with correct startIndex`, () => {
    const imgs: GalleryImageEntry[] = Array.from({ length: 27 }, (_, i) => ({
      url: `https://example.com/g/${i}.jpg`,
    }));
    const q = chunkGalleryForContactSheets(imgs);
    expect(q.length).toBe(3);
    expect(q[0]!.images.length).toBe(12);
    expect(q[1]!.images.length).toBe(12);
    expect(q[2]!.images.length).toBe(3);
    expect(q[0]!.startIndex).toBe(0);
    expect(q[1]!.startIndex).toBe(12);
    expect(q[2]!.startIndex).toBe(24);
  });

  it("drops a 1–2 image tail after full cards (lightbox-only)", () => {
    const twentyFive: GalleryImageEntry[] = Array.from({ length: 25 }, (_, i) => ({
      url: `https://example.com/g/${i}.jpg`,
    }));
    const q25 = chunkGalleryForContactSheets(twentyFive);
    expect(q25.length).toBe(2);
    expect(q25[0]!.images.length).toBe(12);
    expect(q25[1]!.images.length).toBe(12);
    expect(q25[1]!.startIndex).toBe(12);

    const twentySix: GalleryImageEntry[] = Array.from({ length: 26 }, (_, i) => ({
      url: `https://example.com/h/${i}.jpg`,
    }));
    const q26 = chunkGalleryForContactSheets(twentySix);
    expect(q26.length).toBe(2);
    expect(q26[1]!.images.length).toBe(12);
  });

  it("still shows a single partial card when there is no prior full dozen", () => {
    const two: GalleryImageEntry[] = [
      { url: "https://example.com/a.jpg" },
      { url: "https://example.com/b.jpg" },
    ];
    const q = chunkGalleryForContactSheets(two);
    expect(q.length).toBe(1);
    expect(q[0]!.images.length).toBe(2);
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
