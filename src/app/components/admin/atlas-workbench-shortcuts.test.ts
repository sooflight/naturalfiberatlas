import { describe, expect, it } from "vitest";
import { shouldHandleHistoryShortcut, shouldToggleInspectorShortcut } from "./AtlasWorkbenchShell";

function makeEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key: "",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    target: null,
    ...overrides,
  } as KeyboardEvent;
}

describe("atlas workbench inspector shortcut", () => {
  it("does not toggle inspector on plain i", () => {
    const event = makeEvent({ key: "i" });
    expect(shouldToggleInspectorShortcut(event)).toBe(false);
  });

  it("toggles inspector on alt+i", () => {
    const event = makeEvent({ key: "i", altKey: true });
    expect(shouldToggleInspectorShortcut(event)).toBe(true);
  });

  it("does not toggle while typing in input controls", () => {
    const input = document.createElement("input");
    const event = makeEvent({ key: "i", altKey: true, target: input });
    expect(shouldToggleInspectorShortcut(event)).toBe(false);
  });
});

describe("atlas workbench undo/redo shortcuts", () => {
  it("maps cmd/ctrl+z to undo", () => {
    const event = makeEvent({ key: "z", metaKey: true });
    expect(shouldHandleHistoryShortcut(event)).toBe("undo");
  });

  it("maps cmd/ctrl+shift+z to redo", () => {
    const event = makeEvent({ key: "z", metaKey: true, shiftKey: true });
    expect(shouldHandleHistoryShortcut(event)).toBe("redo");
  });

  it("maps ctrl+y to redo", () => {
    const event = makeEvent({ key: "y", ctrlKey: true });
    expect(shouldHandleHistoryShortcut(event)).toBe("redo");
  });

  it("ignores history shortcuts while typing in inputs", () => {
    const textarea = document.createElement("textarea");
    const event = makeEvent({ key: "z", metaKey: true, target: textarea });
    expect(shouldHandleHistoryShortcut(event)).toBeNull();
  });
});
