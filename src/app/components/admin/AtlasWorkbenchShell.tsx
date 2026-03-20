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
import { fibers as bundledProfiles } from "../../data/fibers";
import deletedFiberIdsBundledRaw from "../../data/deleted-fiber-ids.json";
import {
  readPassportStatusOverrides,
  subscribePassportStatusOverrides,
} from "../../utils/admin/passportStatusOverrides";

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

type AtlasProfileStatus = "draft" | "published" | "archived";

function normalizeAtlasStatus(value: unknown): AtlasProfileStatus {
  if (value === "draft" || value === "archived") return value;
  return "published";
}

function countLiveProfiles(
  entries: Array<{ id: string; category: string; status: AtlasProfileStatus }>,
): { all: number; fiber: number } {
  let all = 0;
  let fiber = 0;
  for (const entry of entries) {
    if (entry.status !== "published") continue;
    all += 1;
    if (entry.category === "fiber") fiber += 1;
  }
  return { all, fiber };
}

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
  const [passportOverrideVersion, setPassportOverrideVersion] = useState(0);
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

  useEffect(() => subscribePassportStatusOverrides(() => setPassportOverrideVersion((v) => v + 1)), []);

  const handleRunPromote = useCallback(async () => {
    if (isPublishing) return;
    const confirmed = window.confirm(
      "Publish current admin changes?\n\nThis will run promote, verify, commit publish artifacts, and push to GitHub.",
    );
    if (!confirmed) return;
    const note = window.prompt("Optional publish note (included in commit message):", "") ?? "";
    const parseJSON = <T,>(raw: string | null): T | undefined => {
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    };
    const rawDiff = source.exportDiffJSON();
    const diffPayload = parseJSON<Record<string, unknown>>(rawDiff) ?? {};
    const passportStatusOverrides = parseJSON<Record<string, string>>(
      localStorage.getItem("atlas-passport-status-overrides"),
    ) ?? {};
    if (!diffPayload.fibers || typeof diffPayload.fibers !== "object" || Array.isArray(diffPayload.fibers)) {
      diffPayload.fibers = {};
    }
    const fibersPatch = diffPayload.fibers as Record<string, Record<string, unknown>>;
    for (const [profileId, status] of Object.entries(passportStatusOverrides)) {
      if (!profileId || !status) continue;
      if (!["draft", "published", "archived"].includes(status)) continue;
      const prev = fibersPatch[profileId];
      fibersPatch[profileId] = { ...(prev && typeof prev === "object" ? prev : {}), status };
    }
    const diffJson = JSON.stringify(diffPayload, null, 2);
    const localGlobalOrder = parseJSON<string[]>(localStorage.getItem("atlas:fiber-order"));
    const localGroupOrders = parseJSON<Record<string, string[]>>(localStorage.getItem("atlas:fiber-order-groups"));
    const localNavThumbOverrides = parseJSON<Record<string, unknown>>(localStorage.getItem("atlas:nav-parent-images"));
    const effectiveLocalDeletedFiberIds = bundledProfiles
      .map((profile) => profile.id)
      .filter((id) => !source.getFiberById(id));

    // Preflight: force payload parity with local effective status/deletion state.
    const bundledDeleted = new Set(
      (Array.isArray(deletedFiberIdsBundledRaw) ? deletedFiberIdsBundledRaw : [])
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    );
    const localDeletedSet = new Set(
      effectiveLocalDeletedFiberIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    );
    const localById = new Map(source.getFibers().map((f) => [f.id, f]));
    const bundledStatusById = new Map<string, AtlasProfileStatus>();
    for (const profile of bundledProfiles) {
      if (bundledDeleted.has(profile.id)) continue;
      bundledStatusById.set(profile.id, normalizeAtlasStatus(source.getBundledFiber(profile.id)?.status));
    }
    for (const [id, bundledStatus] of bundledStatusById.entries()) {
      if (localDeletedSet.has(id)) continue;
      const localStatus = normalizeAtlasStatus(localById.get(id)?.status);
      if (localStatus === bundledStatus) continue;
      const prev = fibersPatch[id];
      fibersPatch[id] = { ...(prev && typeof prev === "object" ? prev : {}), status: localStatus };
    }

    const payloadLive = new Set<string>();
    for (const [id, bundledStatus] of bundledStatusById.entries()) {
      if (localDeletedSet.has(id)) continue;
      const patch = fibersPatch[id];
      const patchStatus = patch && "status" in patch ? normalizeAtlasStatus(patch.status) : null;
      const passportStatus = passportStatusOverrides[id];
      const effective = normalizeAtlasStatus(passportStatus ?? patchStatus ?? bundledStatus);
      if (effective === "published") payloadLive.add(id);
    }
    const localLive = new Set(
      source.getFibers()
        .filter((profile) => normalizeAtlasStatus(profile.status) === "published")
        .map((profile) => profile.id),
    );
    const localOnly = [...localLive].filter((id) => !payloadLive.has(id));
    const payloadOnly = [...payloadLive].filter((id) => !localLive.has(id));
    if (localOnly.length > 0 || payloadOnly.length > 0) {
      const preview = [
        localOnly.length > 0 ? `Local-only live (${localOnly.length}): ${localOnly.slice(0, 12).join(", ")}` : "",
        payloadOnly.length > 0 ? `Payload-only live (${payloadOnly.length}): ${payloadOnly.slice(0, 12).join(", ")}` : "",
      ].filter(Boolean).join("\n");
      window.alert(`Publish blocked: Local vs Payload delta must be 0 before publish.\n\n${preview}`);
      return;
    }
    const finalDiffJson = JSON.stringify(diffPayload, null, 2);
    const effectiveStatusById: Record<string, AtlasProfileStatus> = {};
    for (const profile of bundledProfiles) {
      if (localDeletedSet.has(profile.id)) continue;
      const fromPassport = passportStatusOverrides[profile.id];
      const fromLocal = source.getFiberById(profile.id)?.status;
      const fromBundled = source.getBundledFiber(profile.id)?.status;
      effectiveStatusById[profile.id] = normalizeAtlasStatus(fromPassport ?? fromLocal ?? fromBundled);
    }
    try {
      setIsPublishing(true);
      const response = await fetch("/__admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffJson: finalDiffJson,
          note,
          fiberOrder: {
            global: localGlobalOrder,
            groups: localGroupOrders,
          },
          navThumbOverrides: localNavThumbOverrides,
          deletedFiberIds: effectiveLocalDeletedFiberIds,
          effectiveStatusById,
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

  const parityDiagnostics = useMemo(() => {
    const bundledDeleted = new Set(
      (Array.isArray(deletedFiberIdsBundledRaw) ? deletedFiberIdsBundledRaw : [])
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    );
    const bundledRows = bundledProfiles.map((profile) => {
      if (bundledDeleted.has(profile.id)) return null;
      const bundled = source.getBundledFiber(profile.id);
      return {
        id: profile.id,
        category: profile.category,
        status: normalizeAtlasStatus(bundled?.status),
      };
    }).filter((row): row is { id: string; category: string; status: AtlasProfileStatus } => !!row);
    const localRows = source.getFibers().map((profile) => ({
      id: profile.id,
      category: profile.category,
      status: normalizeAtlasStatus(profile.status),
    }));

    const bundledById = new Map(bundledRows.map((row) => [row.id, row]));
    const localById = new Map(localRows.map((row) => [row.id, row]));
    const deletedLocally = bundledRows
      .map((row) => row.id)
      .filter((id) => !localById.has(id));

    let payloadDiff: Record<string, unknown> = {};
    try {
      payloadDiff = JSON.parse(source.exportDiffJSON()) as Record<string, unknown>;
    } catch {
      payloadDiff = {};
    }
    const payloadFiberPatches =
      payloadDiff.fibers && typeof payloadDiff.fibers === "object" && !Array.isArray(payloadDiff.fibers)
        ? (payloadDiff.fibers as Record<string, Record<string, unknown>>)
        : {};
    const passportOverrides = readPassportStatusOverrides();
    const localDeletedFromStorage = new Set(
      ((() => {
        try {
          const raw = localStorage.getItem("atlas:deletedFiberIds");
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })() as unknown[])
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .map((id) => id.trim()),
    );

    const payloadRows = bundledRows.map((bundled) => {
      if (localDeletedFromStorage.has(bundled.id)) return null;
      const patch = payloadFiberPatches[bundled.id];
      const patchStatus = patch && "status" in patch ? normalizeAtlasStatus(patch.status) : null;
      const passportStatus = passportOverrides[bundled.id];
      const status = normalizeAtlasStatus(passportStatus ?? patchStatus ?? bundled.status);
      return {
        id: bundled.id,
        category: bundled.category,
        status,
      };
    }).filter((row): row is { id: string; category: string; status: AtlasProfileStatus } => !!row);
    const payloadById = new Map(payloadRows.map((row) => [row.id, row]));

    const localVsBundled: string[] = [];
    const localVsPayload: string[] = [];
    const bundledOnlyLive: string[] = [];
    const localOnlyLive: string[] = [];
    for (const bundled of bundledRows) {
      const localStatus = localById.get(bundled.id)?.status ?? "archived";
      const localLive = localStatus === "published";
      const bundledLive = bundled.status === "published";
      const payloadLive = payloadById.get(bundled.id)?.status === "published";
      if (localLive !== bundledLive) localVsBundled.push(bundled.id);
      if (localLive !== payloadLive) localVsPayload.push(bundled.id);
      if (bundledLive && !localLive) bundledOnlyLive.push(bundled.id);
      if (localLive && !bundledLive) localOnlyLive.push(bundled.id);
    }

    return {
      bundledCounts: countLiveProfiles(bundledRows),
      localCounts: countLiveProfiles(localRows),
      payloadCounts: countLiveProfiles(payloadRows),
      deletedLocally,
      localVsBundled,
      localVsPayload,
      bundledOnlyLive,
      localOnlyLive,
    };
  }, [passportOverrideVersion, source]);

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
    <div className="min-h-dvh bg-[#060606] text-white overflow-hidden font-sans selection:bg-blue-500/30">
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
        <div className="h-9 flex-shrink-0 border-b border-white/[0.05] bg-[#0b0b0b] px-4 text-[10px] uppercase tracking-widest text-neutral-300 flex items-center gap-4 overflow-x-auto">
          <span>
            Local Live: <span className="text-white">{parityDiagnostics.localCounts.all}</span>
            <span className="text-neutral-500"> (fiber {parityDiagnostics.localCounts.fiber})</span>
          </span>
          <span>
            Bundled Live: <span className="text-white">{parityDiagnostics.bundledCounts.all}</span>
            <span className="text-neutral-500"> (fiber {parityDiagnostics.bundledCounts.fiber})</span>
          </span>
          <span>
            Publish Payload Live: <span className="text-white">{parityDiagnostics.payloadCounts.all}</span>
            <span className="text-neutral-500"> (fiber {parityDiagnostics.payloadCounts.fiber})</span>
          </span>
          <span className={cn(parityDiagnostics.deletedLocally.length > 0 ? "text-amber-300" : "text-neutral-400")}>
            Local Deleted (not in publish diff): {parityDiagnostics.deletedLocally.length}
          </span>
          <span
            className={cn(parityDiagnostics.localVsPayload.length > 0 ? "text-rose-300" : "text-emerald-300")}
            title={
              parityDiagnostics.localVsPayload.length > 0
                ? `Won't match local after publish: ${parityDiagnostics.localVsPayload.slice(0, 20).join(", ")}`
                : "Publish payload matches local live statuses"
            }
          >
            Local vs Payload Delta: {parityDiagnostics.localVsPayload.length}
          </span>
          <span
            className={cn(parityDiagnostics.bundledOnlyLive.length > 0 ? "text-amber-200" : "text-neutral-500")}
            title={
              parityDiagnostics.bundledOnlyLive.length > 0
                ? `Bundled-only live IDs (${parityDiagnostics.bundledOnlyLive.length}): ${parityDiagnostics.bundledOnlyLive.join(", ")}`
                : "No bundled-only live IDs"
            }
          >
            Bundled-only Live IDs: {parityDiagnostics.bundledOnlyLive.length}
          </span>
        </div>

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
