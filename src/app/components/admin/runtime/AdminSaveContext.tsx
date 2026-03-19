import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type AdminSaveStatus = "idle" | "saving" | "saved" | "error";

interface AdminSaveSurface {
  isDirty: boolean;
  saveStatus: AdminSaveStatus;
  save: () => Promise<void>;
}

interface AdminSaveContextValue {
  hasActiveSurface: boolean;
  isDirty: boolean;
  saveStatus: AdminSaveStatus;
  triggerSave: () => Promise<void>;
  registerActiveSurface: (surface: AdminSaveSurface) => () => void;
}

const AdminSaveContext = createContext<AdminSaveContextValue | null>(null);

export function AdminSaveProvider({ children }: { children: React.ReactNode }) {
  const [hasActiveSurface, setHasActiveSurface] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AdminSaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const activeSurfaceRef = useRef<AdminSaveSurface | null>(null);
  const inFlightSaveRef = useRef(false);

  const registerActiveSurface = useCallback((surface: AdminSaveSurface) => {
    activeSurfaceRef.current = surface;
    setHasActiveSurface(true);
    setIsDirty(surface.isDirty);
    setSaveStatus(surface.saveStatus);
    return () => {
      if (activeSurfaceRef.current === surface) {
        activeSurfaceRef.current = null;
        setHasActiveSurface(false);
        setIsDirty(false);
        setSaveStatus("idle");
      }
    };
  }, []);

  const triggerSave = useCallback(async () => {
    const activeSurface = activeSurfaceRef.current;
    if (!activeSurface || inFlightSaveRef.current) return;
    inFlightSaveRef.current = true;
    setSaveStatus("saving");
    try {
      await activeSurface.save();
      setSaveStatus("saved");
      setIsDirty(false);
    } catch {
      setSaveStatus("error");
    } finally {
      inFlightSaveRef.current = false;
    }
  }, []);

  const value = useMemo<AdminSaveContextValue>(() => ({
    hasActiveSurface,
    isDirty,
    saveStatus,
    triggerSave,
    registerActiveSurface,
  }), [hasActiveSurface, isDirty, saveStatus, triggerSave, registerActiveSurface]);

  return (
    <AdminSaveContext.Provider value={value}>
      {children}
    </AdminSaveContext.Provider>
  );
}

export function useAdminSave(): AdminSaveContextValue {
  const ctx = useContext(AdminSaveContext);
  if (!ctx) throw new Error("useAdminSave must be used within AdminSaveProvider");
  return ctx;
}
