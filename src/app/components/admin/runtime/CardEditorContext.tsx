import React, { createContext, useContext } from "react";

const CardEditorContext = createContext(false);

export function CardEditorProvider({ children }: { children: React.ReactNode }) {
  return (
    <CardEditorContext.Provider value={true}>
      {children}
    </CardEditorContext.Provider>
  );
}

export function useCardEditor() {
  return useContext(CardEditorContext);
}
