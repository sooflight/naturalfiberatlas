/* @refresh reset */
/**
 * atlas-data-context.tsx — React context for reactive Atlas data.
 *
 * Wraps the AtlasDataSource (localStorage by default) and exposes
 * hooks that trigger re-renders when the underlying data changes.
 *
 * Extended with:
 *   - Undo/redo callbacks (C2)
 *   - Override translucency access (C1)
 *   - Admin workspace view state (C6)
 */

import React from "react";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  useMemo,
  useCallback,
  type ReactNode,
  type Context,
} from "react";
import {
  dataSource,
  type AtlasDataSource,
  type JournalEntry,
  type FiberOverrideSummary,
} from "../data/data-provider";
import type { FiberProfile } from "../data/fibers";
import type { FiberIndexEntry } from "../data/atlas-data";
import { classifyProfileCategory } from "../data/profile-sequencing";
import { isAdminEnabled } from "../config/admin-access";
import { resolveAdminRouteState } from "../components/admin/admin-route-contract";

/* ══════════════════════════════════════════════════════════
   Context shape
   ══════════════════════════════════════════════════════════ */

export type AdminView = "list" | "edit" | "changes" | "batch" | "health" | "staging" | "diff" | "changesets" | "sequence" | "knowledge";
export type AdminWorkflowPhase = "discover" | "inspect" | "edit" | "validate" | "commit";

export function mapAdminViewToWorkflowPhase(view: AdminView): AdminWorkflowPhase {
  switch (view) {
    case "list":
      return "discover";
    case "knowledge":
    case "sequence":
      return "inspect";
    case "edit":
    case "batch":
      return "edit";
    case "health":
    case "staging":
    case "diff":
      return "validate";
    case "changes":
    case "changesets":
      return "commit";
    default:
      return "discover";
  }
}

interface AtlasDataContextValue {
  source: AtlasDataSource;
  version: number;
  fibers: FiberProfile[];
  fiberIndex: FiberIndexEntry[];
  getFiberById: (id: string) => FiberProfile | undefined;
  updateFiber: (id: string, patch: Partial<FiberProfile>) => void;
  /* Admin mode */
  adminMode: boolean;
  setAdminMode: (on: boolean) => void;
  editingFiberId: string | null;
  setEditingFiberId: (id: string | null) => void;
  /* C6: Admin workspace view */
  adminView: AdminView;
  setAdminView: (view: AdminView) => void;
  workflowPhase: AdminWorkflowPhase;
  /* C2: Undo/redo */
  undo: () => JournalEntry | null;
  redo: () => JournalEntry | null;
  canUndo: boolean;
  canRedo: boolean;
  journal: JournalEntry[];
  /* C1: Override translucency */
  overrideSummary: FiberOverrideSummary[];
  overriddenFiberIds: string[];
  hasOverrides: boolean;
}

/**
 * Module-scoped context ref that survives HMR re-evaluation.
 */
const _ctxKey = "__AtlasDataContext__";
const AtlasDataContext: Context<AtlasDataContextValue | null> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any)[_ctxKey] ??
  ((globalThis as any)[_ctxKey] = createContext<AtlasDataContextValue | null>(null));

/* ══════════════════════════════════════════════════════════
   Provider
   ══════════════════════════════════════════════════════════ */

