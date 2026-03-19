import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type WorkbenchMode =
  | "browse"
  | "edit-profile"
  | "import"
  | "overview"
  | "settings";

export type AdminWorkflowPhase = "discover" | "inspect" | "edit" | "validate" | "commit";

export type WorkbenchViewMode = "list" | "grid" | "knowledge";

export type KnowledgeActionType =
  | "next-section"
  | "next-weak"
  | "toggle-reference"
  | "save-draft";

export interface KnowledgeActionEvent {
  action: KnowledgeActionType;
  at: number;
}

export interface WorkbenchStateValue {
  mode: WorkbenchMode;
  setMode: (mode: WorkbenchMode) => void;
  workflowPhase: AdminWorkflowPhase;
  selectionId: string | null;
  setSelectionId: (id: string | null) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  viewMode: WorkbenchViewMode;
  setViewMode: (viewMode: WorkbenchViewMode) => void;
  goToPreviousSelection: () => void;
  knowledgeAction: KnowledgeActionEvent | null;
  triggerKnowledgeAction: (action: KnowledgeActionType) => void;
}

const WorkbenchStateContext = createContext<WorkbenchStateValue | null>(null);
const STORAGE_KEY = "atlas:workbench-state";

export function mapWorkbenchModeToWorkflowPhase(mode: WorkbenchMode): AdminWorkflowPhase {
  switch (mode) {
    case "browse":
      return "discover";
    case "overview":
      return "inspect";
    case "edit-profile":
    case "import":
      return "edit";
    case "settings":
      return "commit";
    default:
      return "discover";
  }
}

function readPersistedState(): {
  mode: WorkbenchMode;
  selectionId: string | null;
  inspectorOpen: boolean;
  viewMode: WorkbenchViewMode;
} | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return null;
    const mode = parsed.mode as WorkbenchMode;
    const selectionId = typeof parsed.selectionId === "string" ? parsed.selectionId : null;
    const inspectorOpen = Boolean(parsed.inspectorOpen);
    const viewMode = parsed.viewMode as WorkbenchViewMode;
    const validModes: WorkbenchMode[] = ["browse", "edit-profile", "import", "overview", "settings"];
    const validViews: WorkbenchViewMode[] = ["list", "grid", "knowledge"];
    if (!validModes.includes(mode) || !validViews.includes(viewMode)) return null;
    return { mode, selectionId, inspectorOpen, viewMode };
  } catch {
    return null;
  }
}

export function WorkbenchStateProvider({ children }: { children: ReactNode }) {
  const persisted = readPersistedState();
  const [mode, setMode] = useState<WorkbenchMode>(persisted?.mode ?? "browse");
  const [selectionId, setSelectionIdState] = useState<string | null>(persisted?.selectionId ?? null);
  const selectionIdRef = useRef<string | null>(persisted?.selectionId ?? null);
  const [inspectorOpen, setInspectorOpen] = useState(persisted?.inspectorOpen ?? false);
  const [viewMode, setViewMode] = useState<WorkbenchViewMode>(persisted?.viewMode ?? "grid");
  const [selectionHistory, setSelectionHistory] = useState<string[]>([]);
  const selectionHistoryRef = useRef<string[]>([]);
  const [knowledgeAction, setKnowledgeAction] = useState<KnowledgeActionEvent | null>(
    null,
  );
  const workflowPhase = useMemo(() => mapWorkbenchModeToWorkflowPhase(mode), [mode]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode, selectionId, inspectorOpen, viewMode }),
    );
  }, [inspectorOpen, mode, selectionId, viewMode]);

  const setSelectionId = useCallback((nextId: string | null) => {
    const previous = selectionIdRef.current;
    if (previous && previous !== nextId) {
      const updated = [...selectionHistoryRef.current, previous].slice(-8);
      selectionHistoryRef.current = updated;
      setSelectionHistory(updated);
    }
    selectionIdRef.current = nextId;
    setSelectionIdState(nextId);
  }, []);

  const goToPreviousSelection = useCallback(() => {
    if (selectionHistoryRef.current.length === 0) return;
    const previous = selectionHistoryRef.current[selectionHistoryRef.current.length - 1] ?? null;
    const remaining = selectionHistoryRef.current.slice(0, -1);
    selectionHistoryRef.current = remaining;
    setSelectionHistory(remaining);
    selectionIdRef.current = previous;
    setSelectionIdState(previous);
  }, []);

  const triggerKnowledgeAction = useCallback((action: KnowledgeActionType) => {
    setKnowledgeAction({ action, at: Date.now() });
  }, []);

  const value = useMemo<WorkbenchStateValue>(
    () => ({
      mode,
      setMode,
      workflowPhase,
      selectionId,
      setSelectionId,
      inspectorOpen,
      setInspectorOpen,
      viewMode,
      setViewMode,
      goToPreviousSelection,
      knowledgeAction,
      triggerKnowledgeAction,
    }),
    [
      mode,
      workflowPhase,
      selectionId,
      inspectorOpen,
      viewMode,
      goToPreviousSelection,
      knowledgeAction,
      triggerKnowledgeAction,
    ],
  );

  return (
    <WorkbenchStateContext.Provider value={value}>
      {children}
    </WorkbenchStateContext.Provider>
  );
}

export function useWorkbenchState(): WorkbenchStateValue {
  const ctx = useContext(WorkbenchStateContext);
  if (!ctx) {
    throw new Error("useWorkbenchState must be used within WorkbenchStateProvider.");
  }
  return ctx;
}

