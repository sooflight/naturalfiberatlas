import { describe, expect, it } from "vitest";
import { computeDetailGridRenderPlan, getDetailSlotClassSuffix } from "./detail-slot-classes";

describe("getDetailSlotClassSuffix", () => {
  it("maps phases to CSS modifier tokens", () => {
    expect(getDetailSlotClassSuffix("idle")).toBe("");
    expect(getDetailSlotClassSuffix("pre_raster")).toContain("render-before-reveal");
    expect(getDetailSlotClassSuffix("pre_raster")).toContain("backdrop-deferred");
    expect(getDetailSlotClassSuffix("revealing")).toContain("detail-primed");
    expect(getDetailSlotClassSuffix("backdrop_on")).toBe(" detail-primed");
    expect(getDetailSlotClassSuffix("settled")).toBe(" detail-settled");
  });
});

describe("computeDetailGridRenderPlan", () => {
  it("uses filtered length when not in detail mode", () => {
    const m = new Map<number, "about">([[5, "about"]]);
    const { indices } = computeDetailGridRenderPlan(3, m, false);
    expect(indices).toEqual([0, 1, 2]);
  });

  it("extends indices when detail mode needs virtual cells", () => {
    const m = new Map<number, "about">([[5, "about"]]);
    const { indices } = computeDetailGridRenderPlan(3, m, true);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
