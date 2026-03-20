import { describe, it, expect } from "vitest";
import { fibers } from "../../data/fibers";
import fiberOrderFile from "../../data/fiber-order.json";

describe("catalog integrity (Tier A)", () => {
  it("fiber-order.json global lists only fiber ids present in fibers.ts", () => {
    const ids = new Set(fibers.map((f) => f.id));
    const fo = fiberOrderFile as { global?: string[] };
    for (const id of fo.global ?? []) {
      expect(ids.has(id), `fiber-order.json unknown id: ${id}`).toBe(true);
    }
  });
});
