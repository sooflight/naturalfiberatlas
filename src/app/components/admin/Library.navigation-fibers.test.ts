import { describe, expect, it } from "vitest";
import { buildKnowledgeFibers } from "./Library";

describe("buildKnowledgeFibers navigation coverage", () => {
  it("adds runtime navigation node entries that are missing from atlas fibers/content", () => {
    const result = buildKnowledgeFibers(
      [{ id: "hemp", name: "Hemp", category: "fiber" }],
      [{ id: "hemp" }],
      [
        {
          id: "fiber",
          label: "Fiber",
          children: [
            { id: "regen", label: "Regen" },
          ],
        },
      ],
    );

    expect(result.some((entry) => entry.id === "fiber")).toBe(true);
    expect(result.some((entry) => entry.id === "regen")).toBe(true);
  });
});
