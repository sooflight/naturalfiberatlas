import { describe, expect, it } from "vitest";
import {
  saveConflictMessage,
  shouldAutoSaveNodeEditor,
  shouldPromptNodeSwitch,
} from "./NodeEditorTab";

describe("NodeEditorTab behavior contracts", () => {
  it("prompts on unsaved node switches only when target differs", () => {
    expect(shouldPromptNodeSwitch(true, "cotton", "hemp")).toBe(true);
    expect(shouldPromptNodeSwitch(true, "hemp", "hemp")).toBe(false);
    expect(shouldPromptNodeSwitch(false, "cotton", "hemp")).toBe(false);
    expect(shouldPromptNodeSwitch(true, "cotton", null)).toBe(false);
  });

  it("returns conflict copy for revision status responses", () => {
    expect(saveConflictMessage(409)).toContain("changed in another session");
    expect(saveConflictMessage(500)).toBeNull();
  });

  it("enables autosave only when editor is dirty and safe to save", () => {
    expect(shouldAutoSaveNodeEditor(true, "idle", false)).toBe(true);
    expect(shouldAutoSaveNodeEditor(false, "idle", false)).toBe(false);
    expect(shouldAutoSaveNodeEditor(true, "saving", false)).toBe(false);
    expect(shouldAutoSaveNodeEditor(true, "error", true)).toBe(false);
  });
});
