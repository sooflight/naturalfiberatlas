import { describe, expect, it } from "vitest";
import {
  buildFindReplacePreflight,
  canUndoFindReplace,
} from "./batch-operations-utils";

describe("batch-operations-utils", () => {
  it("builds a preflight summary for find and replace", () => {
    const summary = buildFindReplacePreflight({
      field: "tags",
      search: "organic",
      replace: "regen",
      matchCount: 12,
    });

    expect(summary.title).toContain("Find & Replace preflight");
    expect(summary.notes.some((note) => note.includes("12"))).toBe(true);
  });

  it("only enables undo for valid operation windows", () => {
    const now = Date.now();
    expect(
      canUndoFindReplace({
        at: now - 2000,
        search: "organic",
        replace: "regen",
      }),
    ).toBe(true);
    expect(
      canUndoFindReplace({
        at: now - 90_000,
        search: "organic",
        replace: "regen",
      }),
    ).toBe(false);
  });
});
