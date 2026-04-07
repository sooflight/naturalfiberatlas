import { describe, expect, it } from "vitest";
import { getGridProfileImageLoadingFlags } from "./grid-profile-image-priority";

describe("getGridProfileImageLoadingFlags", () => {
  it("orders high fetch priority before the wider eager band (normal profile)", () => {
    const cols = 4;
    const highCutoff = Math.max(8, cols * 2);
    const eagerCutoff = Math.min(36, Math.max(16, cols * 5));
    expect(highCutoff).toBe(8);
    expect(eagerCutoff).toBe(20);

    expect(getGridProfileImageLoadingFlags(0, cols, "normal").fetchPriorityHigh).toBe(true);
    expect(getGridProfileImageLoadingFlags(7, cols, "normal").fetchPriorityHigh).toBe(true);
    expect(getGridProfileImageLoadingFlags(8, cols, "normal").fetchPriorityHigh).toBe(false);

    expect(getGridProfileImageLoadingFlags(8, cols, "normal").eagerLoading).toBe(true);
    expect(getGridProfileImageLoadingFlags(19, cols, "normal").eagerLoading).toBe(true);
    expect(getGridProfileImageLoadingFlags(20, cols, "normal").eagerLoading).toBe(false);
  });

  it("clamps column count to at least 1", () => {
    expect(getGridProfileImageLoadingFlags(0, 0, "normal").eagerLoading).toBe(true);
  });

  it("shrinks bands on slow and data-saver profiles", () => {
    const cols = 4;
    expect(getGridProfileImageLoadingFlags(3, cols, "slow").fetchPriorityHigh).toBe(true);
    expect(getGridProfileImageLoadingFlags(4, cols, "slow").fetchPriorityHigh).toBe(false);

    expect(getGridProfileImageLoadingFlags(0, cols, "data-saver").fetchPriorityHigh).toBe(true);
    expect(getGridProfileImageLoadingFlags(2, cols, "data-saver").fetchPriorityHigh).toBe(false);
    expect(getGridProfileImageLoadingFlags(6, cols, "data-saver").eagerLoading).toBe(false);
  });
});
