import { describe, expect, it, vi } from "vitest";
import { executeWorkbenchCommand } from "./executor";
import type { CommandContext, CommandHandlers, WorkbenchCommand } from "./types";

const baseContext: CommandContext = {
  mode: "browse",
  hasSelection: false,
  selectionId: null,
  inspectorOpen: false,
};

const handlers: CommandHandlers = {
  navigate: vi.fn(),
  setViewMode: vi.fn(),
  save: vi.fn(),
  focusSearch: vi.fn(),
  openInspector: vi.fn(),
  closeInspector: vi.fn(),
  toggleInspector: vi.fn(),
};

describe("executeWorkbenchCommand", () => {
  it("returns precondition failure when command is not available", async () => {
    const command: WorkbenchCommand = {
      id: "inspect.current",
      title: "Inspect",
      icon: (() => null) as never,
      group: "inspect",
      modes: ["all"],
      isAvailable: () => false,
      run: vi.fn(),
    };

    const result = await executeWorkbenchCommand(command, handlers, baseContext);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("precondition_failed");
  });

  it("runs command and returns success", async () => {
    const run = vi.fn();
    const command: WorkbenchCommand = {
      id: "record.find",
      title: "Find",
      icon: (() => null) as never,
      group: "record",
      modes: ["all"],
      run,
    };

    const result = await executeWorkbenchCommand(command, handlers, baseContext);
    expect(result.ok).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
