import { describe, expect, it } from "vitest";

import { resolveRegionDots } from "./map-helpers";

describe("resolveRegionDots", () => {
  it("places Caribbean / Central American countries that were missing from REGION_MAP", () => {
    const dots = resolveRegionDots(["Cuba", "El Salvador", "Belize"]);
    expect(dots.map((d) => d.x)).toEqual([102, 91, 91]);
    expect(dots.every((d) => d.y > 60 && d.y < 80)).toBe(true);
  });

  it("does not split commas inside parenthetical qualifiers (string or array)", () => {
    expect(resolveRegionDots("India (Assam, Meghalaya)")).toEqual([
      { x: 258, y: 67, label: "India" },
    ]);
    expect(resolveRegionDots(["India (Assam, Meghalaya)"])).toEqual([
      { x: 258, y: 67, label: "India" },
    ]);
  });

  it("resolves country from trailing qualifier via lookup", () => {
    expect(resolveRegionDots(["Mexico (Yucatán)"])[0]).toMatchObject({ x: 78, y: 65 });
  });
});
