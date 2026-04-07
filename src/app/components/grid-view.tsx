/* @refresh reset */
import { useAtlasData } from "../context/atlas-data-context";
import { useAtlasScrollPort } from "../context/atlas-scroll-port-context";
import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, lazy, Suspense, useDeferredValue } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  getGalleryImages,
  mergeFiberGalleryWithFallback,
  prefetchGalleryImagesForFibers,
  type GalleryImageEntry,
  type PlateType,
} from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { ProfileCard } from "./profile-card";
import { useImageAnalysis } from "../hooks/use-image-brightness";
import { useFiberDetail, prefetchFiberDetails } from "../hooks/use-fiber-detail";
import { useMagneticTilt } from "../hooks/use-magnetic-tilt";
import { useColumnCount } from "../hooks/use-column-count";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { useVirtualGrid } from "../hooks/use-virtual-grid";
import { useDetailLifecycle } from "../hooks/use-detail-lifecycle";
import { useExhaleLayoutSnapshot } from "../hooks/use-exhale-layout-snapshot";
import { useExhaleVirtualGridExtent } from "../hooks/use-exhale-virtual-grid-extent";
import { useLightboxState } from "../hooks/use-lightbox-state";
import { useScreenPlateState } from "../hooks/use-screen-plate-state";
import { getWarmupPolicy, preloadContactSheetTargets, warmUpImageAnalysis } from "../utils/image-warmup";
import { getGridProfileImageLoadingFlags } from "../utils/grid-profile-image-priority";
import {
  FIBER_PATH_PREFIX,
  parseUrlNavigationState,
  writeBrowseHashState,
  saveScrollPosition,
  restoreScrollPosition,
} from "../utils/hash-routing";
import { smoothScrollToIfNeeded } from "../utils/smooth-scroll";
import {
  chunkGalleryForContactSheets,
  computePlateLayout,
  DETAIL_FADE, EXHALE_EASE,
  type CellVisibility,
} from "../utils/plate-layout";
import { getDetailSlotClassSuffix, computeDetailGridRenderPlan } from "../utils/detail-slot-classes";
import { getAvailablePlates } from "./plate-availability";
import { Search, X } from "lucide-react";
import { useImagePipeline } from "../context/image-pipeline";
import { GridSkeleton } from "./grid-skeleton";
import { Link, useLocation, useNavigate } from "react-router";
import { preloadAboutRoute } from "../route-preload";
import {
  ATLAS_GRID_CATEGORY_PILL_STYLE,
  ATLAS_GRID_CLOSE_STYLE,
  ATLAS_GRID_EMPTY_BODY_STYLE,
  ATLAS_GRID_EMPTY_CTA_STYLE,
  ATLAS_GRID_EMPTY_TITLE_STYLE,
  ATLAS_GRID_HINT_STYLE,
  ATLAS_GRID_LINK_STYLE,
  ATLAS_GRID_LOADING_STYLE,
  ATLAS_GRID_SEARCH_STYLE,
  ATLAS_GRID_SUBHEAD_MUTED_STYLE,
  ATLAS_GRID_SUBHEAD_STYLE,
  ATLAS_GRID_TITLE_STYLE,
  ATLAS_PILL_ACTIVE_CLASS,
  ATLAS_PILL_BASE_CLASS,
  ATLAS_PILL_IDLE_CLASS,
  ATLAS_SEARCH_CLEAR_BUTTON_CLASS,
  ATLAS_SEARCH_INPUT_CLASS,
} from "./atlas-shared";

const LazyLightbox = lazy(async () => {
  const mod = await import("./lightbox");
  return { default: mod.Lightbox };
});

const LazyDetailCard = lazy(async () => {
  const mod = await import("./detail-card");
  return { default: mod.DetailCard };
});

const LazyScreenPlate = lazy(async () => {
  const mod = await import("./screen-plate");
  return { default: mod.ScreenPlate };
});

function preloadOverlayModules(): void {
  void import("./detail-card");
  void import("./lightbox");
  void import("./screen-plate");
}

const categories = [
  { key: "all", label: "All" },
  { key: "fiber", label: "Fiber" },
  { key: "textile", label: "Textile" },
  { key: "dye", label: "Dye" },
] as const;

function emitDebugProbe(_hypothesisId: string, _location: string, _message: string, _data: Record<string, unknown>): void {
  /* Local agent-ingest removed — re-enable only with VITE_ATLAS_DEBUG_INGEST if needed. */
}

/** Strong odd-column drop (Pinterest-style); same in browse + detail to avoid vertical layout jump. */
function gridColumnStaggerPx(colIndex: number, cols: number, reducedMotion: boolean): number {
  if (reducedMotion || cols < 2) return 0;
  if (colIndex % 2 === 0) return 0;
  if (cols === 2) return 94;
  if (cols === 3) return 94;
  if (cols === 4) return 94;
  return 94;
}

interface GridViewProps {
  hideHeader?: boolean;
  /** Incremented on each TopNav navigation commit (including re-selecting the same node). */
  navInteractionEpoch?: number;
  externalCategory?: string;
  externalFiberSubcategory?:
    | "plant"
    | "animal"
    | "regen"
    | "bast-fiber"
    | "bark-fiber"
    | "seed-fiber"
    | "leaf-fiber"
    | "grass-fiber"
    | "fruit-fiber"
    | "wool-fiber"
    | "silk-fiber"
    | "hair-fiber"
    | "specialty-protein"
    | null;
  externalSearch?: string;
  onCategoryChange?: (category: string) => void;
  onSearchChange?: (search: string) => void;
  onVisibleProfilesChange?: (count: number) => void;
}

