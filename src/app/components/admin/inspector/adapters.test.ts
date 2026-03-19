import { describe, expect, it } from "vitest";
import { buildInspectorContext } from "./adapters";

describe("buildInspectorContext", () => {
  it("builds browse context with selection details", () => {
    const context = buildInspectorContext({ mode: "browse", selectionId: "ramie" });
    expect(context.mode).toBe("browse");
    expect(context.selectionId).toBe("ramie");
    expect(context.actions.length).toBeGreaterThan(0);
  });

  it("builds settings context without selection", () => {
    const context = buildInspectorContext({ mode: "settings", selectionId: "ignored" });
    expect(context.mode).toBe("settings");
    expect(context.selectionId).toBeNull();
  });
});
