import type { WorkbenchMode } from "@/components/database-interface/commands/types";
import type { InspectorContext } from "./types";

interface InspectorAdapterInput {
  mode: WorkbenchMode;
  selectionId?: string | null;
}

function createContext(mode: WorkbenchMode, selectionId?: string | null): InspectorContext {
  switch (mode) {
    case "browse":
      return {
        mode,
        title: "Image Base Inspector",
        description: selectionId
          ? "Focused media and metadata for the current material."
          : "Select a material to inspect media quality, tags, and status.",
        selectionId,
        stats: [
          { label: "Selection", value: selectionId ?? "None" },
          { label: "Surface", value: "Image Base" },
        ],
        actions: [
          { id: "inspect-current", label: "Inspect Selection", commandId: "inspect.current" },
          { id: "open-import", label: "Open Import", commandId: "nav.import" },
        ],
      };
    case "import":
      return {
        mode,
        title: "Import Inspector",
        description: "Track ingestion workflow and batch results.",
        selectionId,
        stats: [
          { label: "Surface", value: "Import" },
          { label: "Queue", value: "Active" },
        ],
        actions: [
          { id: "toggle", label: "Toggle Inspector", commandId: "inspect.toggle" },
        ],
      };
    case "overview":
      return {
        mode,
        title: "Operations Inspector",
        description: "System-level rollup and operational quick actions.",
        selectionId,
        stats: [
          { label: "Surface", value: "Overview" },
          { label: "Selection", value: selectionId ?? "None" },
        ],
        actions: [
          { id: "open-settings", label: "Open Settings", commandId: "system.settings" },
          { id: "open-image-base", label: "Go to Image Base", commandId: "nav.imageBase" },
        ],
      };
    case "settings":
      return {
        mode,
        title: "Settings Inspector",
        description: "Preferences and workspace configuration.",
        selectionId: null,
        stats: [
          { label: "Surface", value: "Settings" },
          { label: "Profile", value: "Admin" },
        ],
        actions: [{ id: "open-workspace", label: "Back to Workspace", commandId: "nav.imageBase" }],
      };
    case "edit-profile":
    default:
      return {
        mode,
        title: "Editor Inspector",
        description: "Detail-level profile editing context.",
        selectionId,
        stats: [
          { label: "Surface", value: "Edit Profile" },
          { label: "Selection", value: selectionId ?? "None" },
        ],
        actions: [{ id: "search-records", label: "Find Record", commandId: "record.find" }],
      };
  }
}

export function buildInspectorContext(input: InspectorAdapterInput): InspectorContext {
  return createContext(input.mode, input.selectionId);
}
