import { describe, expect, it } from "vitest";
import { clamp01, previewFocalToObjectPosition } from "./preview-focal";

describe("previewFocalToObjectPosition", () => {
  it("emits percentage CSS", () => {
    expect(previewFocalToObjectPosition({ x: 0, y: 1 })).toBe("0% 100%");
    expect(previewFocalToObjectPosition({ x: 0.25, y: 0.75 })).toBe("25% 75%");
  });

  it("returns undefined for missing or invalid focal", () => {
    expect(previewFocalToObjectPosition(undefined)).toBeUndefined();
    expect(previewFocalToObjectPosition({ x: NaN, y: 0 })).toBeUndefined();
  });
});

describe("clamp01", () => {
  it("clamps to unit interval", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});
