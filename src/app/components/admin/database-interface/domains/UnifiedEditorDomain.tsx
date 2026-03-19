import { UnifiedEditor } from "../../unified-editor";
import { useAdminSaveUnifiedEditorAdapter } from "@/hooks/useAdminSaveUnifiedEditorAdapter";

interface UnifiedEditorDomainProps {
  fiberId: string;
}

export default function UnifiedEditorDomain({ fiberId }: UnifiedEditorDomainProps) {
  const adapter = useAdminSaveUnifiedEditorAdapter();

  return (
    <UnifiedEditor
      fiberId={fiberId}
      onDirtyChange={adapter.setDirty}
      onSaveStatusChange={adapter.setEditorSaveState}
      onRegisterSave={adapter.registerSave}
    />
  );
}
