import React, { useState, useCallback, useMemo, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { 
  Command, Save, ChevronRight, Layers, Settings, Loader2, Rocket
} from "lucide-react";
import { cn } from "@/database-interface/lib/utils";
import { AdminSaveProvider, useAdminSave } from "@/contexts/AdminSaveContext";
import { AdminSettingsProvider } from "@/contexts/AdminSettingsContext";
import { CommandPalette, useCommandPaletteShortcuts } from "@/components/database-interface/CommandPalette";
import type { CommandContext, ViewMode, WorkbenchMode } from "@/components/database-interface/commands/types";
import { createWorkbenchCommands } from "@/components/database-interface/commands/registry";
import { executeWorkbenchCommand } from "@/components/database-interface/commands/executor";
import { resolveAdminShellRouteState, isAdminBaseOrImagesRoute } from "./admin-route-contract";
import { WorkbenchStateProvider } from "./WorkbenchStateContext";
import { SmartContextPane } from "./SmartContextPane";
import { KnowledgeHeaderControls } from "./header/KnowledgeHeaderControls";
import {
  shouldHandleHistoryShortcut,
  shouldToggleInspectorShortcut,
} from "./atlas-workbench-shortcuts";
import { dataSource } from "../../data/data-provider";
import { useAtlasData } from "../../context/atlas-data-context";

// Lazy load domains
const Library = lazy(() => import("./Library"));
const SettingsTab = lazy(() => import("./SettingsTab"));

/** Top-level view: Workspace (content) or Settings */
type TopLevelView = "workspace" | "settings";

/** Sub-tab within Workspace */
interface TopLevelNavItem {
  id: TopLevelView;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TOP_LEVEL_NAV: TopLevelNavItem[] = [
  { id: "workspace", label: "Workspace", icon: Layers, description: "Library & Workflow Catalog" },
  { id: "settings", label: "Settings", icon: Settings, description: "System configuration" },
];

const SHELL_STORAGE_KEY = "atlas:workbench-shell-state";

const WORKFLOW_MODE_IDS = new Set([
  "import", "overview", "batch", "health", "diff", "changesets", "sequence", "cards", "image-base",
]);

type PublishState = {
  status?: "idle" | "running" | "succeeded" | "failed";
  step?: string;
  error?: string | null;
  commitSha?: string | null;
  vercelStatus?: string | null;
};

function readPersistedShellState(): {
  topLevel?: TopLevelView;
  activeMode?: WorkbenchMode;
  targetEntityId?: string;
  inspectorOpen?: boolean;
  viewMode?: ViewMode;
} {
  try {
    return JSON.parse(localStorage.getItem(SHELL_STORAGE_KEY) ?? "{}") as {
      topLevel?: TopLevelView;
      activeMode?: WorkbenchMode;
      targetEntityId?: string;
      inspectorOpen?: boolean;
      viewMode?: ViewMode;
    };
  } catch {
    return {};
  }
}

function WorkbenchContent({ 
  topLevel, 
  targetEntityId 
}: { 
  topLevel: TopLevelView; 
  targetEntityId?: string;
}) {
  if (topLevel === "settings") {
    return (
      <Suspense fallback={<LoadingFallback label="Settings" />}>
        <div className="h-full bg-black"><SettingsTab /></div>
      </Suspense>
    );
  }

  // Workspace now delegates everything to Library, which has the integrated tree
  return (
    <Suspense fallback={<LoadingFallback label="Workspace" />}>
      <div className="flex-1 min-h-0 flex flex-col bg-black overflow-hidden">
        <Library />
      </div>
    </Suspense>
  );
}

function LoadingFallback({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-neutral-500 bg-[#050505]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <div className="text-[10px] uppercase font-bold tracking-widest animate-pulse">
          Initializing {label}...
        </div>
      </div>
    </div>
  );
}

function AtlasWorkbenchShellContent() {
  const { source } = useAtlasData();
  const persistedShellState = useMemo(() => readPersistedShellState(), []);
  const [topLevel, setTopLevel] = useState<TopLevelView>(persistedShellState.topLevel ?? "workspace");
  const [activeMode, setActiveMode] = useState<WorkbenchMode>(persistedShellState.activeMode ?? "browse");
  const [targetEntityId, setTargetEntityId] = useState<string | undefined>(
    persistedShellState.targetEntityId,
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(Boolean(persistedShellState.inspectorOpen));
  const [viewMode, setViewMode] = useState<ViewMode>(persistedShellState.viewMode ?? "list");
  const [selectionHistory, setSelectionHistory] = useState<string[]>([]);
  const [shouldAnimateStatusDot, setShouldAnimateStatusDot] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [knowledgeAction, setKnowledgeAction] = useState<{
    action: "next-section" | "next-weak" | "toggle-reference" | "save-draft";
    at: number;
  } | null>(null);
  const adminSave = useAdminSave();
  const getIntentReason = useCallback((): string => {
    const withIntent = adminSave as unknown as { lastIntent?: { reason?: string } };
    return withIntent.lastIntent?.reason ?? "";
  }, [adminSave]);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ nodeId?: string }>();
  const prevDirtyRef = React.useRef(adminSave.isDirty);
  const prevSaveStatusRef = React.useRef(adminSave.saveStatus);
  const prevIntentReasonRef = React.useRef(getIntentReason());

  // Sync from URL: deep links to profile-base/:nodeId, and reset to ImageBase on /admin or /admin/images
  useEffect(() => {
    const routeState = resolveAdminShellRouteState(location.pathname);
    if (routeState) {
      setTopLevel("workspace");
      setTargetEntityId(routeState.entityId ?? undefined);
      return;
    }
    if (params.nodeId) {
      setTargetEntityId(params.nodeId);
    } else {
      setTargetEntityId(undefined);
    }
    // When on base admin or ImageBase route, ensure we show the main ImageBase component
    if (isAdminBaseOrImagesRoute(location.pathname)) {
      setActiveMode("browse");
      setViewMode("list");
    }
  }, [location.pathname, params.nodeId]);

  useEffect(() => {
    localStorage.setItem(
      SHELL_STORAGE_KEY,
      JSON.stringify({
        topLevel,
        activeMode,
        targetEntityId,
        inspectorOpen: isInspectorOpen,
        viewMode,
      }),
    );
  }, [activeMode, isInspectorOpen, targetEntityId, topLevel, viewMode]);

  useEffect(() => {
    const wasDirty = prevDirtyRef.current;
    const prevStatus = prevSaveStatusRef.current;
    const prevIntentReason = prevIntentReasonRef.current;
    const currentIntentReason = getIntentReason();
    const isNewPushIntent =
      /push/i.test(currentIntentReason) && currentIntentReason !== prevIntentReason;
    const changedDetected = adminSave.isDirty && !wasDirty;
    const saveStarted = adminSave.saveStatus === "saving" && prevStatus !== "saving";
    const saveCompleted = adminSave.saveStatus === "saved" && prevStatus !== "saved";

    if (changedDetected || saveStarted || saveCompleted || isNewPushIntent) {
      setShouldAnimateStatusDot(true);
      const timeout = window.setTimeout(() => setShouldAnimateStatusDot(false), 1300);
      prevDirtyRef.current = adminSave.isDirty;
      prevSaveStatusRef.current = adminSave.saveStatus;
      prevIntentReasonRef.current = currentIntentReason;
      return () => window.clearTimeout(timeout);
    }

    prevDirtyRef.current = adminSave.isDirty;
    prevSaveStatusRef.current = adminSave.saveStatus;
    prevIntentReasonRef.current = currentIntentReason;
  }, [adminSave.isDirty, adminSave.saveStatus, getIntentReason]);

  const setTargetEntity = useCallback((nextId: string | undefined) => {
    setTargetEntityId((current) => {
      if (!current || current === nextId) return nextId;
      setSelectionHistory((history) => [...history, current].slice(-10));
      return nextId;
    });
    // Sync URL when selecting a profile so deep links work and selection persists on refresh
    if (nextId && !WORKFLOW_MODE_IDS.has(nextId)) {
      navigate(`/admin/profile-base/${encodeURIComponent(nextId)}`);
    } else if (!nextId || nextId === "image-base") {
      navigate("/admin");
    }
  }, [navigate]);

  const goToPreviousEntity = useCallback(() => {
    setSelectionHistory((history) => {
      if (history.length === 0) return history;
      const previous = history[history.length - 1];
      setTargetEntityId(previous);
      if (previous) {
        navigate(`/admin/profile-base/${encodeURIComponent(previous)}`);
      }
      return history.slice(0, -1);
    });
  }, [navigate]);

  const navigateToMode = useCallback((mode: WorkbenchMode) => {
    if (mode === "settings") {
      setTopLevel("settings");
      setActiveMode("settings");
      navigate("/admin");
      return;
    }

    setTopLevel("workspace");
    setActiveMode(mode);
    navigate("/admin");
  }, [navigate]);

  const handleTopLevelChange = useCallback((view: TopLevelView) => {
    setTopLevel(view);
    if (view === "workspace") {
      setActiveMode("browse");
      setTargetEntityId(undefined);
      navigate("/admin");
    } else {
      setActiveMode("settings");
    }
  }, [navigate]);

  useCommandPaletteShortcuts({
    onOpen: () => setIsCommandPaletteOpen(true),
    onNavigate: navigateToMode,
    onSave: () => void adminSave.triggerSave(),
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldToggleInspectorShortcut(event)) {
        event.preventDefault();
        setIsInspectorOpen((prev) => !prev);
      }
      const historyAction = shouldHandleHistoryShortcut(event);
      if (historyAction === "undo" && dataSource.canUndo()) {
        event.preventDefault();
        dataSource.undo();
      }
      if (historyAction === "redo" && dataSource.canRedo()) {
        event.preventDefault();
        dataSource.redo();
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousEntity();
      }
      if (event.key === "Escape") {
        setIsInspectorOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPreviousEntity]);

  const saveStatusLabel = useMemo(() => {
    switch (adminSave.saveStatus) {
      case "saving": return "Saving...";
      case "saved": return "Saved";
      case "error": return "Error";
      default: return adminSave.isDirty ? "Unsaved Changes" : "Idle";
    }
  }, [adminSave.saveStatus, adminSave.isDirty]);

  const pollPublishStatus = useCallback(async () => {
    try {
      const response = await fetch("/__admin/publish-status");
      if (!response.ok) return;
      const payload = (await response.json()) as PublishState;
      setPublishState(payload);
      setIsPublishing(payload.status === "running");
    } catch {
      // Ignore transient status polling errors.
    }
  }, []);

  useEffect(() => {
    void pollPublishStatus();
  }, [pollPublishStatus]);

  useEffect(() => {
    if (!isPublishing) return;
    const timer = window.setInterval(() => {
      void pollPublishStatus();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isPublishing, pollPublishStatus]);

  const handleRunPromote = useCallback(async () => {
    if (isPublishing) return;
    const confirmed = window.confirm(
      "Publish current admin changes?\n\nThis will run promote, verify, commit publish artifacts, and push to GitHub.",
    );
    if (!confirmed) return;
    const note = window.prompt("Optional publish note (included in commit message):", "") ?? "";
    const diffJson = source.exportDiffJSON();
    if (!diffJson || diffJson.trim().length === 0) {
      window.alert("No diff payload available to publish.");
      return;
    }
    const parseJSON = <T,>(raw: string | null): T | undefined => {
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    };
    const localGlobalOrder = parseJSON<string[]>(localStorage.getItem("atlas:fiber-order"));
    const localGroupOrders = parseJSON<Record<string, string[]>>(localStorage.getItem("atlas:fiber-order-groups"));
    const localNavThumbOverrides = parseJSON<Record<string, unknown>>(localStorage.getItem("atlas:nav-parent-images"));
    try {
      setIsPublishing(true);
      const response = await fetch("/__admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffJson,
          note,
          fiberOrder: {
            global: localGlobalOrder,
            groups: localGroupOrders,
          },
          navThumbOverrides: localNavThumbOverrides,
        }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; publish?: PublishState };
      if (!response.ok || payload.ok === false) {
        const message = payload.error || `Publish request failed (${response.status})`;
        setPublishState((prev) => ({ ...(prev ?? {}), status: "failed", error: message }));
        setIsPublishing(false);
        return;
      }
      if (payload.publish) setPublishState(payload.publish);
      void pollPublishStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPublishState((prev) => ({ ...(prev ?? {}), status: "failed", error: message }));
      setIsPublishing(false);
    }
  }, [isPublishing, pollPublishStatus, source]);

  const promoteButtonLabel = useMemo(() => {
    if (isPublishing) return `Publishing (${publishState?.step || "working"})`;
    if (publishState?.status === "succeeded") {
      const sha = publishState.commitSha ? publishState.commitSha.slice(0, 7) : "";
      return sha ? `Published @ ${sha}` : "Published";
    }
    if (publishState?.status === "failed") return "Publish Failed";
    return "Run Promote";
  }, [isPublishing, publishState]);

  const activeLabel = topLevel === "settings" 
    ? "Settings" 
    : targetEntityId 
      ? `Profile: ${targetEntityId}` 
      : "Workspace";

  const modeContext = useMemo<CommandContext>(() => ({
    mode: activeMode,
    hasSelection: Boolean(targetEntityId),
    selectionId: targetEntityId ?? null,
    inspectorOpen: isInspectorOpen,
  }), [activeMode, isInspectorOpen, targetEntityId]);

  const workbenchCommands = useMemo(() => createWorkbenchCommands(), []);
  const commandHandlers = useMemo(
    () => ({
      navigate: navigateToMode,
      setViewMode: (nextViewMode: ViewMode) => {
        setViewMode(nextViewMode);
      },
      triggerKnowledgeAction: (action: "next-section" | "next-weak" | "toggle-reference" | "save-draft") => {
        setKnowledgeAction({ action, at: Date.now() });
      },
      createPassport: () => {
        setActiveMode("edit-profile");
      },
      save: () => void adminSave.triggerSave(),
      openInspector: () => setIsInspectorOpen(true),
      closeInspector: () => setIsInspectorOpen(false),
      toggleInspector: () => setIsInspectorOpen((prev) => !prev),
      focusSearch: () => {
        const searchInput = document.querySelector('[placeholder*="search" i]') as HTMLInputElement | null;
        searchInput?.focus();
      },
    }),
    [adminSave, navigateToMode],
  );
  const handleInspectorAction = useCallback(
    async (commandId: string) => {
      const command = workbenchCommands.find((candidate) => candidate.id === commandId);
      if (!command) {
        return;
      }
      await executeWorkbenchCommand(command, commandHandlers, modeContext);
    },
    [commandHandlers, modeContext, workbenchCommands],
  );

  return (
    <div className="h-screen bg-[#060606] text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Main Viewport */}
      <main className="h-full flex flex-col min-w-0 bg-[#060606] relative">
        {/* Global Action Bar */}
        <header className="h-12 flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0a] backdrop-blur-md flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleTopLevelChange("workspace")}
              className="flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors group"
              title="Reset to view all profiles"
            >
              <span className="uppercase tracking-widest text-[10px] font-bold text-white group-hover:text-white">
                Atlas Admin
              </span>
              <ChevronRight className="w-3 h-3 opacity-30" />
              <span className="uppercase tracking-widest text-[10px] font-bold text-blue-300">
                {activeLabel}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {TOP_LEVEL_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = topLevel === item.id;
                const isSettings = item.id === "settings";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTopLevelChange(item.id)}
                    title={`${item.label}: ${item.description}`}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200",
                      isActive
                        ? isSettings
                          ? "bg-white/10 text-white border border-white/20"
                          : "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                        : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300 border border-transparent"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </button>
                );
              })}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-all border border-white/[0.04]"
                title="Command Palette (⌘K)"
              >
                <Command className="w-4 h-4" />
              </button>
            </div>
            {activeMode === "edit-knowledge" && <KnowledgeHeaderControls />}
            <button
              type="button"
              onClick={() => {
                void handleRunPromote();
              }}
              disabled={isPublishing}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
                publishState?.status === "failed"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                "disabled:opacity-60",
              )}
              title={
                publishState?.status === "failed" && publishState.error
                  ? publishState.error
                  : "Run promote + verify + commit + push"
              }
            >
              <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                {shouldAnimateStatusDot && !isPublishing && (
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 animate-ping" />
                )}
                {isPublishing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Rocket className="h-3.5 w-3.5" />
                )}
              </div>
              {promoteButtonLabel}
            </button>

            {adminSave.isDirty && (
              <button
                onClick={() => void adminSave.triggerSave()}
                disabled={adminSave.saveStatus === 'saving'}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Commit Changes
              </button>
            )}
          </div>
        </header>

        {/* Tab Content */}
        <WorkbenchStateProvider
          value={{
            mode: activeMode,
            setMode: setActiveMode,
            selectionId: targetEntityId ?? null,
            // Keep selection history for quick backtracking.
            setSelectionId: (selectionId: string | null) => setTargetEntity(selectionId ?? undefined),
            inspectorOpen: isInspectorOpen,
            setInspectorOpen: setIsInspectorOpen,
            viewMode,
            setViewMode,
            knowledgeAction,
            triggerKnowledgeAction: (action) => setKnowledgeAction({ action, at: Date.now() }),
          }}
        >
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative flex flex-col">
            <WorkbenchContent topLevel={topLevel} targetEntityId={targetEntityId} />
          </div>
        </WorkbenchStateProvider>
      </main>

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigateToMode}
        onSave={() => void adminSave.triggerSave()}
        onInspectorOpen={() => setIsInspectorOpen(true)}
        onInspectorClose={() => setIsInspectorOpen(false)}
        onInspectorToggle={() => setIsInspectorOpen((prev) => !prev)}
        onSetViewMode={setViewMode}
        onKnowledgeAction={(action) => setKnowledgeAction({ action, at: Date.now() })}
        onCreatePassport={() => setActiveMode("edit-profile")}
        modeContext={modeContext}
      />
      <SmartContextPane
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        mode={activeMode}
        selectionId={targetEntityId ?? null}
        onAction={(commandId) => {
          void handleInspectorAction(commandId);
        }}
      />
    </div>
  );
}

export default function AtlasWorkbenchShell() {
  return (
    <AdminSaveProvider>
      <AtlasWorkbenchShellWithNav />
    </AdminSaveProvider>
  );
}

function AtlasWorkbenchShellWithNav() {
  const navigate = useNavigate();
  const onNavigateTo = useCallback((tab: string, entityId?: string) => {
    if ((tab === "profilebase" || tab === "unified") && entityId) {
      navigate(`/admin/profile-base/${encodeURIComponent(entityId)}`);
    }
  }, [navigate]);

  return (
    <AdminSettingsProvider onGoToSettings={() => {}} onNavigateTo={onNavigateTo}>
      <AtlasWorkbenchShellContent />
    </AdminSettingsProvider>
  );
}
