/* @refresh reset */
import { useAtlasData } from "../context/atlas-data-context";
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, useDeferredValue } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  getGalleryImages,
  prefetchGalleryImagesForFibers,
  type PlateType,
} from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { ProfileCard } from "./profile-card";
import { useImageAnalysis } from "../hooks/use-image-brightness";
import { useFiberDetail, prefetchFiberDetails } from "../hooks/use-fiber-detail";
import { useMagneticTilt } from "../hooks/use-magnetic-tilt";
import { useColumnCount } from "../hooks/use-column-count";
import { useVirtualGrid } from "../hooks/use-virtual-grid";
import { useDetailLifecycle } from "../hooks/use-detail-lifecycle";
import { useLightboxState } from "../hooks/use-lightbox-state";
import { useScreenPlateState } from "../hooks/use-screen-plate-state";
import { getWarmupPolicy, warmUpImageAnalysis } from "../utils/image-warmup";
import { parseHash, writeHash, saveScrollPosition, restoreScrollPosition } from "../utils/hash-routing";
import { smoothScrollTo } from "../utils/smooth-scroll";
import {
  computePlateLayout,
  DETAIL_FADE, EXHALE_EASE,
  type CellVisibility,
} from "../utils/plate-layout";
import { getAvailablePlates } from "./mobile-detail-view";
import { Search, X } from "lucide-react";
import { useImagePipeline } from "../context/image-pipeline";
import { GridSkeleton } from "./grid-skeleton";
import { Link } from "react-router";
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

const LazyMobileDetailView = lazy(async () => {
  const mod = await import("./mobile-detail-view");
  return { default: mod.MobileDetailView };
});

function preloadMobileDetailModule(): void {
  void import("./mobile-detail-view");
}

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

