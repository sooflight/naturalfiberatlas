import type { AdminCommand, AdminCommandContext } from "./registry";

export interface CommandExecutionResult {
  ok: boolean;
  reason?: string;
}

export async function executeAdminCommand(
  command: AdminCommand,
  context: AdminCommandContext,
): Promise<CommandExecutionResult> {
  if (command.requiresSelection && !context.selectionId) {
    return {
      ok: false,
      reason: "selection_required",
    };
  }

  await command.run(context);
  return { ok: true };
}

