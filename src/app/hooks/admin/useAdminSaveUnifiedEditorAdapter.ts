import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminSave } from "@/contexts/AdminSaveContext";

type UnifiedEditorSaveState = "idle" | "pending" | "saved";

type AdapterSaveStatus = "idle" | "saving" | "saved" | "error";

function toAdminSaveStatus(state: UnifiedEditorSaveState, dirty: boolean): AdapterSaveStatus {
  if (dirty || state === "pending") {
    return "saving";
  }
  if (state === "saved") {
    return "saved";
  }
  return "idle";
}

export function useAdminSaveUnifiedEditorAdapter() {
  const adminSave = useAdminSave();
  const [dirty, setDirty] = useState(false);
  const [editorSaveState, setEditorSaveState] = useState<UnifiedEditorSaveState>("idle");
  const saveRef = useRef<() => void>(() => {});

  const registerSave = useCallback((save: () => void) => {
    saveRef.current = save;
  }, []);

  useEffect(() => {
    return adminSave.registerActiveSurface({
      isDirty: dirty,
      saveStatus: toAdminSaveStatus(editorSaveState, dirty),
      save: async () => {
        saveRef.current();
      },
    });
  }, [adminSave, dirty, editorSaveState]);

  return {
    setDirty,
    setEditorSaveState,
    registerSave,
  };
}
