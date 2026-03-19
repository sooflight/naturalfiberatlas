import type { LucideIcon } from "lucide-react";

// NEW: Unified view system
export type ViewMode = "list" | "grid" | "knowledge";

export type WorkbenchMode =
  | "browse"
  | "import"
  | "overview"
  | "settings"
  | "edit-profile"
  | "edit-knowledge"
  | "batch"
  | "health"
  | "diff"
  | "changesets"
  | "sequence"
  | "cards";

export interface CommandContext {
  mode: WorkbenchMode;
  hasSelection: boolean;
  selectionId?: string | null;
  inspectorOpen: boolean;
}

export interface CommandHandlers {
  navigate: (mode: WorkbenchMode) => void;
  setViewMode: (view: ViewMode) => void;
  triggerKnowledgeAction?: (action: "next-section" | "next-weak" | "toggle-reference" | "save-draft") => void;
  createPassport?: () => void;
  save: () => void;
  focusSearch: () => void;
  openInspector: () => void;
  closeInspector: () => void;
  toggleInspector: () => void;
}

export interface WorkbenchCommand {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  shortcut?: string;
  group: "navigation" | "inspect" | "selection" | "record" | "media" | "workflow" | "system" | "view";
  modes: Array<WorkbenchMode | "all">;
  isAvailable?: (context: CommandContext) => boolean;
  run: (handlers: CommandHandlers, context: CommandContext) => void | Promise<void>;
}
