import { describe, expect, it } from "vitest";
import { computePlateLayout, classifyZone } from "./plate-layout";
import { fiberIndex } from "../data/atlas-data";
import { getGalleryImages } from "../data/atlas-data";

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
});

describe("classifyZone", () => {
  it("classifies right when same row, column greater", () => {
    expect(classifyZone(1, 0, 4)).toBe("right");
  });

  it("classifies below when same column, row greater", () => {
    expect(classifyZone(4, 0, 4)).toBe("below");
  });
});
