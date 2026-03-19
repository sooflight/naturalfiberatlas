import type { WorkbenchMode } from "@/components/database-interface/commands/types";

export interface InspectorAction {
  id: string;
  label: string;
  commandId?: string;
}

export interface InspectorContext {
  mode: WorkbenchMode;
  title: string;
  description: string;
  selectionId?: string | null;
  stats: Array<{ label: string; value: string }>;
  actions: InspectorAction[];
}
