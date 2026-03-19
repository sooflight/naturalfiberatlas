import type { CommandContext, CommandHandlers, WorkbenchCommand } from "./types";

export interface CommandExecutionResult {
  ok: boolean;
  commandId: string;
  reason?: "precondition_failed" | "execution_failed";
  error?: unknown;
}

export async function executeWorkbenchCommand(
  command: WorkbenchCommand,
  handlers: CommandHandlers,
  context: CommandContext,
): Promise<CommandExecutionResult> {
  if (command.isAvailable && !command.isAvailable(context)) {
    return {
      ok: false,
      commandId: command.id,
      reason: "precondition_failed",
    };
  }

  try {
    await command.run(handlers, context);
    return {
      ok: true,
      commandId: command.id,
    };
  } catch (error) {
    return {
      ok: false,
      commandId: command.id,
      reason: "execution_failed",
      error,
    };
  }
}