export function GridView({
  hideHeader = false,
  navInteractionEpoch = 0,
  externalCategory,
  externalFiberSubcategory,
  externalSearch,
  onCategoryChange,
  onSearchChange,
  onVisibleProfilesChange,
}: GridViewProps = {}) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalCategory, setInternalCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Use external values when provided, otherwise fall back to internal state
  const search = externalSearch !== undefined ? externalSearch : internalSearch;
  const activeCategory = externalCategory !== undefined ? externalCategory : internalCategory;
  const activeFiberSubcategory = externalFiberSubcategory ?? null;
  const deferredSearch = useDeferredValue(search);

  // Wrapper setters that call callbacks when provided
  const setSearch = useCallback((value: string) => {
    if (externalSearch === undefined) setInternalSearch(value);
    onSearchChange?.(value);
  }, [externalSearch, onSearchChange]);

  const setActiveCategory = useCallback((value: string) => {
    if (externalCategory === undefined) setInternalCategory(value);
    onCategoryChange?.(value);
  }, [externalCategory, onCategoryChange]);

  /* ── Reactive data from DataProvider (live preview in admin mode) ── */
  const { fiberIndex, adminMode, editingFiberId, setEditingFiberId } = useAtlasData();
  const navigate = useNavigate();
  const location = useLocation();

  const buildFiberPath = useCallback((id: string, category: string) => {
    const qs = category !== "all" ? `?cat=${encodeURIComponent(category)}` : "";
    return `${FIBER_PATH_PREFIX}${encodeURIComponent(id)}${qs}`;
  }, []);

  /** Relative to the atlas layout route (pathless parent) so RR7 resolves `/fiber/:id` correctly */
  const navigateToFiberRoute = useCallback(
    (id: string, replace: boolean) => {
      const search = activeCategory !== "all" ? `?cat=${encodeURIComponent(activeCategory)}` : "";
      navigate(
        {
          pathname: `fiber/${encodeURIComponent(id)}`,
          ...(search ? { search } : {}),
        },
        { replace },
      );
    },
    [navigate, activeCategory],
  );

  const isAnimalFiber = useCallback((fiber: (typeof fiberIndex)[number]): boolean => {
    const fiberType = fiber.profilePills.fiberType.toLowerCase();
    const plantPart = fiber.profilePills.plantPart.toLowerCase();
    return (
      fiberType.includes("protein")
      || plantPart.includes("fleece")
      || plantPart.includes("undercoat")
      || plantPart.includes("underdown")
      || plantPart.includes("cocoon")
      || plantPart.includes("spinneret")
      || plantPart.includes("mane")
      || plantPart.includes("tail")
    );
  }, []);

  const isRegeneratedFiber = useCallback((fiber: (typeof fiberIndex)[number]): boolean => {
    const fiberType = fiber.profilePills.fiberType.toLowerCase();
    return fiberType.includes("regenerated");
  }, []);

  const getPlantFiberSubtype = useCallback((fiber: (typeof fiberIndex)[number]): "bast-fiber" | "bark-fiber" | "seed-fiber" | "leaf-fiber" | "grass-fiber" | "fruit-fiber" | null => {
    const fiberType = fiber.profilePills.fiberType.toLowerCase();
    if (fiberType.includes("bast")) return "bast-fiber";
    if (fiberType.includes("bark")) return "bark-fiber";
    if (fiberType.includes("seed")) return "seed-fiber";
    if (fiberType.includes("leaf")) return "leaf-fiber";
    if (fiberType.includes("grass")) return "grass-fiber";
    if (fiberType.includes("fruit")) return "fruit-fiber";
    return null;
  }, []);

  const getAnimalFiberSubtype = useCallback((fiber: (typeof fiberIndex)[number]): "wool-fiber" | "silk-fiber" | "hair-fiber" | "specialty-protein" | null => {
    if (!isAnimalFiber(fiber)) return null;
    const id = fiber.id.toLowerCase();
    const name = fiber.name.toLowerCase();
    const part = fiber.profilePills.plantPart.toLowerCase();
    const fiberType = fiber.profilePills.fiberType.toLowerCase();

    if (id.includes("spider") || name.includes("spider")) return "specialty-protein";
    if (id.includes("silk") || name.includes("silk") || part.includes("cocoon") || part.includes("spinneret")) return "silk-fiber";
    if (
      name.includes("wool")
      || id === "merino"
      || id === "columbia"
      || id === "corriedale"
      || id === "romney"
      || id.includes("lincoln")
      || id.includes("navajo-churro")
    ) return "wool-fiber";
    if (
      part.includes("undercoat")
      || part.includes("underdown")
      || part.includes("mane")
      || part.includes("tail")
      || name.includes("cashmere")
      || name.includes("mohair")
      || name.includes("alpaca")
      || name.includes("yak")
      || name.includes("llama")
      || name.includes("bison")
      || name.includes("qiviut")
      || name.includes("camel")
      || name.includes("angora")
      || name.includes("horsehair")
    ) return "hair-fiber";
    if (fiberType.includes("protein")) return "specialty-protein";
    return null;
  }, [isAnimalFiber]);

  /* ── Extracted hooks ── */
  const { lightboxFiberId, lightboxInitialIndex, lightboxSourceRect, openLightbox, closeLightbox } = useLightboxState();
  const { phase: detailInhalePhase } = useDetailLifecycle(selectedId);
  const detailSlotClassSuffix = useMemo(
    () => getDetailSlotClassSuffix(detailInhalePhase),
    [detailInhalePhase],
  );

  /* Preload detail/lightbox/screen chunks on mount — if we only start after
     selection, the first open paints Suspense fallbacks until the chunk loads
     (visible flicker when inhale opacity goes to 1). */
  useEffect(() => {
    preloadOverlayModules();
  }, []);

  const { cols, gridGap } = useColumnCount();
  const isMobile = cols <= 2;
  const prefersReducedMotion = usePrefersReducedMotion();
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const indexRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pipeline = useImagePipeline();

  /* ── Part 2: Virtualized grid — skeleton placeholders for off-screen cells ──
     Disabled in detail mode so plate layout can assign to arbitrary cells. */
  const isDetailMode = selectedId !== null;
  const atlasScrollPort = useAtlasScrollPort();
  const { visibleIds, observeCell, virtualIoGeneration } = useVirtualGrid(isDetailMode, atlasScrollPort);

  /* Virtual grid: ref callbacks run before useVirtualGrid’s effect installs the observer — re-observe after each IO (re)create. */
  useLayoutEffect(() => {
    if (isDetailMode || virtualIoGeneration === 0) return;
    cellRefs.current.forEach((el, id) => observeCell(el, id));
  }, [isDetailMode, observeCell, virtualIoGeneration]);

  /* ── Collapsing header ──
     Track whether the user has scrolled past the initial viewport.
     Uses a sentinel element at the top of the page. When the sentinel
     leaves the viewport, the header compacts (smaller padding, subheader
     hides). Disabled during detail mode where the subheader shows the
     selected fiber name. */
  const [headerCompact, setHeaderCompact] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* With TopNav (`hideHeader`), compact header state is unused — observing
       the sentinel still flips state on scroll and re-renders the whole grid. */
    if (hideHeader) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderCompact(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hideHeader, setActiveCategory]);

  /* ── Derived data (must be before warmup effect which uses filtered) ── */
  const filtered = useMemo(() => {
    const appliedSearch = selectedId ? search : deferredSearch;
    const nextFiltered = fiberIndex.filter((f) => {
      const matchesStatus = adminMode || f.status === "published";
      const matchesCategory =
        activeCategory === "all" || f.category === activeCategory;
      const matchesFiberSubcategory =
        !activeFiberSubcategory
        || activeCategory !== "fiber"
        || (
          activeFiberSubcategory === "animal"
            ? isAnimalFiber(f)
            : activeFiberSubcategory === "regen"
              ? isRegeneratedFiber(f)
              : activeFiberSubcategory === "plant"
                ? !isAnimalFiber(f) && !isRegeneratedFiber(f)
                : (activeFiberSubcategory === "wool-fiber"
                  || activeFiberSubcategory === "silk-fiber"
                  || activeFiberSubcategory === "hair-fiber"
                  || activeFiberSubcategory === "specialty-protein")
                  ? getAnimalFiberSubtype(f) === activeFiberSubcategory
                : getPlantFiberSubtype(f) === activeFiberSubcategory
        );
      const matchesSearch =
        !appliedSearch || f.name.toLowerCase().includes(appliedSearch.toLowerCase());
      return matchesStatus && matchesCategory && matchesFiberSubcategory && matchesSearch;
    });
    emitDebugProbe(
      "H1",
      "src/app/components/grid-view.tsx:filteredUseMemo",
      "Computed filtered set for search/category",
      {
        search: appliedSearch,
        deferredSearch,
        selectedId,
        activeCategory,
        adminMode,
        activeFiberSubcategory,
        filteredCount: nextFiltered.length,
        firstFilteredIds: nextFiltered.slice(0, 6).map((f) => f.id),
      },
    );
    return nextFiltered;
  }, [
    activeCategory,
    adminMode,
    activeFiberSubcategory,
    deferredSearch,
    fiberIndex,
    isAnimalFiber,
    getAnimalFiberSubtype,
    getPlantFiberSubtype,
    isRegeneratedFiber,
    search,
    selectedId,
  ]);

  /* ── Optimization #5 + #6: Prefetch detail data & warm up image analysis cache ── */
  const warmupDone = useRef(false);
  useEffect(() => {
    if (warmupDone.current) return;
    const policy = getWarmupPolicy();

    /* Immediate: preload first N grid images for above-the-fold cards (no delay) */
    const toPreload = policy.skip ? [] : filtered.slice(0, Math.max(8, cols * 2));
    for (const fiber of toPreload) {
      const url = pipeline.transform(fiber.image, "grid");
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }

    if (policy.skip) return;

    const startWarmup = () => {
      if (warmupDone.current) return;
      warmupDone.current = true;
      // Preload lazy overlay chunks ahead of first detail open.
      preloadOverlayModules();
      prefetchFiberDetails();
      warmUpImageAnalysis(fiberIndex.map((f) => f.image), pipeline);
    };

    const deferred = window.setTimeout(startWarmup, policy.startDelayMs);
    const onIntent = () => {
      startWarmup();
      window.clearTimeout(deferred);
    };
    const passiveOpts = { passive: true, once: true } as const;
    window.addEventListener("pointerdown", onIntent, passiveOpts);
    window.addEventListener("touchstart", onIntent, passiveOpts);
    window.addEventListener("keydown", onIntent, { once: true });

    return () => {
      window.clearTimeout(deferred);
      window.removeEventListener("pointerdown", onIntent);
      window.removeEventListener("touchstart", onIntent);
      window.removeEventListener("keydown", onIntent);
    };
  }, [filtered, cols, fiberIndex, isMobile, pipeline]);

  /* ── Lazy detail loading (#5) ── */
  const selectedFiberDetail = useFiberDetail(selectedId);

  /* ── Refs for crossfade & magnetic tilt ── */
  const selectedIdRef = useRef<string | null>(null);
  const transitionRef = useRef<string | null>(null);
  /** True while null between two fibers (handleSelectFiber) — skip exhale grid hold */
  const pendingFiberSwitchRef = useRef(false);
  /** In-app close (card toggle / Close button without history.back): do not restore pre-open scroll */
  const skipScrollRestoreRef = useRef(false);
  const selectedIndexDriftRef = useRef<{ id: string | null; index: number }>({ id: null, index: -1 });
  const gridRef = useRef<HTMLDivElement>(null);
  const tiltRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const closeDetailButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusFiberIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    const selectedIndex = filtered.findIndex((fiber) => fiber.id === selectedId);
    const nearbyIds = [
      selectedId,
      selectedIndex > 0 ? filtered[selectedIndex - 1]?.id : null,
      selectedIndex >= 0 && selectedIndex < filtered.length - 1 ? filtered[selectedIndex + 1]?.id : null,
    ].filter((id): id is string => !!id);
    void prefetchGalleryImagesForFibers(nearbyIds);
  }, [filtered, selectedId]);

  /* Warm contact-sheet CDN URLs as soon as a fiber is selected (pairs with ProgressiveImage in ProfileImageExperience). */
  useEffect(() => {
    if (!selectedId) return;
    const fiber = dataSource.getFiberById(selectedId);
    const gallery = fiber ? mergeFiberGalleryWithFallback(selectedId, fiber) : getGalleryImages(selectedId);
    const urls = gallery
      .map((g) => (g.url?.trim() ? g.url : g.thumbUrl))
      .filter((u): u is string => typeof u === "string" && u.trim() !== "");
    preloadContactSheetTargets(urls, pipeline);
  }, [selectedId, pipeline]);

  useEffect(() => {
    onVisibleProfilesChange?.(filtered.length);
  }, [filtered.length, onVisibleProfilesChange]);

  const selectedFiber = useMemo(
    () => fiberIndex.find((f) => f.id === selectedId) ?? null,
    [selectedId, fiberIndex],
  );

  const hasSeenExternalFilterRef = useRef(false);
  /* useLayoutEffect: clear selection before path/URL useEffects in the same turn (avoids URL sync re-opening detail). */
  useLayoutEffect(() => {
    if (externalCategory === undefined && externalFiberSubcategory === undefined) return;
    if (!hasSeenExternalFilterRef.current) {
      hasSeenExternalFilterRef.current = true;
      return;
    }
    setSelectedId((current) => (current ? null : current));
  }, [externalCategory, externalFiberSubcategory]);

  useLayoutEffect(() => {
    if (navInteractionEpoch <= 0) return;
    setSelectedId((current) => (current ? null : current));
  }, [navInteractionEpoch]);

  /* ── Magnetic tilt (#4) — extracted into useMagneticTilt hook ── */
  useMagneticTilt(gridRef, tiltRefs, selectedIdRef, [filtered, cols, selectedId]);

  /* ── Plate assignment + stagger computation ──
     Delegates to the pure computePlateLayout() function.
     Cell visibility is snapshotted from the DOM at computation time. */
  const {
    plateAssignments,
    profileInhaleDelays,
    detailInhaleDelays,
    profileExhaleDelays,
    detailExhaleDelays,
    gallerySlotImages,
    gallerySlotStartIndex,
  } = useMemo(() => {
    /* Snapshot viewport visibility for scroll-aware inhale */
    const vpTop = window.scrollY;
    const vpBottom = vpTop + window.innerHeight;
    const ratios = new Map<number, number>();

    filtered.forEach((fiber, i) => {
      const el = cellRefs.current.get(fiber.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        const elTop = rect.top + window.scrollY;
        const elBottom = elTop + rect.height;
        const overlap = Math.max(0, Math.min(elBottom, vpBottom) - Math.max(elTop, vpTop));
        ratios.set(i, rect.height > 0 ? Math.min(1, overlap / rect.height) : 0);
      }
    });

    const visibility: CellVisibility = { ratios };
    /* Merged gallery (overrides + baseline) for the contact sheet — raw galleryImages
       alone would replace the full catalog queue when only a partial override exists. */
    const selectedFiberFull = selectedId ? dataSource.getFiberById(selectedId) : undefined;
    const gallery =
      selectedId && selectedFiberFull
        ? mergeFiberGalleryWithFallback(selectedId, selectedFiberFull)
        : undefined;
    const selectedIndexInFiltered = selectedId ? filtered.findIndex((f) => f.id === selectedId) : -1;
    emitDebugProbe(
      "H2",
      "src/app/components/grid-view.tsx:plateLayoutInput",
      "Preparing plate-layout computation",
      {
        selectedId,
        selectedIndexInFiltered,
        filteredCount: filtered.length,
        cols,
        hasGalleryOverride: Array.isArray(gallery) && gallery.length > 0,
      },
    );
    const layout = computePlateLayout(selectedId, filtered, cols, visibility, gallery);
    emitDebugProbe(
      "H3",
      "src/app/components/grid-view.tsx:plateLayoutOutput",
      "Plate-layout computation result",
      {
        selectedId,
        plateAssignmentCount: layout.plateAssignments.size,
        detailInhaleCount: layout.detailInhaleDelays.size,
        gallerySlotCount: layout.gallerySlotImages.size,
        assignedPlateTypes: [...layout.plateAssignments.values()],
      },
    );
    return layout;
  }, [selectedId, filtered, cols]);

  /* ── ScreenPlate hook — replaces inline screenPlateEntries/getCellRect ── */
  const { screenPlateInfo, screenPlateEntries, getCellRect, openScreenPlate, closeScreenPlate } = useScreenPlateState(plateAssignments, filtered, cellRefs, indexRefs);

  /* ── Mobile ScreenPlate: plates from mobile's getAvailablePlates + contactSheet ── */
  const mobileScreenPlateEntries = useMemo(() => {
    if (!selectedFiberDetail || !isMobile) return null;
    const avail = getAvailablePlates(selectedFiberDetail);
    const screenFiber = dataSource.getFiberById(selectedFiberDetail.id);
    const gallery = mergeFiberGalleryWithFallback(
      selectedFiberDetail.id,
      screenFiber ?? selectedFiberDetail,
    );
    const entries = avail.map((pt) => ({ plateType: pt, cellIndex: 0 }));
    if (gallery.length > 0) {
      chunkGalleryForContactSheets(gallery).forEach((_, chunkIdx) => {
        entries.push({ plateType: "contactSheet" as PlateType, cellIndex: chunkIdx });
      });
    }
    return entries;
  }, [selectedFiberDetail, isMobile]);

  const mobileContactGalleryMaps = useMemo(() => {
    if (!selectedFiberDetail || !isMobile) return null;
    const screenFiber = dataSource.getFiberById(selectedFiberDetail.id);
    const gallery = mergeFiberGalleryWithFallback(
      selectedFiberDetail.id,
      screenFiber ?? selectedFiberDetail,
    );
    if (gallery.length === 0) return null;
    const images = new Map<number, GalleryImageEntry[]>();
    const starts = new Map<number, number>();
    chunkGalleryForContactSheets(gallery).forEach((desc, i) => {
      images.set(i, desc.images);
      starts.set(i, desc.startIndex);
    });
    return { images, starts };
  }, [selectedFiberDetail, isMobile]);

  const { profileDelaysRef: exhaleProfileDelaysRef, detailDelaysRef: exhaleDetailDelaysRef } =
    useExhaleLayoutSnapshot(selectedId, profileExhaleDelays, detailExhaleDelays);

  const exhaleVirtualTail = useExhaleVirtualGridExtent(
    selectedId,
    filtered.length,
    plateAssignments,
    selectedId === null && pendingFiberSwitchRef.current,
  );

  const gridCellIndices = useMemo(() => {
    const plan = computeDetailGridRenderPlan(filtered.length, plateAssignments, isDetailMode);
    const n = Math.max(plan.renderCellCount, filtered.length + exhaleVirtualTail);
    return Array.from({ length: n }, (_, i) => i);
  }, [filtered.length, plateAssignments, isDetailMode, exhaleVirtualTail]);

  /* Keep selectedIdRef in sync */
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  /* ── Crossfade completion ── */
  useEffect(() => {
    if (selectedId === null && transitionRef.current) {
      const nextId = transitionRef.current;
      transitionRef.current = null;
      const timer = setTimeout(() => {
        pendingFiberSwitchRef.current = false;
        setSelectedId(nextId);
      }, 260);
      return () => {
        clearTimeout(timer);
        pendingFiberSwitchRef.current = false;
      };
    }
  }, [selectedId]);

  /* ── Ensure cell-visible on selection transitions ── */
  const prevSelectedId = useRef<string | null>(null);
  useEffect(() => {
    const entering = prevSelectedId.current === null && selectedId !== null;
    const leaving  = prevSelectedId.current !== null && selectedId === null;
    if (entering || leaving) {
      const markVisible = (el: HTMLDivElement) => {
        if (!el.classList.contains("cell-visible")) el.classList.add("cell-visible");
      };
      cellRefs.current.forEach(markVisible);
      indexRefs.current.forEach(markVisible);
    }
    prevSelectedId.current = selectedId;
  }, [selectedId]);

  /* ── Sync-visibility sweep on filter changes ──
     When search or category changes, new cells mount via ref callbacks
     and get observed by the IO, but the async callback hasn't fired yet.
     Sweep viewport cells synchronously so they don't flash at opacity: 0. */
  useEffect(() => {
    const vpH = window.innerHeight;
    const sweep = (el: HTMLDivElement) => {
      if (el.classList.contains("cell-visible")) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vpH + 60 && rect.bottom > -60) {
        el.classList.add("cell-visible");
      }
    };
    cellRefs.current.forEach(sweep);
    indexRefs.current.forEach(sweep);
  }, [filtered]);

  /* ── Viewport-aware fade-in via IntersectionObserver ── */
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const fadeIo: IntersectionObserverInit = {
      rootMargin: "60px 0px 60px 0px",
      threshold: 0.05,
    };
    if (atlasScrollPort) {
      fadeIo.root = atlasScrollPort;
    }
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("cell-visible");
            observerRef.current?.unobserve(entry.target);
          }
        }
      },
      fadeIo,
    );

    /* Retroactively observe cells that mounted before the observer was ready.
       Ref callbacks run during commit (before useEffect), so on the first
       render observerRef.current is still null and cells silently skip
       observation. Sweep them now so they get their cell-visible class.

       Additionally, synchronously mark cells that are already in or near
       the viewport as visible — IntersectionObserver callbacks are async
       and won't fire until a future microtask, leaving above-fold cells
       at opacity: 0 on initial load until a scroll event triggers IO. */
    const vpH = window.innerHeight;
    cellRefs.current.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vpH + 60 && rect.bottom > -60) {
        el.classList.add("cell-visible");
      }
      observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [atlasScrollPort, fiberIndex, setActiveCategory]);

  const handleCardClick = useCallback(
    (fiberId: string) => {
      /* In admin mode, clicking a card opens the editor for that fiber */
      if (adminMode) {
        setEditingFiberId(fiberId);
      }
      transitionRef.current = null;
      emitDebugProbe(
        "H4",
        "src/app/components/grid-view.tsx:handleCardClick",
        "User clicked profile card in grid",
        {
          fiberId,
          previousSelectedId: selectedIdRef.current,
          deferredSearch,
          filteredCount: filtered.length,
          isFilteredToSingle: filtered.length === 1,
        },
      );
      // #region agent log
      emitDebugProbe(
        "R1",
        "src/app/components/grid-view.tsx:handleCardClick",
        "Card click snapshot before detail transition",
        {
          fiberId,
          clickedIndexInFiltered: filtered.findIndex((f) => f.id === fiberId),
          filteredCount: filtered.length,
          deferredSearch,
          cols,
        },
      );
      // #endregion
      setSelectedId((prev) => {
        if (prev === fiberId) {
          skipScrollRestoreRef.current = true;
          return null;
        }
        return fiberId;
      });
    },
    [adminMode, cols, deferredSearch, filtered, setEditingFiberId]
  );

  useEffect(() => {
    if (!selectedId) return;
    let renderableDetailSlots = 0;
    for (let index = 0; index < filtered.length; index += 1) {
      const isSelected = filtered[index]?.id === selectedId;
      const plateType = plateAssignments.get(index);
      const showDetail = !isSelected && !!plateType && !!selectedFiberDetail;
      if (showDetail) renderableDetailSlots += 1;
    }
    emitDebugProbe(
      "H5",
      "src/app/components/grid-view.tsx:detailRenderSummary",
      "Detail render eligibility summary after selection",
      {
        selectedId,
        filteredCount: filtered.length,
        selectedFiberDetailReady: !!selectedFiberDetail,
        plateAssignmentCount: plateAssignments.size,
        renderableDetailSlots,
      },
    );
  }, [filtered, plateAssignments, selectedFiberDetail, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      selectedIndexDriftRef.current = { id: null, index: -1 };
      return;
    }
    const selectedIndex = filtered.findIndex((f) => f.id === selectedId);
    const colIndex = selectedIndex >= 0 ? selectedIndex % cols : -1;
    const colOffset =
      colIndex >= 0 ? gridColumnStaggerPx(colIndex, cols, prefersReducedMotion) : 0;
    // #region agent log
    emitDebugProbe(
      "R2",
      "src/app/components/grid-view.tsx:selectedIndexEffect",
      "Selected profile grid position after state update",
      {
        selectedId,
        selectedIndex,
        filteredCount: filtered.length,
        colIndex,
        colOffset,
        activeSearch: deferredSearch,
      },
    );
    // #endregion
    const prev = selectedIndexDriftRef.current;
    if (prev.id === selectedId && prev.index !== -1 && selectedIndex !== -1 && prev.index !== selectedIndex) {
      // #region agent log
      emitDebugProbe(
        "R3",
        "src/app/components/grid-view.tsx:selectedIndexEffect",
        "Selected profile index drifted while same profile remained selected",
        {
          selectedId,
          previousIndex: prev.index,
          nextIndex: selectedIndex,
          filteredCount: filtered.length,
          activeSearch: deferredSearch,
        },
      );
      // #endregion
    }
    selectedIndexDriftRef.current = { id: selectedId, index: selectedIndex };
  }, [cols, deferredSearch, filtered, prefersReducedMotion, selectedId]);

  const handleSelectFiber = useCallback((id: string) => {
    if (selectedIdRef.current && selectedIdRef.current !== id) {
      pendingFiberSwitchRef.current = true;
      transitionRef.current = id;
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  }, []);

  const handleClose = useCallback(() => {
    const returnId = selectedIdRef.current;
    if (returnId) pendingFocusFiberIdRef.current = returnId;
    if (pushedDetailRef.current) {
      history.back(); // popstate handler will clear selectedId; keep scroll restore on leave
    } else {
      skipScrollRestoreRef.current = true;
      setSelectedId(null);
    }
  }, []);

  /* ── Ambient color temperature ── */
  const imageAnalysis = useImageAnalysis(pipeline.transform(selectedFiber?.image, "glow"));
  const ambientBg = useMemo(() => {
    if (!selectedFiber || !imageAnalysis) return "#111111";
    return `hsl(${Math.round(imageAnalysis.hue)}, 39%, 13%)`;
  }, [selectedFiber, imageAnalysis]);

  useEffect(() => {
    document.documentElement.style.setProperty("--atlas-ambient-bg", ambientBg);
    return () => {
      document.documentElement.style.removeProperty("--atlas-ambient-bg");
    };
  }, [ambientBg]);

  /* ── #7 Dynamic theme-color meta tag ── */
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = ambientBg;
  }, [ambientBg]);

  /* Escape to close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxFiberId) {
          closeLightbox();
        } else if (screenPlateInfo) {
          closeScreenPlate();
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxFiberId, screenPlateInfo, closeLightbox, closeScreenPlate, handleClose]);

  /* ═══════════════════════════════════════════════════════════════════
     Navigation State Machine (#5)
     - Entering detail: pushState + save scroll position
     - Leaving detail: popstate or history.back() + restore scroll
     - Category changes: replaceState (lightweight, no history entry)
     ═══════════════════════════════════════════════════════════════════ */
  const pushedDetailRef = useRef(false);
  const popstateNavigating = useRef(false);
  /** While closing detail via in-app navigate(), URL may still be `/fiber/:id` for one frame; skip URL→selection sync so it does not reopen the profile. */
  const suppressUrlFiberReselectionRef = useRef(false);

  /* popstate listener — browser Back/Forward restores state from path + hash */
  useEffect(() => {
    const onPop = () => {
      popstateNavigating.current = true;
      const { fiberId, category } = parseUrlNavigationState(
        window.location.pathname,
        window.location.search,
        window.location.hash,
      );
      setSelectedId(fiberId);
      if (category) setActiveCategory(category);
      pushedDetailRef.current = false;
      /* Defer clearing the guard so the URL sync effect (which fires
         synchronously after setSelectedId) sees it and skips. */
      requestAnimationFrame(() => { popstateNavigating.current = false; });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Entering grid detail: focus header close when present; else the hero profile card (TopNav + hideHeader). */
  useEffect(() => {
    if (!selectedId || transitionRef.current) return;
    const sid = selectedId;
    const rid = requestAnimationFrame(() => {
      if (closeDetailButtonRef.current) {
        closeDetailButtonRef.current.focus();
      } else {
        document.querySelector<HTMLElement>(`[data-atlas-fiber-id="${CSS.escape(sid)}"]`)?.focus();
      }
    });
    return () => cancelAnimationFrame(rid);
  }, [selectedId]);

  /* After closing detail, return focus to the profile card that was open. */
  useEffect(() => {
    if (selectedId !== null) return;
    const fiberId = pendingFocusFiberIdRef.current;
    pendingFocusFiberIdRef.current = null;
    if (!fiberId) return;
    queueMicrotask(() => {
      const el = document.querySelector<HTMLElement>(`[data-atlas-fiber-id="${CSS.escape(fiberId)}"]`);
      el?.focus({ preventScroll: true });
    });
  }, [selectedId]);

  /* Path + hash + scroll tracking on selection/category changes */
  const prevHashSelRef = useRef<string | null>(null);
  useEffect(() => {
    /* Skip if this render was triggered by popstate — URL is already correct */
    if (popstateNavigating.current) {
      prevHashSelRef.current = selectedId;
      return;
    }

    const pathname = location.pathname;
    const pathQs = `${location.pathname}${location.search}`;

    const entering = prevHashSelRef.current === null && selectedId !== null;
    const leaving = prevHashSelRef.current !== null && selectedId === null;
    const switching =
      prevHashSelRef.current !== null
      && selectedId !== null
      && prevHashSelRef.current !== selectedId;

    if (entering) {
      saveScrollPosition();
      const target = buildFiberPath(selectedId, activeCategory);
      if (pathQs !== target) {
        navigateToFiberRoute(selectedId, false);
      }
      pushedDetailRef.current = true;
    } else if (leaving) {
      /* handleClose uses history.back when possible; otherwise search/category
         clears selection while still on /fiber/:id — navigate back to browse. */
      if (pushedDetailRef.current) {
        if (window.location.pathname.startsWith(FIBER_PATH_PREFIX)) {
          suppressUrlFiberReselectionRef.current = true;
          if (activeCategory === "all") {
            navigate("/", { replace: true });
          } else {
            navigate(
              {
                pathname: "/",
                search: `?cat=${encodeURIComponent(activeCategory)}`,
              },
              { replace: true },
            );
          }
        } else {
          writeBrowseHashState(pathname, null, activeCategory, false);
        }
        pushedDetailRef.current = false;
      }
      if (!skipScrollRestoreRef.current) {
        restoreScrollPosition();
      }
      skipScrollRestoreRef.current = false;
    } else if (switching) {
      navigateToFiberRoute(selectedId!, true);
    } else {
      if (selectedId && window.location.pathname.startsWith(FIBER_PATH_PREFIX)) {
        const next = buildFiberPath(selectedId, activeCategory);
        if (pathQs !== next) {
          /* TopNav fiber subtype (plant, bast, …): stay on browse grid, not /fiber/:id?cat=… */
          if (activeFiberSubcategory != null) {
            suppressUrlFiberReselectionRef.current = true;
            if (activeCategory === "all") {
              navigate("/", { replace: true });
            } else {
              navigate(
                { pathname: "/", search: `?cat=${encodeURIComponent(activeCategory)}` },
                { replace: true },
              );
            }
          } else {
            navigateToFiberRoute(selectedId, true);
          }
        }
      } else {
        writeBrowseHashState(pathname, selectedId, activeCategory, false);
      }
    }
    prevHashSelRef.current = selectedId;
  }, [
    selectedId,
    activeCategory,
    activeFiberSubcategory,
    location.pathname,
    location.search,
    navigate,
    buildFiberPath,
    navigateToFiberRoute,
  ]);

  /* ── URL ↔ selection (persistent atlas shell: survives / ↔ /fiber/:id) ── */
  const urlScrollSyncRef = useRef<{ loc: string; fiberId: string } | null>(null);
  useEffect(() => {
    const { fiberId, category } = parseUrlNavigationState(
      location.pathname,
      location.search,
      location.hash,
    );
    if (category) setActiveCategory(category);

    const locKey = `${location.pathname}${location.search}${location.hash}`;
    if (!fiberId || !dataSource.getFiberById(fiberId)) {
      urlScrollSyncRef.current = null;
      suppressUrlFiberReselectionRef.current = false;
      return;
    }

    if (suppressUrlFiberReselectionRef.current) {
      return;
    }

    setSelectedId((prev) => (prev === fiberId ? prev : fiberId));

    const prev = urlScrollSyncRef.current;
    if (prev?.fiberId === fiberId && prev?.loc === locKey) return;
    urlScrollSyncRef.current = { loc: locKey, fiberId };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = cellRefs.current.get(fiberId);
        if (!el) return;
        void smoothScrollToIfNeeded(el, 100).then(() => {
          if (selectedIdRef.current === fiberId) {
            saveScrollPosition();
          }
        });
      });
    });
  }, [location.pathname, location.search, location.hash, setActiveCategory]);

  return (
    <div
      className="min-h-dvh bg-[#111111] text-white"
      style={{
        backgroundColor: ambientBg,
        transition: "background-color 2s, margin-right 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        marginRight: adminMode ? "min(400px, 90vw)" : 0,
      }}
    >
      {/* Sentinel for collapsing header (omitted with TopNav — avoids scroll-linked re-renders) */}
      {!hideHeader && (
        <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-px" aria-hidden />
      )}

      {/* ── Shared SVG noise filter (one instance for all GlassCards) ── */}
      <svg className="absolute" width="0" height="0" aria-hidden>
        <filter id="glass-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      {/* Header — hidden when TopNav provides the chrome */}
      {!hideHeader && (
        <>
          <header
            className="atlas-header sticky top-0 z-50 backdrop-blur-2xl border-b border-white/[0.06]"
            style={{
              backgroundColor: `color-mix(in srgb, ${ambientBg} 80%, transparent)`,
              /* No padding-height transition: animating sticky header height while the user
                 scrolls fights the scroll gesture (layout shift + scroll anchoring ≈ “stuck” feel). */
              transition: "background-color 2s",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div
              className={`mx-auto px-4 sm:px-[3%] flex flex-wrap items-center gap-3 sm:gap-5 ${
                headerCompact ? "py-1.5" : "py-3 sm:py-4"
              }`}
            >
              {/* Title — tap to scroll to top */}
              <h1
                className="text-white tracking-[0.08em] uppercase whitespace-nowrap cursor-pointer"
                style={ATLAS_GRID_TITLE_STYLE}
                onClick={() => { if (selectedId) { handleClose(); } else { window.scrollTo({ top: 0, behavior: "smooth" }); } }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") { if (selectedId) { handleClose(); } else { window.scrollTo({ top: 0, behavior: "smooth" }); } } }}
              >
                Natural Fiber Atlas
              </h1>

              {/* Search */}
              <div className="relative flex-1 min-w-[120px] max-w-sm order-3 sm:order-none w-full sm:w-auto">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
                />
                <input
                  type="text"
                  aria-label="Search fibers"
                  placeholder="Search fibers..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedId(null);
                  }}
                  className={ATLAS_SEARCH_INPUT_CLASS}
                  style={ATLAS_GRID_SEARCH_STYLE}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className={ATLAS_SEARCH_CLEAR_BUTTON_CLASS}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Category filters */}
              <div className="atlas-category-pills flex gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setSelectedId(null);
                    }}
                    aria-label={`Filter by ${cat.label}`}
                    aria-pressed={activeCategory === cat.key}
                    className={`px-3 py-1 cursor-pointer ${ATLAS_PILL_BASE_CLASS} ${
                      activeCategory === cat.key
                        ? ATLAS_PILL_ACTIVE_CLASS
                        : ATLAS_PILL_IDLE_CLASS
                    }`}
                    style={ATLAS_GRID_CATEGORY_PILL_STYLE}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Close — always rendered to avoid header flex reflow;
                  opacity + pointer-events toggle visibility */}
              <button
                ref={closeDetailButtonRef}
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color,opacity] duration-200 cursor-pointer ml-auto"
                style={{
                  ...ATLAS_GRID_CLOSE_STYLE,
                  opacity: selectedId ? 1 : 0,
                  pointerEvents: selectedId ? "auto" : "none",
                }}
                tabIndex={selectedId ? 0 : -1}
                aria-hidden={!selectedId}
                aria-label={selectedId ? "Close profile detail" : undefined}
              >
                <X size={12} />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </header>

          {/* Subheader — fixed height reserved to prevent layout shift.
               Content fades via opacity; height never changes. */}
          <div
            className="mx-auto px-4 sm:px-[3%] flex items-center justify-between"
            style={{
              height: 40,
              opacity: headerCompact && !selectedId ? 0 : 1,
              transition: "opacity 0.25s ease",
              pointerEvents: headerCompact && !selectedId ? "none" : "auto",
            }}
          >
            <span
              className="text-white/25 tracking-[0.18em] uppercase"
              style={ATLAS_GRID_SUBHEAD_STYLE}
            >
              {selectedFiber
                ? `${selectedFiber.name} — Detail View`
                : `${filtered.length} Profiles`}
            </span>
            {!selectedFiber && (
              <span
                className="hidden md:inline text-white/20 tracking-[0.12em] uppercase"
                style={ATLAS_GRID_SUBHEAD_MUTED_STYLE}
              >
                {search
                  ? `Showing ${filtered.length} result${filtered.length === 1 ? "" : "s"} for "${search}"`
                  : `Category: ${activeCategory}`}
              </span>
            )}
            {selectedFiber && (
              <span
                className="text-[#5D9A6D]/40 tracking-[0.15em] uppercase hidden sm:inline"
                style={ATLAS_GRID_HINT_STYLE}
              >
                ESC or click card to close
              </span>
            )}
            {!selectedFiber && (
              <Link
                to="/about"
                onMouseEnter={() => {
                  void preloadAboutRoute();
                }}
                onFocus={() => {
                  void preloadAboutRoute();
                }}
                onTouchStart={() => {
                  void preloadAboutRoute();
                }}
                className="text-white/20 hover:text-white/40 tracking-[0.12em] uppercase transition-colors"
                style={ATLAS_GRID_LINK_STYLE}
              >
                About
              </Link>
            )}
          </div>
        </>
      )}

      {/* Grid */}
      <main className="mx-auto px-4 sm:px-[3%] py-4 pb-16" style={{ paddingBottom: "max(4rem, env(safe-area-inset-bottom, 0px))" }}>
        <div
          className={`atlas-grid grid ${isMobile ? 'gap-3.5' : 'gap-2.5 sm:gap-3'}`}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            ["--grid-gap" as any]: isMobile ? "0.875rem" : gridGap,
          }}
          ref={gridRef}
        >
          {gridCellIndices.map((index) => {
              const fiber = filtered[index];
              const isVirtual = fiber === undefined;
              const isSelected = fiber?.id === selectedId;
              const plateType = plateAssignments.get(index);
              const gridImageLoad = getGridProfileImageLoadingFlags(index, cols);
              const profileDelay = isDetailMode
                ? (profileInhaleDelays.get(index) ?? 0)
                : (exhaleProfileDelaysRef.current.get(index) ?? 0);
              const detailDelay = detailInhaleDelays.get(index) ?? 0;
              const showDetail = isDetailMode && !isSelected && plateType && selectedFiberDetail;
              const profileOpacity = (isDetailMode && !isSelected) ? 0 : 1;

              const isMounted = isVirtual
                ? true
                : (visibleIds === null || visibleIds.has(fiber.id));
              const profileFull = fiber ? dataSource.getFiberById(fiber.id) : undefined;
              const mergedGallery = profileFull
                ? mergeFiberGalleryWithFallback(fiber.id, profileFull)
                : [];
              const mergedGalleryUrls = mergedGallery.map((entry) => entry.url);

              const colIndex = index % cols;
              const colOffset = gridColumnStaggerPx(colIndex, cols, prefersReducedMotion);

              const getCellEl = () => indexRefs.current.get(index) ?? (fiber ? cellRefs.current.get(fiber.id) : null);

              return (
                <div
                  key={isVirtual ? `virtual-${index}` : fiber.id}
                  className="relative grid-cell aspect-[3/4]"
                  style={{
                    containerType: "inline-size",
                    ["--col" as any]: colIndex,
                    ["--stagger-index" as any]: Math.min(index, 12),
                    ["--col-offset" as any]: `${colOffset}px`,
                    transform: "perspective(600px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateY(var(--col-offset, 0px))",
                  }}
                  ref={(el) => {
                    if (el) {
                      indexRefs.current.set(index, el);
                      if (fiber) {
                        cellRefs.current.set(fiber.id, el);
                        observerRef.current?.observe(el);
                        tiltRefs.current.set(fiber.id, el);
                        observeCell(el, fiber.id);
                      }
                    } else {
                      indexRefs.current.delete(index);
                      if (fiber) cellRefs.current.delete(fiber.id);
                    }
                  }}
                >
                  {isVirtual ? (
                    /* Virtual cell: detail only when assigned */
                    showDetail && (
                      <AnimatePresence>
                        <motion.div
                          key={`detail-${selectedId}-${plateType}`}
                          className={`absolute inset-0 z-10 detail-card-slot${detailSlotClassSuffix}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{
                            opacity: 0,
                            transition: {
                              duration: DETAIL_FADE,
                              delay: exhaleDetailDelaysRef.current.get(index) ?? 0,
                              ease: EXHALE_EASE,
                            },
                          }}
                          transition={{ duration: 0, delay: detailDelay }}
                        >
                          <Suspense fallback={<div className="h-full w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a]" aria-hidden />}>
                            <LazyDetailCard
                              fiber={selectedFiberDetail!}
                              plateType={plateType!}
                              contentDelay={detailDelay}
                              onSelectFiber={handleSelectFiber}
                              onOpenLightbox={(imgIndex?: number, sourceRect?: DOMRect) => {
                                openLightbox(
                                  selectedFiberDetail!.id,
                                  imgIndex ?? 0,
                                  sourceRect ?? getCellEl()?.getBoundingClientRect() ?? null,
                                );
                              }}
                              onOpenScreenPlate={(pt: PlateType) => {
                                const el = getCellEl();
                                if (el) {
                                  openScreenPlate({
                                    plateType: pt,
                                    sourceRect: el.getBoundingClientRect(),
                                    cellIndex: index,
                                  });
                                }
                              }}
                              galleryImages={gallerySlotImages.get(index)}
                              galleryStartIndex={gallerySlotStartIndex.get(index) ?? 0}
                              galleryIndex={index}
                            />
                          </Suspense>
                        </motion.div>
                      </AnimatePresence>
                    )
                  ) : !isMounted ? (
                    <GridSkeleton />
                  ) : (
                    <>
                      <div
                        className={`absolute inset-0 profile-layer${
                          profileOpacity === 0 ? ' is-receding' : ''
                        }${isSelected ? ' is-hero' : ''}`}
                        style={{ ['--stagger' as any]: `${isSelected ? 0 : profileDelay}s` }}
                      >
                        <ProfileCard
                          id={fiber.id}
                          name={fiber.name}
                          image={fiber.image}
                          galleryImages={mergedGalleryUrls}
                          galleryPreviewEntries={mergedGallery}
                          crossfadePaused={isDetailMode && !isSelected}
                          category={fiber.category}
                          isSelected={isSelected}
                          onClick={() => handleCardClick(fiber.id)}
                          profilePills={fiber.profilePills}
                          priority={gridImageLoad.eagerLoading}
                          fetchPriorityHigh={gridImageLoad.fetchPriorityHigh}
                        />
                      </div>

                      <AnimatePresence>
                        {showDetail && (
                          <motion.div
                            key={`detail-${selectedId}-${plateType}`}
                            className={`absolute inset-0 z-10 detail-card-slot${detailSlotClassSuffix}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{
                              opacity: 0,
                              transition: {
                                duration: DETAIL_FADE,
                                delay: exhaleDetailDelaysRef.current.get(index) ?? 0,
                                ease: EXHALE_EASE,
                              },
                            }}
                            transition={{ duration: 0, delay: detailDelay }}
                          >
                            <Suspense fallback={<div className="h-full w-full rounded-xl border border-white/[0.08] bg-[#0a0a0a]" aria-hidden />}>
                              <LazyDetailCard
                                fiber={selectedFiberDetail!}
                                plateType={plateType!}
                                contentDelay={detailDelay}
                                onSelectFiber={handleSelectFiber}
                                onOpenLightbox={(imgIndex?: number, sourceRect?: DOMRect) => {
                                  openLightbox(
                                    selectedFiberDetail!.id,
                                    imgIndex ?? 0,
                                    sourceRect ?? getCellEl()?.getBoundingClientRect() ?? null,
                                  );
                                }}
                                onOpenScreenPlate={(pt: PlateType) => {
                                  const el = getCellEl();
                                  if (el) {
                                    openScreenPlate({
                                      plateType: pt,
                                      sourceRect: el.getBoundingClientRect(),
                                      cellIndex: index,
                                    });
                                  }
                                }}
                                galleryImages={gallerySlotImages.get(index)}
                                galleryStartIndex={gallerySlotStartIndex.get(index) ?? 0}
                                galleryIndex={index}
                              />
                            </Suspense>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              );
            })}
        </div>

        {filtered.length === 0 && (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center space-y-3">
              <p className="text-white/40 uppercase tracking-[0.14em]" style={ATLAS_GRID_EMPTY_TITLE_STYLE}>
                No fibers match this view
              </p>
              <p className="text-white/25" style={ATLAS_GRID_EMPTY_BODY_STYLE}>
                Try a broader keyword or clear active filters.
              </p>
              {(search || activeCategory !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("all");
                  }}
                  className={`mx-auto px-3 py-1 uppercase tracking-[0.12em] ${ATLAS_PILL_BASE_CLASS} ${ATLAS_PILL_ACTIVE_CLASS}`}
                  style={ATLAS_GRID_EMPTY_CTA_STYLE}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxFiberId && (() => {
          const lbFiber = fiberIndex.find((f) => f.id === lightboxFiberId);
          /* Read gallery from dataSource so admin overrides are reflected */
          const lbFiberFull = dataSource.getFiberById(lightboxFiberId);
          const gallery = mergeFiberGalleryWithFallback(
            lightboxFiberId,
            lbFiberFull ?? { galleryImages: [] },
          );
          if (!lbFiber || gallery.length === 0) return null;
          return (
            <Suspense fallback={<div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 text-white/60 tracking-[0.14em] uppercase" style={ATLAS_GRID_LOADING_STYLE}>Loading gallery</div>}>
              <LazyLightbox
                key="lightbox"
                images={gallery}
                fiberName={lbFiber.name}
                onClose={closeLightbox}
                initialIndex={lightboxInitialIndex}
                sourceRect={lightboxSourceRect}
              />
            </Suspense>
          );
        })()}
      </AnimatePresence>

      {/* ScreenPlate — fullscreen "double-inhale" detail view (desktop + mobile) */}
      <AnimatePresence>
        {screenPlateInfo && selectedFiberDetail && (() => {
          const fromMobileDetail = screenPlateInfo.fromMobileDetail === true;
          const plates = fromMobileDetail && mobileScreenPlateEntries
            ? mobileScreenPlateEntries
            : screenPlateEntries;
          const plateGetCellRect = fromMobileDetail && screenPlateInfo
            ? (_cellIndex: number) => screenPlateInfo.sourceRect
            : getCellRect;
          return plates.length > 0 ? (
          <Suspense fallback={<div className="fixed inset-0 z-[89] grid place-items-center bg-black/70 text-white/60 tracking-[0.14em] uppercase" style={ATLAS_GRID_LOADING_STYLE}>Loading detail view</div>}>
            {(() => {
              const screenFiber = dataSource.getFiberById(selectedFiberDetail.id);
              const screenGallery = mergeFiberGalleryWithFallback(
                selectedFiberDetail.id,
                screenFiber ?? selectedFiberDetail,
              );
              return (
            <LazyScreenPlate
              key="screen-plate"
              fiber={selectedFiberDetail}
              initialPlateType={screenPlateInfo.plateType}
              initialCellIndex={screenPlateInfo.cellIndex}
              plates={plates}
              sourceRect={screenPlateInfo.sourceRect}
              getCellRect={plateGetCellRect}
              galleryImages={screenGallery}
              gallerySlotImages={
                fromMobileDetail && mobileContactGalleryMaps
                  ? mobileContactGalleryMaps.images
                  : gallerySlotImages
              }
              gallerySlotStartIndex={
                fromMobileDetail && mobileContactGalleryMaps
                  ? mobileContactGalleryMaps.starts
                  : gallerySlotStartIndex
              }
              onOpenLightbox={(imgIndex, sourceRect) => {
                openLightbox(selectedFiberDetail.id, imgIndex ?? 0, sourceRect ?? null);
              }}
              onClose={closeScreenPlate}
              onSelectFiber={(id) => {
                closeScreenPlate();
                handleSelectFiber(id);
              }}
            />
              );
            })()}
          </Suspense>
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}