export function AtlasDataProvider({ children }: { children: ReactNode }) {
  const adminEnabled = isAdminEnabled();
  const isBrowser = typeof window !== "undefined";

  /* Subscribe to the data source for reactivity */
  const version = useSyncExternalStore(
    (cb) => dataSource.subscribe(cb),
    () => dataSource.getVersion(),
  );

  const fibers = useMemo(() => dataSource.getFibers(), [version]);

  const fiberIndex: FiberIndexEntry[] = useMemo(() => {
    const base = fibers.map((f) => ({
      id: f.id,
      name: f.name,
      image: f.image?.trim() || f.galleryImages?.[0]?.url || "",
      status: f.status ?? "published",
      category: classifyProfileCategory(f.id, f.category),
      profilePills: f.profilePills,
    }));
    /* C12: Apply hybrid sequence resolver (global baseline). */
    const resolvedIds = dataSource.resolveFiberOrder(base.map((fiber) => fiber.id));
    const byId = new Map(base.map((fiber) => [fiber.id, fiber]));
    return resolvedIds
      .map((id) => byId.get(id))
      .filter((fiber): fiber is FiberIndexEntry => !!fiber);
  }, [fibers, version]);

  const getFiberById = useCallback(
    (id: string) => dataSource.getFiberById(id),
    [version],
  );

  const updateFiber = useCallback(
    (id: string, patch: Partial<FiberProfile>) => dataSource.updateFiber(id, patch),
    [],
  );

  /* Admin state */
  const [adminMode, setAdminModeState] = useState(
    () =>
      adminEnabled &&
      isBrowser &&
      (new URLSearchParams(window.location.search).has("admin") ||
        resolveAdminRouteState(window.location.pathname) !== null),
  );
  const setAdminMode = useCallback(
    (on: boolean) => {
      setAdminModeState(adminEnabled ? on : false);
    },
    [adminEnabled],
  );
  const [editingFiberId, setEditingFiberId] = useState<string | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("list");
  const workflowPhase = useMemo(() => mapAdminViewToWorkflowPhase(adminView), [adminView]);

  /* C2: Undo/redo */
  const undo = useCallback(() => dataSource.undo(), []);
  const redo = useCallback(() => dataSource.redo(), []);
  const canUndo = useMemo(() => dataSource.canUndo(), [version]);
  const canRedo = useMemo(() => dataSource.canRedo(), [version]);
  const journal = useMemo(() => dataSource.getJournal(), [version]);

  /* C1: Override translucency */
  const overrideSummary = useMemo(() => dataSource.getOverrideSummary(), [version]);
  const overriddenFiberIds = useMemo(
    () => overrideSummary.map((summary) => summary.fiberId),
    [overrideSummary],
  );
  const hasOverrides = useMemo(() => dataSource.hasOverrides(), [version]);

  const value = useMemo<AtlasDataContextValue>(
    () => ({
      source: dataSource,
      version,
      fibers,
      fiberIndex,
      getFiberById,
      updateFiber,
      adminMode,
      setAdminMode,
      editingFiberId,
      setEditingFiberId,
      adminView,
      setAdminView,
      workflowPhase,
      undo,
      redo,
      canUndo,
      canRedo,
      journal,
      overrideSummary,
      overriddenFiberIds,
      hasOverrides,
    }),
    [
      version, fibers, fiberIndex, getFiberById, updateFiber,
      adminMode, setAdminMode, editingFiberId, adminView,
      workflowPhase,
      undo, redo, canUndo, canRedo, journal,
      overrideSummary, overriddenFiberIds, hasOverrides,
    ],
  );

  return (
    <AtlasDataContext.Provider value={value}>
      {children}
    </AtlasDataContext.Provider>
  );
}

/* ══════════════════════════════════════════════════════════
   Hooks
   ══════════════════════════════════════════════════════════ */

function buildFallback(): AtlasDataContextValue {
  const fibers = dataSource.getFibers();
  const baseIndex = fibers.map((f) => ({
    id: f.id,
    name: f.name,
    image: f.image,
    status: f.status ?? "published",
    category: classifyProfileCategory(f.id, f.category),
    profilePills: f.profilePills,
  }));
  const byId = new Map(baseIndex.map((fiber) => [fiber.id, fiber]));
  const resolvedIds = dataSource.resolveFiberOrder(baseIndex.map((fiber) => fiber.id));
  return {
    source: dataSource,
    version: dataSource.getVersion(),
    fibers,
    fiberIndex: resolvedIds
      .map((id) => byId.get(id))
      .filter((fiber): fiber is FiberIndexEntry => !!fiber),
    getFiberById: (id: string) => dataSource.getFiberById(id),
    updateFiber: (id: string, patch: Partial<FiberProfile>) => dataSource.updateFiber(id, patch),
    adminMode: false,
    setAdminMode: () => {},
    editingFiberId: null,
    setEditingFiberId: () => {},
    adminView: "list",
    setAdminView: () => {},
    workflowPhase: "discover",
    undo: () => null,
    redo: () => null,
    canUndo: false,
    canRedo: false,
    journal: [],
    overrideSummary: [],
    overriddenFiberIds: [],
    hasOverrides: false,
  };
}

export function useAtlasData(): AtlasDataContextValue {
  const ctx = useContext(AtlasDataContext);
  if (!ctx) {
    const isTestEnv = import.meta.env.MODE === "test";
    if (import.meta.env.DEV && !isTestEnv) {
      throw new Error("useAtlasData must be used within <AtlasDataProvider> in development.");
    }
    return buildFallback();
  }
  return ctx;
}

/** Convenience: just the admin state */
export function useAdminMode() {
  const {
    adminMode, setAdminMode,
    editingFiberId, setEditingFiberId,
    adminView, setAdminView, workflowPhase,
  } = useAtlasData();
  return { adminMode, setAdminMode, editingFiberId, setEditingFiberId, adminView, setAdminView, workflowPhase };
}