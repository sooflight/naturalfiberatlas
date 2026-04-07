import { describe, expect, it } from "vitest";
import { insightExcerptFromAboutPart } from "./insight-excerpt";

describe("insightExcerptFromAboutPart", () => {
  it("for Origins, prefers the second sentence when the segment has several", () => {
    const part =
      "First idea here. Second sentence goes further. Third wraps up.";
    expect(insightExcerptFromAboutPart(part, 1)).toBe("Second sentence goes further.");
  });

  it("for Depth, uses the first sentence of that segment", () => {
    const part = "Depth opens here. Then continues.";
    expect(insightExcerptFromAboutPart(part, 2)).toBe("Depth opens here.");
  });

  it("for Origins with only one sentence in the segment, uses that sentence", () => {
    expect(insightExcerptFromAboutPart("Only one line here.", 1)).toBe("Only one line here.");
  });

  it("truncates a long sentence at a word boundary with ellipsis", () => {
    const long =
      "This is an intentionally verbose opening remark that keeps going " +
      "and going so that we exceed the excerpt limit and must trim it down " +
      "without breaking mid-word when possible.";
    const out = insightExcerptFromAboutPart(long, 2, 80);
    expect(out.length).toBeLessThanOrEqual(81);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/); // no space before ellipsis from trim
  });

  it("handles a segment with no sentence terminator", () => {
    expect(insightExcerptFromAboutPart("  fragment without period  ", 2)).toBe(
      "fragment without period",
    );
  });

  it("returns empty for blank", () => {
    expect(insightExcerptFromAboutPart("   ", 1)).toBe("");
  });
});
