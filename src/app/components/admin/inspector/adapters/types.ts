import type { AdminView } from "../../../../context/atlas-data-context";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
}

export interface HealthSummary {
  completenessScore: number;
  imageCount: number;
  issuesCount: number;
  warningsCount: number;
}

export interface AuditInfo {
  lastModified: number;
  source: "bundled" | "local" | "gist" | "blob";
  changeCount: number;
}

export interface InspectorContext {
  mode: AdminView;
  entityType: "fiber" | "batch-selection" | "changeset" | null;
  entityId: string | string[];
  entityName: string;
  version: number;
  summary: string;
  health: HealthSummary;
  actions: QuickAction[];
  audit: AuditInfo;
}

export interface InspectorAdapter<TSelection> {
  getContext(selection: TSelection): InspectorContext | null;
  isContextValid(context: InspectorContext): boolean;
}
