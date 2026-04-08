import { describe, expect, it } from "vitest";
import {
  PROFILE_RECEDE_SECONDS,
  computeDetailShellRevealDelay,
  shouldHydrateDetailSlotDuringInhale,
} from "./detail-hydration";

describe("shouldHydrateDetailSlotDuringInhale", () => {
  it("always hydrates non-virtual slots", () => {
    expect(
      shouldHydrateDetailSlotDuringInhale({
        detailInhalePhase: "pre_raster",
        isVirtual: false,
        top: 5_000,
        bottom: 5_400,
        viewportHeight: 900,
      }),
    ).toBe(true);
  });

  it("defers offscreen virtual slots during inhale phases", () => {
    expect(
      shouldHydrateDetailSlotDuringInhale({
        detailInhalePhase: "revealing",
        isVirtual: true,
        top: 2_200,
        bottom: 2_600,
        viewportHeight: 900,
      }),
    ).toBe(false);
  });

  it("hydrates near-viewport virtual slots during inhale phases", () => {
    expect(
      shouldHydrateDetailSlotDuringInhale({
        detailInhalePhase: "backdrop_on",
        isVirtual: true,
        top: 1_500,
        bottom: 1_900,
        viewportHeight: 900,
      }),
    ).toBe(true);
  });

  it("hydrates virtual slots once settled", () => {
    expect(
      shouldHydrateDetailSlotDuringInhale({
        detailInhalePhase: "settled",
        isVirtual: true,
        top: 2_200,
        bottom: 2_600,
        viewportHeight: 900,
      }),
    ).toBe(true);
  });
});

describe("computeDetailShellRevealDelay", () => {
  it("adds profile recede delay when motion is enabled", () => {
    expect(computeDetailShellRevealDelay(0.2, false)).toBeCloseTo(0.2 + PROFILE_RECEDE_SECONDS);
  });

  it("does not add profile recede delay for reduced motion", () => {
    expect(computeDetailShellRevealDelay(0.2, true)).toBeCloseTo(0.2);
  });

  it("clamps negative detail delays", () => {
    expect(computeDetailShellRevealDelay(-0.4, true)).toBe(0);
  });
});
