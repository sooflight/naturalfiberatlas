import { describe, expect, it, vi } from "vitest";
import { executeAdminCommand } from "./executor";
import type { AdminCommand } from "./registry";

describe("executeAdminCommand", () => {
  it("guards selection-required commands", async () => {
    const handler = vi.fn();
    const command: AdminCommand = {
      id: "edit.open",
      label: "Open Editor",
      requiresSelection: true,
      run: handler,
    };

    const result = await executeAdminCommand(command, {
      selectionId: null,
      navigate: vi.fn(),
    });

    expect(result.ok).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
