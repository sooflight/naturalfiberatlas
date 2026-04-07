import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense, useSyncExternalStore } from "react";
import { 
  Edit, Image as ImageIcon, Search, 
  SlidersHorizontal, CheckCircle, 
  ChevronDown, Plus, ArrowUpRight, Settings, ArrowLeft,
  Database, Trash2, Zap, X, Minus
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/database-interface/lib/utils";

// Import the strong sidebar navigation from ProfileBase
import { NodeSidebar } from "./node-editor/NodeSidebar";

// Import ViewToggle for unified view mode switching
import { ViewToggle } from "./ViewToggle";

// Domain components
const ImageDatabaseManager = lazy(() => import("./ImageDatabaseManager"));
const NodeEditorTab = lazy(() => import("./NodeEditorTab"));

// Import data and utilities
import { useProfiles, type UnifiedProfile } from "@/hooks/domains/useProfiles";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";
import { ATLAS_IMAGES } from "@/data/atlas-images";
import type { ContentItem } from "@/types/content";
import { useViewKeyboardShortcuts } from "../../hooks/admin/useViewKeyboardShortcuts";
import type { ViewMode, WorkbenchMode } from "@/components/database-interface/commands/types";
import { useOptionalWorkbenchState } from "./WorkbenchStateContext";
import { useAtlasData } from "../../context/atlas-data-context";
import { dataSource } from "../../data/data-provider";
import { atlasNavigation as runtimeAtlasNavigation } from "../../data/admin/atlas-navigation";
import { sortProfileIdsByCanonicalOrder } from "../../data/profile-sequencing";
import { NODE_SIDEBAR_WIDTH_PX } from "./layout-constants";
import { mutateAdminStatus } from "@/utils/adminStatusApi";
import {
  readPassportStatusOverrides,
  subscribePassportStatusOverrides,
  writePassportStatusOverride,
} from "@/utils/passportStatusOverrides";
import { buildKnowledgeFibers } from "./library-knowledge-fibers";

// --- useLibraryState Hook ---
// Local UI state mode for keyboard/view toggles.
type LibraryMode = 'browse' | 'search' | 'filter' | 'select';

const VIEW_MODE_KEY = 'atlas-view-mode';

/**
 * Hook for managing Library workbench state.
 * 
 * Note: Currently exported for testing. Full integration with Library component
 * happens in subsequent tasks (ViewToggle wiring, keyboard shortcuts).
 */
export function useLibraryState() {
  // Mode state for workbench navigation
  const [mode, setMode] = useState<LibraryMode>('browse');
  
  // Initialize view mode from localStorage or default to 'grid'
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      const validModes: ViewMode[] = ['list', 'grid', 'knowledge'];
      if (validModes.includes(saved as ViewMode)) {
        return saved as ViewMode;
      }
    }
    return 'list';
  });
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Persist view mode changes
  const setViewMode = useCallback((newView: ViewMode) => {
    setViewModeState(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_MODE_KEY, newView);
    }
  }, []);
  
  const selectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
  }, []);
  
  // Navigate function to change workbench mode
  const navigate = useCallback((newMode: LibraryMode) => {
    setMode(newMode);
  }, []);
  
  return {
    mode,
    viewMode,
    selectedItemId,
    setViewMode,
    selectItem,
    navigate,
  };
}

interface ViewPreferences {
  mode: WorkbenchMode;
  gallery: {
    viewMode: "cards" | "grid" | "list";
    zoom: number;
    filters: {
      search: string;
      category: string | null;
      status: "all" | "live" | "draft" | "archived";
    };
  };
  editor: {
    selectedId: string | null;
    expandedCards: Set<string>;
  };
}

// Domain components for workflows
const IngestionPanel = lazy(() => import("./ingestion"));
const OperationsDomain = lazy(() => import("./database-interface/domains/OperationsDomain"));
const BatchDomain = lazy(() => import("./database-interface/domains/BatchDomain"));
const HealthDomain = lazy(() => import("./database-interface/domains/HealthDomain"));
const DiffDomain = lazy(() => import("./database-interface/domains/DiffDomain"));
const ChangesetDomain = lazy(() => import("./database-interface/domains/ChangesetDomain"));
const CardEditorDomain = lazy(() => import("./database-interface/domains/CardEditorDomain"));
const UnifiedEditorDomain = lazy(() => import("./database-interface/domains/UnifiedEditorDomain"));
const SequenceEditor = lazy(() => import("./sequence/SequenceEditor"));

