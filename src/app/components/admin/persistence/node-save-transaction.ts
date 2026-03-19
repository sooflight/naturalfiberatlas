export interface NodeTransactionStep {
  id: string;
  run: () => Promise<void>;
  rollback: () => Promise<void>;
}

export async function executeNodeSaveTransaction(
  steps: NodeTransactionStep[],
): Promise<void> {
  const completed: NodeTransactionStep[] = [];

  for (const step of steps) {
    try {
      await step.run();
      completed.push(step);
    } catch (error) {
      for (const done of completed.reverse()) {
        await done.rollback();
      }
      throw error;
    }
  }
}

export interface ParityReport {
  ok: boolean;
  mismatches: string[];
}

export function verifyDualWriteParity(
  primary: Record<string, unknown>,
  shadow: Record<string, unknown>,
): ParityReport {
  const keys = Array.from(new Set([...Object.keys(primary), ...Object.keys(shadow)]));
  const mismatches: string[] = [];
  for (const key of keys) {
    const left = JSON.stringify(primary[key]);
    const right = JSON.stringify(shadow[key]);
    if (left !== right) {
      mismatches.push(key);
    }
  }
  return {
    ok: mismatches.length === 0,
    mismatches,
  };
}

export function buildReplayEnvelope(eventId: string, payload: unknown) {
  return {
    eventId,
    emittedAt: new Date().toISOString(),
    payload,
  };
}

