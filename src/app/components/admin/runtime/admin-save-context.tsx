import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { markRetryAction, markTaskComplete, markTaskError, markTaskStart } from "./admin-metrics";

export type AdminSaveStatus = "idle" | "saving" | "saved" | "error";
export type AdminSaveScope = "workspace" | "images" | "fiber" | "batch";
export type AdminSaveRiskLevel = "low" | "medium" | "high";

export interface AdminSaveIntent {
  reason?: string;
  scope?: AdminSaveScope;
  riskLevel?: AdminSaveRiskLevel;
  affectedEntities?: string[];
}

export interface NormalizedAdminSaveIntent {
  reason: string;
  scope: AdminSaveScope;
  riskLevel: AdminSaveRiskLevel;
  affectedEntities: string[];
}

export function normalizeAdminSaveIntent(
  intent?: AdminSaveIntent,
): NormalizedAdminSaveIntent {
  return {
    reason: intent?.reason?.trim() || "unspecified",
    scope: intent?.scope ?? "workspace",
    riskLevel: intent?.riskLevel ?? "medium",
    affectedEntities: intent?.affectedEntities ?? [],
  };
}

interface AdminSaveContextValue {
  isDirty: boolean;
  saveStatus: AdminSaveStatus;
  error: string | null;
  lastIntent: NormalizedAdminSaveIntent;
  markDirty: () => void;
  markSaved: () => void;
  setError: (message: string) => void;
  triggerSave: (intent?: AdminSaveIntent) => Promise<void>;
}

const AdminSaveContext = createContext<AdminSaveContextValue | null>(null);

interface AdminSaveProviderProps {
  children: ReactNode;
  onSave?: () => Promise<void> | void;
}

export function AdminSaveProvider({ children, onSave }: AdminSaveProviderProps) {
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AdminSaveStatus>("idle");
  const [error, setErrorState] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<NormalizedAdminSaveIntent>(() =>
    normalizeAdminSaveIntent(),
  );
  const inFlightRef = useRef<Promise<void> | null>(null);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus("idle");
    setErrorState(null);
  }, []);

  const markSaved = useCallback(() => {
    setIsDirty(false);
    setSaveStatus("saved");
    setErrorState(null);
  }, []);

  const setError = useCallback((message: string) => {
    setErrorState(message);
    setSaveStatus("error");
  }, []);

  const triggerSave = useCallback(async (intent?: AdminSaveIntent) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    const normalizedIntent = normalizeAdminSaveIntent(intent);
    setLastIntent(normalizedIntent);
    if (saveStatus === "error") {
      markRetryAction("edit_save", error ?? normalizedIntent.reason);
    }
    const routeContext = { route: window.location.pathname };
    markTaskStart("edit_save", routeContext);

    const promise = (async () => {
      setSaveStatus("saving");
      setErrorState(null);
      try {
        await onSave?.();
        setIsDirty(false);
        setSaveStatus("saved");
        markTaskComplete("edit_save", routeContext);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        setErrorState(message);
        setSaveStatus("error");
        markTaskError("edit_save", message, routeContext);
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [error, onSave, saveStatus]);

  const value = useMemo<AdminSaveContextValue>(
    () => ({
      isDirty,
      saveStatus,
      error,
      lastIntent,
      markDirty,
      markSaved,
      setError,
      triggerSave,
    }),
    [
      error,
      isDirty,
      lastIntent,
      markDirty,
      markSaved,
      saveStatus,
      setError,
      triggerSave,
    ],
  );

  return (
    <AdminSaveContext.Provider value={value}>{children}</AdminSaveContext.Provider>
  );
}

export function useAdminSave(): AdminSaveContextValue {
  const ctx = useContext(AdminSaveContext);
  if (!ctx) {
    throw new Error("useAdminSave must be used within AdminSaveProvider.");
  }
  return ctx;
}

