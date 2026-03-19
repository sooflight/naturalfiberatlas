import { describe, expect, it, vi } from "vitest";
import { buildCommandHandlers } from "./database-interface/CommandPalette";

describe("CommandPalette handlers", () => {
  it("uses explicit inspector open and close callbacks", () => {
    const onNavigate = vi.fn();
    const onSave = vi.fn();
    const onInspectorToggle = vi.fn();
    const onInspectorOpen = vi.fn();
    const onInspectorClose = vi.fn();

    const handlers = buildCommandHandlers({
      onNavigate,
      onSave,
      onInspectorToggle,
      onInspectorOpen,
      onInspectorClose,
    });

    handlers.openInspector();
    handlers.closeInspector();
    handlers.toggleInspector();

    expect(onInspectorOpen).toHaveBeenCalledTimes(1);
    expect(onInspectorClose).toHaveBeenCalledTimes(1);
    expect(onInspectorToggle).toHaveBeenCalledTimes(1);
  });
});
