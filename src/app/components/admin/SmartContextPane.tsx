import { useMemo } from "react";
import type { WorkbenchMode } from "@/components/database-interface/commands/types";
import { WorkbenchInspectorDrawer } from "./WorkbenchInspectorDrawer";
import { buildInspectorContext } from "./inspector/adapters";
import { PlatePreviewPanel } from "./plate-preview-panel";
import { useAtlasData } from "../../context/atlas-data-context";

interface SmartContextPaneProps {
  isOpen: boolean;
  onClose: () => void;
  mode: WorkbenchMode;
  selectionId: string | null;
  onAction?: (commandId: string) => void;
}

export function SmartContextPane({
  isOpen,
  onClose,
  mode,
  selectionId,
  onAction,
}: SmartContextPaneProps) {
  const inspectorContext = useMemo(
    () => buildInspectorContext({ mode, selectionId }),
    [mode, selectionId],
  );
  const { getFiberById } = useAtlasData();
  const fiber = selectionId ? getFiberById(selectionId) : undefined;

  if (!isOpen) {
    return null;
  }

  if (mode === "edit-knowledge" && fiber) {
    return (
      <aside className="pointer-events-auto absolute right-0 top-0 z-40 h-full w-[360px] border-l border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-md">
        <PlatePreviewPanel
          fiber={fiber}
          onScrollToEditorSection={(section) => {
            window.dispatchEvent(new CustomEvent("admin:scroll-to-section", { detail: section }));
          }}
        />
      </aside>
    );
  }

  return (
    <WorkbenchInspectorDrawer
      isOpen={isOpen}
      onClose={onClose}
      context={inspectorContext}
      onAction={onAction}
    />
  );
}
