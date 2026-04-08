import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { FiberIndexEntry, PlateType } from "../data/atlas-data";
import { useScreenPlateState } from "./use-screen-plate-state";

function makeFiber(id: string): FiberIndexEntry {
  return {
    id,
    name: id,
    category: "fiber",
    status: "published",
    tags: [],
    image: `https://example.com/${id}.jpg`,
    profilePills: {
      origin: "test",
      scientificName: "test",
      era: "test",
      plantPart: "test",
      handFeel: "test",
      fiberType: "test",
    },
  };
}

describe("useScreenPlateState", () => {
  it("resolves getCellRect for virtual indices via indexRefs when filtered has no fiber at that index", () => {
    const plateAssignments = new Map<number, PlateType>([
      [0, "about"],
      [5, "contactSheet"],
    ]);
    const filtered = [makeFiber("fiber-a"), makeFiber("fiber-b")];
    const cellRefs = { current: new Map<string, HTMLDivElement>() };
    const mockRect = { left: 10, top: 20, width: 100, height: 150 } as DOMRect;
    const mockEl = document.createElement("div");
    vi.spyOn(mockEl, "getBoundingClientRect").mockReturnValue(mockRect);
    const indexRefs = {
      current: new Map<number, HTMLDivElement>([[5, mockEl]]),
    };

    const { result } = renderHook(() =>
      useScreenPlateState(plateAssignments, new Map(), filtered, cellRefs, indexRefs),
    );

    const rect = result.current.getCellRect(5);
    expect(rect).toEqual(mockRect);
  });

  it("includes contact sheet and see also in fullscreen slide entries", () => {
    const plateAssignments = new Map<number, PlateType>([
      [0, "contactSheet"],
      [1, "about"],
      [2, "seeAlso"],
    ]);
    const filtered = [makeFiber("fiber-a"), makeFiber("fiber-b"), makeFiber("fiber-c")];
    const cellRefs = {
      current: new Map<string, HTMLDivElement>(),
    };
    const indexRefs = {
      current: new Map<number, HTMLDivElement>(),
    };

    const { result } = renderHook(() =>
      useScreenPlateState(plateAssignments, new Map(), filtered, cellRefs, indexRefs),
    );

    expect(result.current.screenPlateEntries.map((entry) => entry.plateType)).toEqual([
      "about",
      "seeAlso",
      "contactSheet",
    ]);
  });
});
