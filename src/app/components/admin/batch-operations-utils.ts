export interface FindReplacePreflightInput {
  field: string;
  search: string;
  replace: string;
  matchCount: number;
}

export interface FindReplacePreflight {
  title: string;
  notes: string[];
}

export interface FindReplaceUndoOperation {
  at: number;
  search: string;
  replace: string;
}

const UNDO_WINDOW_MS = 60_000;

export function buildFindReplacePreflight(input: FindReplacePreflightInput): FindReplacePreflight {
  return {
    title: "Find & Replace preflight",
    notes: [
      `Field: ${input.field}`,
      `Search term: "${input.search}"`,
      `Replace term: "${input.replace}"`,
      `${input.matchCount} fiber${input.matchCount === 1 ? "" : "s"} will be updated`,
    ],
  };
}

export function canUndoFindReplace(operation: FindReplaceUndoOperation, now = Date.now()): boolean {
  if (!operation.search || !operation.replace) return false;
  return now - operation.at <= UNDO_WINDOW_MS;
}
