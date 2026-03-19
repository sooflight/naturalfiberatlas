import { createContext, useContext, useState, useCallback } from "react";

// Always advanced mode - simple mode removed per user request
const EditorModeContext = createContext<{ recordExpansion: (sectionId: string) => void } | null>(null);

export function EditorModeProvider({ children }: { children: React.ReactNode }) {
  const [expansionCount, setExpansionCount] = useState<Record<string, number>>({});

  const recordExpansion = useCallback((sectionId: string) => {
    setExpansionCount((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] || 0) + 1,
    }));
  }, []);

  const value = {
    recordExpansion,
  };

  return (
    <EditorModeContext.Provider value={value}>
      {children}
    </EditorModeContext.Provider>
  );
}

export function useEditorMode() {
  const ctx = useContext(EditorModeContext);
  if (!ctx) {
    throw new Error("useEditorMode must be used within EditorModeProvider");
  }
  return ctx;
}
