import { useMemo } from "react";
import { UnifiedEditor } from "../../unified-editor";
import { useOptionalWorkbenchState } from "../../WorkbenchStateContext";

export default function CardEditorDomain() {
  const workbenchState = useOptionalWorkbenchState();
  const fiberId = useMemo(() => workbenchState?.selectionId ?? null, [workbenchState?.selectionId]);

  if (!fiberId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 bg-[#050505]">
        Select a profile from the sidebar to open the card editor.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-black">
      <UnifiedEditor fiberId={fiberId} />
    </div>
  );
}
