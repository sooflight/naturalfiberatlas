import { describe, expect, it } from "vitest";
import {
  clampStoryboardTileWidth,
  reorderStoryboardUrls,
} from "./AdminProfileStoryboard";

describe("AdminProfileStoryboard behavior", () => {
  it("clamps zoom width to minimum", () => {
    expect(clampStoryboardTileWidth(20)).toBe(120);
  });

  it("clamps zoom width to maximum", () => {
    expect(clampStoryboardTileWidth(900)).toBe(360);
  });

  it("reorders media when dropping to another index", () => {
    const next = reorderStoryboardUrls(["a", "b", "c"], 0, 2);
    expect(next).toEqual(["b", "c", "a"]);
  });

  it("returns same list when source and target match", () => {
    const input = ["a", "b", "c"];
    expect(reorderStoryboardUrls(input, 1, 1)).toBe(input);
  });
});
