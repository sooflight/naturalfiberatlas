import { describe, it, expect } from "vitest";
import { buildKnowledgeFibers } from "./Library";

describe("buildKnowledgeFibers", () => {
  it("includes profile IDs that exist only in Profiles data", () => {
    const fibers = [
      { id: "alpha", name: "Alpha", category: "fiber", image: "alpha.jpg" },
      { id: "beta", name: "Beta", category: "fiber", image: "beta.jpg" },
    ];

    const contentItems = [
      { id: "alpha" },
      { id: "beta" },
      { id: "gamma" },
    ];

    const result = buildKnowledgeFibers(fibers, contentItems, []);
    expect(result.map((item) => item.id)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("follows canonical fiberIndex order even when content order differs", () => {
    const fibers = [
      { id: "zeta", name: "Zeta", category: "fiber", image: "zeta.jpg" },
      { id: "alpha", name: "Alpha", category: "fiber", image: "alpha.jpg" },
      { id: "beta", name: "Beta", category: "fiber", image: "beta.jpg" },
    ];

    const contentItems = [{ id: "beta" }, { id: "zeta" }, { id: "alpha" }];

    const result = buildKnowledgeFibers(fibers, contentItems, []);
    expect(result.map((item) => item.id)).toEqual(["zeta", "alpha", "beta"]);
  });

  it("maps navigation parent profiles into a dedicated category", () => {
    const fibers = [
      { id: "fiber", name: "Fiber", category: "fiber", image: "fiber.jpg" },
      { id: "textile", name: "Textile", category: "textile", image: "textile.jpg" },
      { id: "hemp", name: "Hemp", category: "fiber", image: "hemp.jpg" },
    ];

    const contentItems = [{ id: "fiber" }, { id: "textile" }, { id: "hemp" }];
    const result = buildKnowledgeFibers(fibers, contentItems, []);

    // fiber is nav parent in admin atlas (fiber branch) → navigation-parent; textile is skipped in ROOT_NAV_IDS so stays textile
    expect(result.find((item) => item.id === "fiber")?.category).toBe("navigation-parent");
    expect(result.find((item) => item.id === "textile")?.category).toBe("textile");
    expect(result.find((item) => item.id === "hemp")?.category).toBe("fiber");
  });

  it("does not mark content-only profiles as uncategorized", () => {
    const fibers = [{ id: "hemp", name: "Hemp", category: "fiber", image: "hemp.jpg" }];
    const contentItems = [
      { id: "madder", nodeData: { category: "dye" } },
      { id: "textile" },
    ];

    const result = buildKnowledgeFibers(fibers, contentItems, []);
    expect(result.find((item) => item.id === "madder")?.category).toBe("dye");
    // textile: content-only with no nodeData/passport → fallbackCategory "fiber"
    expect(result.find((item) => item.id === "textile")?.category).toBe("fiber");
    expect(result.some((item) => item.category === "uncategorized")).toBe(false);
  });
});