function emitDebugProbe(hypothesisId: string, location: string, message: string, data: Record<string, unknown>): void {
  const shouldEmit =
    import.meta.env.DEV &&
    import.meta.env.MODE !== "test";
  if (!shouldEmit) return;
  fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a8300e",
    },
    body: JSON.stringify({
      sessionId: "a8300e",
      runId: "search-detail-cards-debug",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

interface GridViewProps {
  hideHeader?: boolean;
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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
  const { detailRevealed, detailPrimed, backdropActive, detailSettled } = useDetailLifecycle(selectedId);

  useEffect(() => {
    if (!selectedId) return;
    preloadOverlayModules();
  }, [selectedId]);

  const { cols, gridGap } = useColumnCount();
  const isMobile = cols <= 2;
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const indexRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pipeline = useImagePipeline();

  /* ── Part 2: Virtualized grid — skeleton placeholders for off-screen cells ──
     Disabled in detail mode so plate layout can assign to arbitrary cells. */
  const isDetailMode = selectedId !== null;
  const { visibleIds, observeCell } = useVirtualGrid(isDetailMode);

  /* ── Collapsing header ──
     Track whether the user has scrolled past the initial viewport.
     Uses a sentinel element at the top of the page. When the sentinel
     leaves the viewport, the header compacts (smaller padding, subheader
     hides). Disabled during detail mode where the subheader shows the
     selected fiber name. */
  const [headerCompact, setHeaderCompact] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderCompact(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [setActiveCategory]);

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
      if (isMobile) preloadMobileDetailModule();
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
  const selectedIndexDriftRef = useRef<{ id: string | null; index: number }>({ id: null, index: -1 });
  const gridRef = useRef<HTMLDivElement>(null);
  const tiltRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  useEffect(() => {
    onVisibleProfilesChange?.(filtered.length);
  }, [filtered.length, onVisibleProfilesChange]);

  const selectedFiber = useMemo(
    () => fiberIndex.find((f) => f.id === selectedId) ?? null,
    [selectedId, fiberIndex],
  );

  useEffect(() => {
    if (!selectedId) {
      setMobileDetailOpen(false);
    }
  }, [selectedId]);

  /* ── Magnetic tilt (#4) — extracted into useMagneticTilt hook ── */
  useMagneticTilt(gridRef, tiltRefs, selectedIdRef, [filtered, cols, selectedId]);

  /* ── Plate assignment + stagger computation ──
     Delegates to the pure computePlateLayout() function.
     Cell visibility is snapshotted from the DOM at computation time. */
  const { plateAssignments, profileInhaleDelays, detailInhaleDelays, profileExhaleDelays, detailExhaleDelays, gallerySlotImages, plateExitOffsets } = useMemo(() => {
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
    /* Pass gallery images from the reactive data source so admin edits
       to galleryImages are reflected in the contact sheet plate. */
    const selectedFiber = selectedId ? dataSource.getFiberById(selectedId) : undefined;
    const gallery = selectedFiber?.galleryImages;
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
    const gallery = screenFiber?.galleryImages?.length
      ? screenFiber.galleryImages
      : getGalleryImages(selectedFiberDetail.id);
    const entries = avail.map((pt) => ({ plateType: pt, cellIndex: 0 }));
    if (gallery.length > 0) {
      entries.push({ plateType: "contactSheet" as PlateType, cellIndex: 0 });
    }
    return entries;
  }, [selectedFiberDetail, isMobile]);

  /* ── Exhale delay snapshots ──
     When selectedId goes null, delay maps recompute to empty.
     Snapshot the last active delays so exhale animations can use them. */
  const exhaleProfileDelaysRef = useRef<Map<number, number>>(new Map());
  const exhaleDetailDelaysRef = useRef<Map<number, number>>(new Map());
  const exhaleExitOffsetsRef = useRef<Map<number, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (selectedId && profileExhaleDelays.size > 0) {
      exhaleProfileDelaysRef.current = new Map(profileExhaleDelays);
      exhaleDetailDelaysRef.current = new Map(detailExhaleDelays);
      exhaleExitOffsetsRef.current = new Map(plateExitOffsets);
    }
  }, [selectedId, profileExhaleDelays, detailExhaleDelays, plateAssignments, plateExitOffsets]);

  /* Keep selectedIdRef in sync */
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  /* ── Crossfade completion ── */
  useEffect(() => {
    if (selectedId === null && transitionRef.current) {
      const nextId = transitionRef.current;
      transitionRef.current = null;
      const timer = setTimeout(() => setSelectedId(nextId), 260);
      return () => clearTimeout(timer);
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
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("cell-visible");
            observerRef.current?.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "60px 0px 60px 0px", threshold: 0.05 },
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
  }, [fiberIndex, setActiveCategory]);

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
      setSelectedId((prev) => (prev === fiberId ? null : fiberId));
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
    const colOffset = 0;
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
  }, [cols, deferredSearch, filtered, selectedId]);

  const handleSelectFiber = useCallback((id: string) => {
    if (selectedIdRef.current && selectedIdRef.current !== id) {
      transitionRef.current = id;
      setSelectedId(null);
    } else {
      setSelectedId(id);
    }
  }, []);

  const handleClose = useCallback(() => {
    setMobileDetailOpen(false);
    if (pushedDetailRef.current) {
      history.back(); // popstate handler will clear selectedId
    } else {
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

  /* popstate listener — browser Back/Forward restores state from URL hash */
  useEffect(() => {
    const onPop = () => {
      popstateNavigating.current = true;
      const { fiberId, category } = parseHash();
      setSelectedId(fiberId);
      if (category) setActiveCategory(category);
      pushedDetailRef.current = false;
      /* Defer clearing the guard so the writeHash effect (which fires
         synchronously after setSelectedId) sees it and skips. */
      requestAnimationFrame(() => { popstateNavigating.current = false; });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Hash + scroll tracking on selection/category changes */
  const prevHashSelRef = useRef<string | null>(null);
  useEffect(() => {
    /* Skip if this render was triggered by popstate — URL is already correct */
    if (popstateNavigating.current) {
      prevHashSelRef.current = selectedId;
      return;
    }

    const entering = prevHashSelRef.current === null && selectedId !== null;
    const leaving = prevHashSelRef.current !== null && selectedId === null;

    if (entering) {
      saveScrollPosition();
      writeHash(selectedId, activeCategory, true);  // pushState
      pushedDetailRef.current = true;
    } else if (leaving) {
      /* If we're leaving via handleClose → history.back(), the URL is already
         updated by the browser before popstate fires. If leaving by some other
         path (search/category change while in detail), replaceState. */
      if (pushedDetailRef.current) {
        writeHash(selectedId, activeCategory, false);
        pushedDetailRef.current = false;
      }
      restoreScrollPosition();
    } else {
      writeHash(selectedId, activeCategory, false);  // replaceState
    }
    prevHashSelRef.current = selectedId;
  }, [selectedId, activeCategory]);

  /* ── Parse hash on load ── */
  const initialHashHandled = useRef(false);
  useEffect(() => {
    if (initialHashHandled.current) return;
    initialHashHandled.current = true;

    const { fiberId, category } = parseHash();
    if (category) setActiveCategory(category);
    if (fiberId) {
      const fiber = fiberIndex.find((f) => f.id === fiberId);
      if (fiber) {
        requestAnimationFrame(() => {
          setSelectedId(fiberId);
          requestAnimationFrame(() => {
            const el = cellRefs.current.get(fiberId);
            if (el) smoothScrollTo(el, 100);
          });
        });
      }
    }
  }, []);

  return (
    <div
      className="min-h-screen bg-[#111111] text-white"
      style={{
        backgroundColor: ambientBg,
        transition: "background-color 2s, margin-right 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        marginRight: adminMode ? "min(400px, 90vw)" : 0,
      }}
    >
      {/* Sentinel for collapsing header */}
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-px" aria-hidden />

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
              transition: "background-color 2s, padding 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div
              className={`mx-auto px-4 sm:px-[3%] flex flex-wrap items-center gap-3 sm:gap-5 ${
                headerCompact ? "py-1.5" : "py-3 sm:py-4"
              }`}
              style={{ transition: "padding 0.35s cubic-bezier(0.25, 1, 0.5, 1)" }}
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
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color,opacity] duration-200 cursor-pointer ml-auto"
                style={{
                  ...ATLAS_GRID_CLOSE_STYLE,
                  opacity: selectedId ? 1 : 0,
                  pointerEvents: selectedId ? "auto" : "none",
                }}
                tabIndex={selectedId ? 0 : -1}
                aria-hidden={!selectedId}
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
                className="text-[#4ADE80]/40 tracking-[0.15em] uppercase hidden sm:inline"
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
          {(() => {
            const maxAssignedIndex = plateAssignments.size > 0
              ? Math.max(...plateAssignments.keys())
              : -1;
            const renderCellCount = isDetailMode && maxAssignedIndex >= 0
              ? Math.max(filtered.length, maxAssignedIndex + 1)
              : filtered.length;
            const indices = Array.from({ length: renderCellCount }, (_, i) => i);

            return indices.map((index) => {
              const fiber = filtered[index];
              const isVirtual = fiber === undefined;
              const isSelected = fiber?.id === selectedId;
              const plateType = plateAssignments.get(index);
              const profileDelay = isDetailMode
                ? (profileInhaleDelays.get(index) ?? 0)
                : (exhaleProfileDelaysRef.current.get(index) ?? 0);
              const detailDelay = detailInhaleDelays.get(index) ?? 0;
              const showDetail = isDetailMode && !isSelected && plateType && selectedFiberDetail;
              const profileOpacity = (isDetailMode && !isSelected) ? 0 : 1;

              const isMounted = isVirtual
                ? true
                : (visibleIds === null || visibleIds.has(fiber.id));
              const profileGalleryUrls = fiber
                ? (dataSource.getFiberById(fiber.id)?.galleryImages?.map((entry) => entry.url) ?? [])
                : [];
              const fallbackGalleryUrls = fiber ? getGalleryImages(fiber.id).map((entry) => entry.url) : [];
              const mergedGalleryUrls = [...profileGalleryUrls, ...fallbackGalleryUrls];

              const colIndex = index % cols;
              const colOffset = 0;

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
                          className={`absolute inset-0 z-10 detail-card-slot${
                            !detailRevealed ? ' render-before-reveal' : ''
                          }${detailPrimed && !detailSettled ? ' detail-primed' : ''}${
                            detailSettled ? ' detail-settled' : ''
                          }${!backdropActive ? ' backdrop-deferred' : ''}`}
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
                          <Suspense fallback={<div className="h-full w-full rounded-xl border border-white/[0.08] bg-white/[0.02]" aria-hidden />}>
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
                          crossfadePaused={isDetailMode && !isSelected}
                          category={fiber.category}
                          isSelected={isSelected}
                          onClick={() => handleCardClick(fiber.id)}
                          profilePills={fiber.profilePills}
                          priority={index < Math.max(8, cols * 2)}
                        />
                      </div>

                      <AnimatePresence>
                        {showDetail && (
                          <motion.div
                            key={`detail-${selectedId}-${plateType}`}
                            className={`absolute inset-0 z-10 detail-card-slot${
                              !detailRevealed ? ' render-before-reveal' : ''
                            }${detailPrimed && !detailSettled ? ' detail-primed' : ''}${
                              detailSettled ? ' detail-settled' : ''
                            }${!backdropActive ? ' backdrop-deferred' : ''}`}
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
                            <Suspense fallback={<div className="h-full w-full rounded-xl border border-white/[0.08] bg-white/[0.02]" aria-hidden />}>
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
            });
          })()}
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
          const gallery = lbFiberFull?.galleryImages?.length
            ? lbFiberFull.galleryImages
            : getGalleryImages(lightboxFiberId);
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
              const screenGallery = screenFiber?.galleryImages?.length
                ? screenFiber.galleryImages
                : getGalleryImages(selectedFiberDetail.id);
              return (
            <LazyScreenPlate
              key="screen-plate"
              fiber={selectedFiberDetail}
              initialPlateType={screenPlateInfo.plateType}
              plates={plates}
              sourceRect={screenPlateInfo.sourceRect}
              getCellRect={plateGetCellRect}
              galleryImages={screenGallery}
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

      <AnimatePresence>
        {isMobile && mobileDetailOpen && selectedFiberDetail && (
          <Suspense fallback={<div className="fixed inset-0 z-[62] grid place-items-center bg-black/70 text-white/60 tracking-[0.14em] uppercase" style={ATLAS_GRID_LOADING_STYLE}>Loading mobile detail</div>}>
            <LazyMobileDetailView
              fiber={selectedFiberDetail}
              onClose={() => setMobileDetailOpen(false)}
              onSelectFiber={(id) => {
                setMobileDetailOpen(false);
                handleSelectFiber(id);
              }}
              onOpenLightbox={(imgIndex, sourceRect) => {
                openLightbox(selectedFiberDetail.id, imgIndex ?? 0, sourceRect ?? null);
              }}
              onOpenScreenPlate={(plateType, sourceRect) => {
                openScreenPlate({ plateType, sourceRect, cellIndex: 0, fromMobileDetail: true });
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}