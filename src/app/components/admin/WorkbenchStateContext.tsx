import { createContext, useContext } from "react";
import type { ViewMode, WorkbenchMode } from "@/components/database-interface/commands/types";

export type KnowledgeAction = "next-section" | "next-weak" | "toggle-reference" | "save-draft";

export interface KnowledgeActionSignal {
  action: KnowledgeAction;
  at: number;
}

export interface WorkbenchStateValue {
  mode: WorkbenchMode;
  setMode: (mode: WorkbenchMode) => void;
  selectionId: string | null;
  setSelectionId: (selectionId: string | null) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean | ((previous: boolean) => boolean)) => void;
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
  knowledgeAction: KnowledgeActionSignal | null;
  triggerKnowledgeAction: (action: KnowledgeAction) => void;
}

const WorkbenchStateContext = createContext<WorkbenchStateValue | null>(null);

export const WorkbenchStateProvider = WorkbenchStateContext.Provider;

export function useOptionalWorkbenchState(): WorkbenchStateValue | null {
  return useContext(WorkbenchStateContext);
}

export function useWorkbenchState(): WorkbenchStateValue {
  const context = useOptionalWorkbenchState();
  if (!context) {
    throw new Error("useWorkbenchState must be used within WorkbenchStateProvider");
  }
  return context;
}