// View components - lazy loaded for code-splitting
const GridView = lazy(() => import("./views/GridView").then(m => ({ default: m.GridView })));

/**
 * Library - Unified master tool for image-knowledge editing
 *
 * Integrated modes:
 * 1. Image Base: Visual-first asset management
 * 2. Knowledge Base: Structured knowledge profile editing
 * 3. Edit Profile: Deep editing of a single profile (Workbench Editor)
 * 4. Workflow: Import, Overview (Unified Integrated Tree)
 */
interface LibraryProps {
  forcedMode?: WorkbenchMode;
}

function withRecordValue<T>(
  prev: Record<string, T>,
  key: string,
  value: T | undefined,
): Record<string, T> {
  if (value === undefined) {
    const next = { ...prev };
    delete next[key];
    return next;
  }
  return { ...prev, [key]: value };
}

export default function Library({ forcedMode }: LibraryProps) {
  const workbenchState = useOptionalWorkbenchState();
  const [localMode, setLocalMode] = useState<WorkbenchMode>("browse");
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [localViewMode, setLocalViewMode] = useState<ViewMode>("list");
  const [gridZoomScale, setGridZoomScale] = useState(1);
  const [localKnowledgeAction] = useState<{
    action: "next-section" | "next-weak" | "toggle-reference" | "save-draft";
    at: number;
  } | null>(null);
  const workbenchMode = workbenchState?.mode ?? localMode;
  const setWorkbenchMode = workbenchState?.setMode ?? setLocalMode;
  const selectedId = workbenchState?.selectionId ?? localSelectedId;
  const setSelectedId = workbenchState?.setSelectionId ?? setLocalSelectedId;
  const viewMode = workbenchState?.viewMode ?? localViewMode;
  const setViewMode = workbenchState?.setViewMode ?? setLocalViewMode;
  const knowledgeAction = workbenchState?.knowledgeAction ?? localKnowledgeAction;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileStatusOverrides, setProfileStatusOverrides] = useState<Record<string, string>>(
    () => readPassportStatusOverrides(),
  );
  const [profileStatusSaving, setProfileStatusSaving] = useState<Record<string, boolean>>({});
  const [profileStatusErrors, setProfileStatusErrors] = useState<Record<string, string>>({});
  const profileStatusRequestVersionRef = useRef<Record<string, number>>({});
  const { fiberIndex: atlasFiberIndex, fibers: atlasFibers, updateFiber } = useAtlasData();
  const fiberIndex = atlasFiberIndex ?? atlasFibers ?? [];
  // Subscribe directly to dataSource so contentItems recomputes when deleteFiber runs
  const dataVersion = useSyncExternalStore(
    (cb) => dataSource.subscribe(cb),
    () => dataSource.getVersion(),
    () => dataSource.getVersion(),
  );

  // Wire up keyboard shortcuts for view switching (only in browse mode)
  useViewKeyboardShortcuts({
    onChangeView: setViewMode,
    enabled: workbenchMode === 'browse'
  });
  
  const [viewPrefs, setViewPrefs] = useState<ViewPreferences>({
    mode: "browse",
    gallery: {
      viewMode: "cards",
      zoom: 180,
      filters: {
        search: "",
        category: null,
        status: "all",
      },
    },
    editor: {
      selectedId: null,
      expandedCards: new Set(),
    },
  });
  const effectiveMode: WorkbenchMode = workbenchMode;

  // Use the unified profiles hook
  const { 
    profiles: liveProfiles, 
    unifiedProfile: selectedProfile
  } = useProfiles({ 
    nodeId: (selectedId && !["import", "overview"].includes(selectedId)) ? selectedId : undefined,
    includeMedia: true 
  });

  const toImageArray = (images: unknown): Array<string | { url?: string }> => {
    if (!images) return [];
    return Array.isArray(images) ? (images as Array<string | { url?: string }>) : [images as string | { url?: string }];
  };

  // Build unified content items (mixing live and static data for transition)
  const contentItems = useMemo(() => {
    // If we have live profiles, use them
    if (liveProfiles && liveProfiles.length > 0) {
      return (liveProfiles as unknown as UnifiedProfile[]).map((p) => ({
        id: p.id,
        nodeData: p.node as Record<string, unknown> | null,
        passport: p.passport as Record<string, unknown> | null,
        images: [], // Images loaded on demand or via useMedia
        completion: {
          hasImages: false, // Would need batch image status
          hasKnowledge: !!p.passport,
          hasRichContent: !!(p.passport as Record<string, unknown> | null)?.summary,
        },
        status: (
          p.status === "published"
            ? "published"
            : p.status === "archived"
              ? "archived"
              : "draft"
        ) as "published" | "draft" | "archived",
      }));
    }

    // Fallback to static data if no live data (transition phase)
    const allNodeIds = new Set<string>();
    Object.keys(ATLAS_IMAGES).forEach((id) => allNodeIds.add(id));
    Object.keys(MATERIAL_PASSPORTS).forEach((id) => allNodeIds.add(id));
    /* Catalog-only profiles (e.g. expansion fibers) must appear here or they vanish from Library grid / “live” list */
    for (const entry of fiberIndex) {
      allNodeIds.add(entry.id);
    }

    // Exclude profiles soft-deleted via right-click > Delete Profile (dataSource.deleteFiber)
    const items = Array.from(allNodeIds)
      .filter((id) => !dataSource.isFiberDeleted(id))
      .map((id) => {
        const fiber = dataSource.getFiberById(id);
        const passport = MATERIAL_PASSPORTS[id] ?? null;
        const atlasRaw = ATLAS_IMAGES[id];
        const fromAtlas = toImageArray(atlasRaw);
        const hero = fiber?.image?.trim();
        const images =
          fromAtlas.length > 0 ? fromAtlas : hero ? [hero] : [];

        const passportStatus = passport?.status;
        const fromPassport =
          passportStatus === "published" || passportStatus === "archived" ? passportStatus : null;
        const fs = fiber?.status;
        const fromFiber = fs === "published" || fs === "archived" ? fs : null;
        const status = (fromPassport ?? fromFiber ?? "draft") as "published" | "draft" | "archived";

        return {
          id,
          nodeData: null,
          passport,
          images,
          completion: {
            hasImages: images.length > 0,
            hasKnowledge: !!passport,
            hasRichContent: !!passport?.summary,
          },
          status,
        };
      });
    return items;
  }, [liveProfiles, dataVersion, fiberIndex]);

  const knowledgeFibers = useMemo(() => {
    const getImageForId = (id: string) => {
      const f = dataSource.getFiberById(id);
      return f?.image?.trim() || f?.galleryImages?.[0]?.url;
    };
    return buildKnowledgeFibers(fiberIndex, contentItems, runtimeAtlasNavigation, getImageForId);
  }, [fiberIndex, contentItems]);

  const orderedContentItems = useMemo(() => {
    const byId = new Map(contentItems.map((item) => [item.id, item]));
    const orderedIds = sortProfileIdsByCanonicalOrder(
      contentItems.map((item) => item.id),
      fiberIndex.map((fiber) => fiber.id),
    );
    return orderedIds
      .map((id) => byId.get(id))
      .filter((item): item is (typeof contentItems)[number] => !!item);
  }, [contentItems, fiberIndex]);

  const contentStatusById = useMemo(() => {
    const next = new Map<string, "published" | "draft" | "archived">();
    orderedContentItems.forEach((item) => {
      next.set(
        item.id,
        item.status === "published"
          ? "published"
          : item.status === "archived"
            ? "archived"
            : "draft",
      );
    });
    return next;
  }, [orderedContentItems]);

  // Map content items to the format expected by view components
  const viewItems: ContentItem[] = useMemo(() => {
    return orderedContentItems.map(item => {
      const imageList = toImageArray(item.images);
      const firstImage = imageList[0];
      const hasImages = item.completion.hasImages;
      const hasKnowledge = item.completion.hasKnowledge;
      const hasRichContent = item.completion.hasRichContent;

      // Calculate completeness score (0-100)
      let completeness = 0;
      if (hasImages) completeness += 40;
      if (hasKnowledge) completeness += 30;
      if (hasRichContent) completeness += 30;

      // Count mapped fields
      let mappedFields = 0;
      let totalFields = 5; // Base expected fields

      if (item.passport) {
        if (item.passport.summary) mappedFields++;
        if (item.passport.performance) mappedFields++;
        if (item.passport.sourcing) mappedFields++;
        if (item.passport.applications) mappedFields++;
        if (item.passport.certifications) mappedFields++;
      }

      return {
        id: item.id,
        heroImage: imageList.length > 0
          ? {
              id: `${item.id}-hero`,
              url: typeof firstImage === "string" ? firstImage : firstImage?.url || "",
            }
          : undefined,
        imageCount: imageList.length,
        passport: (item.passport ?? undefined) as ContentItem["passport"],
        completeness,
        mappedFields,
        totalFields,
        status: (
          (profileStatusOverrides[item.id] ?? item.status) === "published"
            ? "published"
            : (profileStatusOverrides[item.id] ?? item.status) === "archived"
              ? "archived"
              : "draft"
        ) as "published" | "draft" | "archived",
        lastModified: new Date(),
      };
    });
  }, [orderedContentItems, profileStatusOverrides]);

  const handleToggleProfileStatus = useCallback(
    (profileId: string) => {
      const currentStatus = profileStatusOverrides[profileId]
        ?? contentStatusById.get(profileId)
        ?? "draft";
      const nextStatus =
        currentStatus === "published"
          ? "draft"
          : currentStatus === "draft"
            ? "archived"
            : "published";
      const nextRequestVersion = (profileStatusRequestVersionRef.current[profileId] ?? 0) + 1;
      profileStatusRequestVersionRef.current[profileId] = nextRequestVersion;
      const shouldApplyResponse = () => profileStatusRequestVersionRef.current[profileId] === nextRequestVersion;

      setProfileStatusOverrides((prev) => ({ ...prev, [profileId]: nextStatus }));
      setProfileStatusSaving((prev) => ({ ...prev, [profileId]: true }));
      setProfileStatusErrors((prev) => withRecordValue(prev, profileId, undefined));

      // Sync to data-provider so frontend GridView stays in sync
      writePassportStatusOverride(profileId, nextStatus);
      updateFiber(profileId, { status: nextStatus });

      void mutateAdminStatus({
        type: "passport",
        id: profileId,
        status: nextStatus,
      })
        .then(() => {
          if (!shouldApplyResponse()) return;
          // Already persisted above; API success confirms
        })
        .catch(() => {
          if (!shouldApplyResponse()) return;
          setProfileStatusErrors((prev) => withRecordValue(prev, profileId, undefined));
        })
        .finally(() => {
          if (!shouldApplyResponse()) return;
          setProfileStatusSaving((prev) => ({ ...prev, [profileId]: false }));
        });
    },
    [contentStatusById, profileStatusOverrides, updateFiber],
  );

  const handleViewModeChange = useCallback(
    (nextView: ViewMode) => {
      if (nextView === "knowledge") {
        setViewMode("knowledge");
        const fallbackFiberId = selectedId ?? knowledgeFibers[0]?.id ?? null;
        if (fallbackFiberId) {
          setSelectedId(fallbackFiberId);
        }
        setWorkbenchMode("edit-knowledge");
        return;
      }
      setViewMode(nextView);
      if (workbenchMode !== "browse") {
        setWorkbenchMode("browse");
      }
      // When switching to ImageBase (list), clear profile selection to view all
      if (nextView === "list") {
        setSelectedId(null);
      }
    },
    [knowledgeFibers, selectedId, setSelectedId, setViewMode, setWorkbenchMode, workbenchMode]
  );

  useEffect(() => {
    if (!forcedMode) return;
    setWorkbenchMode(forcedMode);
  }, [forcedMode, setWorkbenchMode]);

  useEffect(() => {
    const unsubscribe = subscribePassportStatusOverrides(() => {
      setProfileStatusOverrides(readPassportStatusOverrides());
    });
    return unsubscribe;
  }, []);

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (nodeId.startsWith("knowledge:")) {
      const fiberId = nodeId.replace("knowledge:", "");
      setViewMode("knowledge");
      setSelectedId(fiberId);
      setWorkbenchMode("edit-knowledge");
      return;
    }

    // Special handling for workflow nodes
    if (nodeId === "import") {
      setWorkbenchMode("import");
      setSelectedId("import");
      return;
    }
    if (nodeId === "overview") {
      setWorkbenchMode("overview");
      setSelectedId("overview");
      return;
    }
    if (nodeId === "batch") {
      setWorkbenchMode("batch");
      setSelectedId("batch");
      return;
    }
    if (nodeId === "health") {
      setWorkbenchMode("health");
      setSelectedId("health");
      return;
    }
    if (nodeId === "diff") {
      setWorkbenchMode("diff");
      setSelectedId("diff");
      return;
    }
    if (nodeId === "changesets") {
      setWorkbenchMode("changesets");
      setSelectedId("changesets");
      return;
    }
    if (nodeId === "sequence") {
      setWorkbenchMode("sequence");
      setSelectedId("sequence");
      return;
    }
    if (nodeId === "cards") {
      setWorkbenchMode("cards");
      setSelectedId("cards");
      return;
    }
    if (nodeId === "image-base") {
      setWorkbenchMode("browse");
      setSelectedId(null);
      return;
    }

    setSelectedId(nodeId);
    if (workbenchMode === "edit-profile") {
      // Stay in edit mode but for the new ID
    } else if (workbenchMode === "edit-knowledge" || viewMode === "knowledge") {
      // Sidebar profile clicks should stay on ImageBase, not force knowledge mode.
      setViewMode("list");
      setWorkbenchMode("browse");
    } else if (
      ["import", "overview", "batch", "health", "diff", "changesets", "sequence", "cards"].includes(
        workbenchMode,
      )
    ) {
      // Return to the shared browse surface after workflow screens.
      setWorkbenchMode("browse");
    } else {
      setViewPrefs(prev => ({
        ...prev,
        editor: {
          ...prev.editor,
          selectedId: nodeId,
        },
      }));
    }
  }, [setSelectedId, setViewMode, setWorkbenchMode, viewMode, workbenchMode]);

  const handleStartEdit = useCallback((nodeId: string) => {
    setSelectedId(nodeId);
    setWorkbenchMode("edit-profile");
  }, [setSelectedId, setWorkbenchMode]);

  const handleBatchSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Local keyboard scope for clearing multi-selection.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        handleClearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIds.size, handleClearSelection]);

  useEffect(() => {
    if (!knowledgeAction) return;
    if (knowledgeAction.action === "next-section") {
      const nextModes: ViewMode[] = ["list", "grid"];
      const idx = nextModes.indexOf(viewMode);
      setViewMode(nextModes[(idx + 1) % nextModes.length]);
      return;
    }
    if (knowledgeAction.action === "toggle-reference") {
      setViewMode("knowledge");
      const fallbackFiberId = selectedId ?? knowledgeFibers[0]?.id ?? null;
      if (fallbackFiberId) {
        setSelectedId(fallbackFiberId);
      }
      setWorkbenchMode("edit-knowledge");
      return;
    }
    if (knowledgeAction.action === "next-weak" || knowledgeAction.action === "save-draft") {
      setViewMode("knowledge");
      const fallbackFiberId = selectedId ?? knowledgeFibers[0]?.id ?? null;
      if (fallbackFiberId) {
        setSelectedId(fallbackFiberId);
      }
      setWorkbenchMode("edit-knowledge");
    }
  }, [knowledgeAction, knowledgeFibers, selectedId, setSelectedId, setViewMode, setWorkbenchMode, viewMode]);

  const updateSearch = useCallback((value: string) => {
    setViewPrefs((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        filters: { ...prev.gallery.filters, search: value },
      },
    }));
  }, []);

  const handleGridReorder = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const currentOrder = viewItems.map((item) => item.id);
      const fromIndex = currentOrder.indexOf(draggedId);
      const toIndex = currentOrder.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0) return;

      const nextOrder = [...currentOrder];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);
      dataSource.setFiberOrder(nextOrder);
    },
    [viewItems]
  );

  const renderBrowseToolbar = () => (
    <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 border-b border-white/[0.06] bg-[#0a0a0a]">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
        <ViewToggle
          currentView={effectiveMode === "edit-knowledge" ? "knowledge" : viewMode}
          onChange={handleViewModeChange}
        />

        <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />

        <div
          className="relative group flex-none"
          style={{ width: 360, minWidth: 170, maxWidth: "100%" }}
        >
          <button
            type="button"
            onClick={() => {
              const detail = {
                profileId:
                  selectedId && !selectedId.startsWith("knowledge:") ? selectedId : undefined,
                query: viewPrefs.gallery.filters.search,
              };
              window.dispatchEvent(new CustomEvent("admin:open-image-scout", { detail }));
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-500 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/50"
            aria-label="Open Image Scout"
            title="Open Image Scout"
          >
            <Search className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={viewPrefs.gallery.filters.search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search profiles..."
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#111111] pl-8 pr-8 text-sm text-white transition-all placeholder:text-neutral-500 focus:border-blue-400/40 focus:bg-[#141414] focus:outline-none"
          />
          {viewPrefs.gallery.filters.search ? (
            <button
              type="button"
              onClick={() => updateSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-500 transition-colors hover:text-white"
              aria-label="Clear search profiles"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {viewMode === "grid" && effectiveMode === "browse" ? (
        <div className="hidden md:flex items-center gap-2 pl-2">
          <button
            type="button"
            onClick={() => setGridZoomScale((prev) => Math.max(0.75, Number((prev - 0.1).toFixed(2))))}
            className="w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center"
            title="Zoom out grid"
            aria-label="Zoom out grid"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0.75}
            max={1.6}
            step={0.05}
            value={gridZoomScale}
            onChange={(e) => setGridZoomScale(Number(e.target.value))}
            className="w-24"
            aria-label="Grid zoom scale"
            title={`Grid zoom scale ${Math.round(gridZoomScale * 100)}%`}
          />
          <button
            type="button"
            onClick={() => setGridZoomScale((prev) => Math.min(1.6, Number((prev + 0.1).toFixed(2))))}
            className="w-7 h-7 rounded-md border border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center justify-center"
            title="Zoom in grid"
            aria-label="Zoom in grid"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="w-10" />
      )}
    </div>
  );

  const renderContent = () => {
    switch (effectiveMode) {
      case "import":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Ingestion" />}>
              <IngestionPanel onClose={() => handleNodeSelect("image-base")} onFlash={() => {}} />
            </Suspense>
          </div>
        );

      case "overview":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Operations" />}>
              <OperationsDomain />
            </Suspense>
          </div>
        );

      case "batch":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Batch" />}>
              <BatchDomain />
            </Suspense>
          </div>
        );

      case "health":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Health" />}>
              <HealthDomain />
            </Suspense>
          </div>
        );

      case "diff":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Diff" />}>
              <DiffDomain />
            </Suspense>
          </div>
        );

      case "changesets":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Changesets" />}>
              <ChangesetDomain />
            </Suspense>
          </div>
        );

      case "sequence":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Sequence" />}>
              <SequenceEditor />
            </Suspense>
          </div>
        );

      case "cards":
        return (
          <div className="h-full bg-black overflow-hidden relative">
            <Suspense fallback={<LoadingFallback label="Card Editor" />}>
              <CardEditorDomain />
            </Suspense>
          </div>
        );

      case "edit-knowledge":
        return (
          <div className="h-full flex flex-col bg-black overflow-hidden relative">
            {renderBrowseToolbar()}
            <div className="flex-1 overflow-hidden">
              <Suspense fallback={<LoadingFallback label="Knowledge Editor" />}>
                {selectedId ? (
                  <UnifiedEditorDomain fiberId={selectedId} />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    Select a knowledge fiber to begin editing.
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        );

      case "browse":
        return (
          <div className="h-full flex flex-col bg-[#060606]">
            {renderBrowseToolbar()}

            {/* ImageBase Content - keep toolbar static, swap viewport only */}
            <div className="flex-1 min-h-0 overflow-hidden bg-[#060606]">
              <Suspense fallback={<div className="p-8 text-white/50">Loading view...</div>}>
                {(viewMode === 'list' || viewMode === 'knowledge') && (
                  <div className="h-full w-full">
                    <ImageDatabaseManager
                      activeNodeId={selectedId}
                      focusProfileId={selectedId}
                      viewMode="list"
                      searchQueryInput={viewPrefs.gallery.filters.search}
                      onSearchQueryInputChange={(value) =>
                        setViewPrefs((prev) => ({
                          ...prev,
                          gallery: {
                            ...prev.gallery,
                            filters: { ...prev.gallery.filters, search: value },
                          },
                        }))
                      }
                      onNavigateToKnowledge={(profileKey) => handleNodeSelect(`knowledge:${profileKey}`)}
                    />
                  </div>
                )}
                {viewMode === 'grid' && (
                  <div className="h-full overflow-auto p-6">
                    <GridView
                      items={viewItems}
                      selectedId={selectedId}
                      onSelect={handleNodeSelect}
                      zoomScale={gridZoomScale}
                      onReorder={handleGridReorder}
                      onToggleStatus={handleToggleProfileStatus}
                      statusSavingById={profileStatusSaving}
                      statusErrorById={profileStatusErrors}
                    />
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        );

      case "edit-profile":
        return (
          <div className="h-full flex flex-col bg-[#050505]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setWorkbenchMode("browse")}
                  className="group flex items-center gap-2 text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                  Library
                </button>
                <div className="w-px h-6 bg-white/[0.08]" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-widest block" style={{ fontFamily: "'Pica', sans-serif" }}>
                      Workbench Editor
                    </span>
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter block">
                      Profile: {selectedId?.replace(/-/g, " ")}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                   Direct SQL Sync Enabled
                 </div>
              </div>
            </div>
                    <div className="flex-1 overflow-hidden">
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-full">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Booting Editor...</span>
                          </div>
                        </div>
                      }>
                        <NodeEditorTab initialNodeId={selectedId ?? undefined} />
                      </Suspense>
                    </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 bg-[#060606]">
      {/* Profile Sidebar Navigation — column is height-bounded so NodeSidebar can scroll internally */}
      <div
        className="relative z-10 flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden"
        style={{ width: NODE_SIDEBAR_WIDTH_PX }}
      >
        <NodeSidebar
          selectedId={selectedId}
          onSelect={handleNodeSelect}
          knowledgeFibers={knowledgeFibers}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#060606]">
        <div className="h-full w-full">
          {renderContent()}
        </div>
      </div>
    </div>
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

// ── ContentCard Component ──
interface ContentCardProps {
  item: {
    id: string;
    completion: { hasImages: boolean; hasKnowledge: boolean; hasRichContent: boolean; };
    status: 'draft' | 'published';
    images: unknown;
    passport: { summary?: string; performance?: unknown; sourcing?: unknown } | null;
  };
  isSelected: boolean;
  onSelect: (id: string) => void;
  isBatchSelected?: boolean;
  onBatchSelect?: (id: string, isMulti: boolean) => void;
  onEdit: (id: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  profile: UnifiedProfile | null;
}

function ContentCard({
  item,
  isSelected,
  onSelect,
  isBatchSelected = false,
  onBatchSelect,
  onEdit,
  expanded,
  onToggleExpanded,
  profile
}: ContentCardProps) {
  const normalizeImages = (images: unknown): Array<string | { url?: string }> => {
    if (!images) return [];
    return Array.isArray(images) ? (images as Array<string | { url?: string }>) : [images as string | { url?: string }];
  };
  const displayId = profile?.id || item.id;
  const displayStatus = profile?.status || item.status;
  const displayImages = normalizeImages(profile?.images?.length ? profile.images : item.images);
  const displayPassport = (profile?.passport || item.passport) as {
    summary?: string;
    performance?: unknown;
    sourcing?: unknown;
  } | null;
  const hasImages = profile ? profile.images.length > 0 : item.completion.hasImages;
  const hasKnowledge = profile ? !!profile.passport : item.completion.hasKnowledge;
  
  const loading = profile?.loading;

  const completeness = useMemo(() => {
    let score = 0;
    if (hasImages) score += 40;
    if (hasKnowledge) score += 30;
    if (displayPassport?.summary) score += 10;
    if (displayPassport?.performance) score += 10;
    if (displayPassport?.sourcing) score += 10;
    return score;
  }, [hasImages, hasKnowledge, displayPassport]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "group relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden",
        isSelected 
          ? "bg-blue-600/5 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/20" 
          : "bg-[#0c0c0c] border-white/[0.06] hover:border-white/10 hover:bg-[#111] hover:shadow-2xl",
        isBatchSelected && "ring-2 ring-emerald-500/40 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      )}
      onClick={() => onSelect(item.id)}
    >
      {/* Card Visual Header */}
      <div className="relative aspect-[16/9] overflow-hidden bg-neutral-900">
        {displayImages.length > 0 ? (
          <img 
            src={typeof displayImages[0] === 'string' ? displayImages[0] : displayImages[0]?.url || ""} 
            alt={displayId}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <ImageIcon className="w-12 h-12 text-neutral-600" />
          </div>
        )}
        
        {/* Selection Toggle Overlay */}
        <div 
          className={cn(
            "absolute top-3 left-3 z-10 transition-opacity duration-300",
            isBatchSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onBatchSelect?.(item.id, e.metaKey || e.ctrlKey);
          }}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shadow-xl",
            isBatchSelected 
              ? "bg-emerald-500 border-emerald-400 text-white" 
              : "bg-black/40 border-white/20 text-transparent hover:border-white/40"
          )}>
            {isBatchSelected && <CheckCircle className="w-3.5 h-3.5" />}
          </div>
        </div>
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-transparent to-black/40" />
        
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border flex items-center gap-1.5",
            completeness === 100 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : completeness > 50 
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-neutral-500/10 text-neutral-400 border-white/10"
          )}>
            <div className="w-1 h-1 rounded-full bg-current" />
            {completeness}% Health
          </div>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border",
            displayStatus === 'published' 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
          )}>
            {displayStatus}
          </div>
        </div>
        
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-widest truncate" style={{ fontFamily: "'Pica', sans-serif" }}>
            {displayId}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 opacity-60">
             <div className="flex items-center gap-1">
               <ImageIcon className="w-2.5 h-2.5" />
               <span className="text-[9px] font-bold uppercase">{displayImages.length} Assets</span>
             </div>
             <div className="w-px h-2 bg-white/20" />
             <div className="flex items-center gap-1">
               <Database className="w-2.5 h-2.5" />
               <span className="text-[9px] font-bold uppercase">{hasKnowledge ? 'Mapped' : 'Empty'}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {displayPassport?.summary && (
          <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed italic">
            "{String(displayPassport.summary)}"
          </p>
        )}

        {/* Completion Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "px-3 py-2 rounded-xl border flex flex-col gap-1 transition-colors",
            hasImages ? "bg-blue-600/5 border-blue-500/20" : "bg-white/[0.02] border-white/[0.04]"
          )}>
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Media</span>
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-bold uppercase", hasImages ? "text-blue-400" : "text-neutral-700")}>
                {hasImages ? 'Complete' : 'Pending'}
              </span>
              {hasImages && <CheckCircle className="w-2.5 h-2.5 text-blue-500" />}
            </div>
          </div>
          <div className={cn(
            "px-3 py-2 rounded-xl border flex flex-col gap-1 transition-colors",
            hasKnowledge ? "bg-emerald-600/5 border-emerald-500/20" : "bg-white/[0.02] border-white/[0.04]"
          )}>
            <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Knowledge</span>
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-bold uppercase", hasKnowledge ? "text-emerald-400" : "text-neutral-700")}>
                {hasKnowledge ? 'Complete' : 'Pending'}
              </span>
              {hasKnowledge && <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-2 mt-auto pt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(item.id); }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-white uppercase tracking-widest rounded-xl transition-all"
          >
            <Edit className="w-3 h-3" />
            Open Editor
          </button>
          <button 
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-400 hover:text-white rounded-xl transition-all"
            onClick={(e) => { e.stopPropagation(); onToggleExpanded(); }}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Overlay-ish */}
      {expanded && (
        <div className="p-4 bg-black/60 backdrop-blur-md border-t border-white/10 animate-in slide-in-from-bottom-2">
          {loading ? (
             <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" /></div>
          ) : profile?.node && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[9px] font-bold text-neutral-500 uppercase">
                <span>Properties</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                  <div className="text-[7px] text-neutral-600 uppercase font-bold tracking-tighter">Category</div>
                  <div className="text-[10px] text-white font-medium truncate">{profile.node.category || '—'}</div>
                </div>
                <div className="bg-white/[0.03] p-2 rounded-lg border border-white/[0.04]">
                  <div className="text-[7px] text-neutral-600 uppercase font-bold tracking-tighter">Scientific</div>
                  <div className="text-[10px] text-white font-medium italic truncate">{profile.node.scientificName || '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

