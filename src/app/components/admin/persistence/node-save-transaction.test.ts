import { describe, expect, it, vi } from "vitest";
import {
  executeNodeSaveTransaction,
  verifyDualWriteParity,
} from "./node-save-transaction";

describe("node-save-transaction", () => {
  it("rolls back on failure", async () => {
    const rollback = vi.fn(async () => undefined);
    await executeNodeSaveTransaction([
      { id: "a", run: async () => undefined, rollback },
      { id: "b", run: async () => { throw new Error("boom"); }, rollback: vi.fn() },
    ]).catch(() => undefined);

    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it("returns parity report details", () => {
    const report = verifyDualWriteParity(
      { id: "hemp", imageCount: 3, tags: ["a", "b"] },
      { id: "hemp", imageCount: 2, tags: ["a"] },
    );

    expect(report.ok).toBe(false);
    expect(report.mismatches.length).toBeGreaterThan(0);
  });
});
