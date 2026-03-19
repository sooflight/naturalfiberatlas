import { describe, expect, it } from "vitest";
import { createWorkbenchCommands, getAvailableCommands } from "./registry";
import type { CommandContext } from "./types";

describe("createWorkbenchCommands", () => {
  it("includes command-first inspector actions", () => {
    const commands = createWorkbenchCommands();
    const ids = new Set(commands.map((c) => c.id));
    expect(ids.has("inspect.toggle")).toBe(true);
    expect(ids.has("inspect.current")).toBe(true);
  });

  it("filters mode and selection preconditions", () => {
    const commands = createWorkbenchCommands();
    const context: CommandContext = {
      mode: "browse",
      hasSelection: false,
      selectionId: null,
      inspectorOpen: false,
    };

    const available = getAvailableCommands(commands, context).map((c) => c.id);
    expect(available).toContain("inspect.toggle");
    expect(available).not.toContain("inspect.current");
  });

  describe("View commands", () => {
    it("has commands for switching to each view", () => {
      const commands = createWorkbenchCommands();
      const viewCommands = commands.filter(c => c.id.startsWith("view."));

      expect(viewCommands.map(c => c.id)).toContain("view.list");
      expect(viewCommands.map(c => c.id)).toContain("view.grid");
      expect(viewCommands.map(c => c.id)).toContain("view.knowledge");
    });

    it("view commands have correct shortcuts", () => {
      const commands = createWorkbenchCommands();
      const listCmd = commands.find(c => c.id === "view.list");
      const gridCmd = commands.find(c => c.id === "view.grid");
      const knowledgeCmd = commands.find(c => c.id === "view.knowledge");

      expect(listCmd?.shortcut).toBe("1");
      expect(gridCmd?.shortcut).toBe("2");
      expect(knowledgeCmd?.shortcut).toBe("3");
    });

    it("removed deprecated knowledge-base navigation command", () => {
      const commands = createWorkbenchCommands();
      const deprecatedCmd = commands.find(c => c.id === "nav.knowledgeBase");
      expect(deprecatedCmd).toBeUndefined();
    });
  });

  describe("Knowledge workflow commands", () => {
    it("includes command actions for deep knowledge editing", () => {
      const commands = createWorkbenchCommands();
      const ids = commands.map((c) => c.id);
      expect(ids).toContain("knowledge.nextSection");
      expect(ids).toContain("knowledge.nextWeak");
      expect(ids).toContain("knowledge.toggleReference");
      expect(ids).toContain("knowledge.saveDraft");
    });
  });
});
