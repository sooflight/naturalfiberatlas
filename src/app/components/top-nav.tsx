import { ChevronDown, ChevronRight, ChevronUp, FileText, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";
import { atlasNavigation, findNode, findNodePath, type NavNode } from "../data/atlas-navigation";
import { mapNavToGridFilters } from "../data/map-nav-to-grid-filters";
import {
  ATLAS_GRID_SEARCH_STYLE,
  ATLAS_GRID_SUBHEAD_MUTED_STYLE,
  ATLAS_GRID_TITLE_STYLE,
  ATLAS_INACTIVE_LABEL_COLOR,
  ATLAS_NAV_THUMB_LABEL_FONT_SIZE,
  ATLAS_SEARCH_CLEAR_BUTTON_CLASS,
  ATLAS_SEARCH_ICON_CLASS,
  ATLAS_SEARCH_INPUT_CLASS,
  ATLAS_SEARCH_WRAPPER_CLASS,
  decodeCloudinaryFetchSourceUrl,
  getThumbUrl,
  NAV_FONT_STYLE,
  NAV_FONT_STYLE_MOBILE,
} from "./atlas-shared";
import { AtlasScrollPortContext } from "../context/atlas-scroll-port-context";
import { NavFilterProvider, useNavFilter } from "../context/nav-filter-context";
import { useNfaMarkScrollRotation } from "../hooks/use-nfa-mark-scroll-rotation";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";
import { useImagePipeline } from "../context/image-pipeline";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { NfaMark } from "./nfa-mark";
import { useIsMobile } from "./ui/use-mobile";

function usePageFadeCSS() {
  useEffect(() => {
    const id = "atlas-page-fade";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes atlasFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .atlas-page-fade { animation: atlasFadeIn 0.4s ease-out both; }
    `;
    document.head.appendChild(s);
  }, []);
}

function useAnimatedBorderCSS() {
  useEffect(() => {
    const styleId = "atlas-spin-border";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes atlas-border-spin { 0% { --atlas-border-angle: 0deg; } 100% { --atlas-border-angle: 360deg; } }
      @property --atlas-border-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
      .atlas-active-border {
        padding: 1px;
        background: conic-gradient(from var(--atlas-border-angle),
          rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.15) 25%,
          rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.3) 62%, rgba(255,255,255,0.08) 75%,
          rgba(255,255,255,0.15) 100%);
        animation: atlas-border-spin 6s linear infinite;
      }
      .atlas-idle-border {
        padding: 1px;
        background: rgba(255,255,255,0.06);
        transition: background 0.15s ease;
      }
      .group:hover .atlas-idle-border {
        background: conic-gradient(from var(--atlas-border-angle),
          rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.8) 12%, rgba(255,255,255,0.15) 25%,
          rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.3) 62%, rgba(255,255,255,0.08) 75%,
          rgba(255,255,255,0.15) 100%);
        animation: atlas-border-spin 6s linear infinite;
      }
      .atlas-border-inner { overflow: hidden; background: #0a0a0a; }
      .group:hover .atlas-frame-label { color: #f5f5f5 !important; }
    `;
    document.head.appendChild(style);
  }, []);
}

function FadeImg({ className, style, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  const pipeline = useImagePipeline();
  const originalSrc = typeof props.src === "string" ? props.src : undefined;
  const transformedSrc = pipeline.transform(originalSrc, "filmstrip") ?? originalSrc;
  const fallbackSrc = (() => {
    const fromTransformed = transformedSrc ? decodeCloudinaryFetchSourceUrl(transformedSrc) : null;
    if (fromTransformed && fromTransformed !== transformedSrc) return fromTransformed;
    const fromOriginal = originalSrc ? decodeCloudinaryFetchSourceUrl(originalSrc) : null;
    if (fromOriginal && fromOriginal !== transformedSrc) return fromOriginal;
    if (originalSrc && originalSrc !== transformedSrc) return originalSrc;
    return undefined;
  })();
  return (
    <ImageWithFallback
      {...props}
      src={transformedSrc}
      fallbackSrc={fallbackSrc}
      className={className}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease-in-out" }}
      onLoad={() => setLoaded(true)}
    />
  );
}

const STRIP_THUMB_GAP = 8;
const CHILDREN_STRIP_HEIGHT = 88;
const TRANSITION_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const TRANSITION_MS = 350;
const PORTAL_FULL = { width: 72, borderRadius: 8, imgRadius: 7 };
/** Min border-box height for the primary nav row on mobile so portal strip and breadcrumb share the same row size (no CLS). */
const MOBILE_PRIMARY_NAV_STRIP_MIN_HEIGHT = Math.ceil(
  16 + // row padding top + bottom
  2 + // atlas-active-border vertical padding around thumb
  ((PORTAL_FULL.width - 2) * 3) / 4 + // 4:3 thumb at inner width (full portal mode)
  4 + // mt-1 above label
  16, // single-line label
);
const PORTAL_PATH = { width: 52, borderRadius: 6, imgRadius: 5 };
const PATH_SEG = { width: 52, borderRadius: 6, imgRadius: 5 };
const STRIP_THUMB = { width: 72, borderRadius: 8, imgRadius: 7 };
const ATLAS_AMBIENT_BG = "var(--atlas-ambient-bg, #111111)";
const ATLAS_AMBIENT_TRANSITION = "background-color 2s ease";
/**
 * Chrome tiers (top → bottom):
 * 1) Wordmark + search — frosted bar over the grid.
 * 2) Category strip (“L1”): root portals (Plant / Animal / …) or breadcrumb path — still present when category nav is shown.
 * 3) Subcategory drawer: one or two `ChildrenStrip` rows over a single full-height frosted layer (same paint as (2)).
 */
const ATLAS_CHROME_GLASS_RGBA = "rgba(17, 17, 17, 0.4)";

function atlasChromeGlassRowStyle(
  prefersReducedMotion: boolean,
  options?: { omitTopInset?: boolean },
): CSSProperties {
  if (prefersReducedMotion) {
    return { backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION };
  }
  const omitTopInset = options?.omitTopInset ?? false;
  return {
    backgroundColor: ATLAS_CHROME_GLASS_RGBA,
    backdropFilter: "blur(12px) saturate(1.35)",
    WebkitBackdropFilter: "blur(12px) saturate(1.35)",
    ...(omitTopInset ? {} : { boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.07)" }),
    transition: ATLAS_AMBIENT_TRANSITION,
  };
}

function useDebouncedHover(onSelect: (id: string) => void, delay = 150) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFiredIdRef = useRef<string | null>(null);
  const lastFiredTimeRef = useRef<number>(0);
  const lastLeaveTimeRef = useRef<number>(0);
  const currentHoveredRef = useRef<string | null>(null);
  const MIN_COOLDOWN_MS = 110;
  const FLICKER_GUARD_MS = 140;

  const handleEnter = useCallback((id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    currentHoveredRef.current = id;
    if (id === lastFiredIdRef.current) return;
    const now = Date.now();
    const timeSinceLeave = now - lastLeaveTimeRef.current;
    const timeSinceFire = now - lastFiredTimeRef.current;
    let effectiveDelay = delay;
    if (timeSinceLeave < FLICKER_GUARD_MS) effectiveDelay = Math.max(effectiveDelay, FLICKER_GUARD_MS);
    if (timeSinceFire < MIN_COOLDOWN_MS) effectiveDelay = Math.max(effectiveDelay, MIN_COOLDOWN_MS - timeSinceFire);
    timerRef.current = setTimeout(() => {
      if (currentHoveredRef.current === id) {
        lastFiredIdRef.current = id;
        lastFiredTimeRef.current = Date.now();
        onSelect(id);
      }
    }, effectiveDelay);
  }, [delay, onSelect]);

  const handleLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    lastLeaveTimeRef.current = Date.now();
    currentHoveredRef.current = null;
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { handleEnter, handleLeave };
}

function PortalThumb({
  nodeId,
  mode,
  isActiveSegment,
  isHovered,
  isMobile,
  onClick,
  onMouseEnter,
}: {
  nodeId: string;
  mode: "full" | "path";
  isActiveSegment: boolean;
  isHovered: boolean;
  isMobile: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  useAnimatedBorderCSS();
  const node = findNode(atlasNavigation, nodeId);
  const cfg = mode === "full" ? PORTAL_FULL : PORTAL_PATH;
  const fontStyle = isMobile ? NAV_FONT_STYLE_MOBILE : NAV_FONT_STYLE;
  const borderClass = isActiveSegment || isHovered ? "atlas-active-border" : "atlas-idle-border";
  const thumbUrl = getThumbUrl(nodeId);
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="group flex flex-col items-center shrink-0 cursor-pointer"
      style={{ width: cfg.width, transition: `width ${TRANSITION_MS}ms ${TRANSITION_EASE}`, contain: "layout style" }}
    >
      <div className={`w-full ${borderClass}`} style={{ borderRadius: cfg.borderRadius }}>
        <div className="atlas-border-inner w-full" style={{ borderRadius: cfg.imgRadius }}>
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3", borderRadius: cfg.imgRadius }}>
            {thumbUrl ? (
              <FadeImg src={thumbUrl} alt={node?.label || nodeId} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900"><FileText size={14} className="text-white/30" /></div>
            )}
          </div>
        </div>
      </div>
      <span className="atlas-frame-label w-full text-center truncate leading-tight mt-1" style={{ color: isActiveSegment || isHovered ? "#f5f5f5" : ATLAS_INACTIVE_LABEL_COLOR, ...fontStyle, fontSize: ATLAS_NAV_THUMB_LABEL_FONT_SIZE }}>
        {node?.shortLabel || node?.label || nodeId}
      </span>
    </button>
  );
}

function PathSegment({
  nodeId,
  isActive,
  isMobile,
  onClick,
  onMouseEnter,
}: {
  nodeId: string;
  isActive: boolean;
  isMobile: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  useAnimatedBorderCSS();
  const node = findNode(atlasNavigation, nodeId);
  const thumbUrl = getThumbUrl(nodeId);
  const fontStyle = isMobile ? NAV_FONT_STYLE_MOBILE : NAV_FONT_STYLE;
  return (
    <button onClick={onClick} onMouseEnter={onMouseEnter} className="group flex flex-col items-center shrink-0 cursor-pointer" style={{ width: PATH_SEG.width, contain: "layout style" }}>
      <div className={`w-full ${isActive ? "atlas-active-border" : "atlas-idle-border"}`} style={{ borderRadius: PATH_SEG.borderRadius }}>
        <div className="atlas-border-inner w-full" style={{ borderRadius: PATH_SEG.imgRadius }}>
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3", borderRadius: PATH_SEG.imgRadius }}>
            {thumbUrl ? (
              <FadeImg src={thumbUrl} alt={node?.label || nodeId} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900"><FileText size={14} className="text-white/30" /></div>
            )}
          </div>
        </div>
      </div>
      <span className="atlas-frame-label w-full text-center truncate leading-tight mt-1" style={{ color: isActive ? "#f5f5f5" : ATLAS_INACTIVE_LABEL_COLOR, ...fontStyle, fontSize: ATLAS_NAV_THUMB_LABEL_FONT_SIZE }}>
        {node?.shortLabel || node?.label || nodeId}
      </span>
    </button>
  );
}

function AllSegment({
  isMobile,
  onClick,
}: {
  isMobile: boolean;
  onClick: () => void;
}) {
  useAnimatedBorderCSS();
  const fontStyle = isMobile ? NAV_FONT_STYLE_MOBILE : NAV_FONT_STYLE;
  return (
    <button onClick={onClick} className="group flex flex-col items-center shrink-0 cursor-pointer" style={{ width: PATH_SEG.width, contain: "layout style" }}>
      <div className="w-full atlas-idle-border" style={{ borderRadius: PATH_SEG.borderRadius }}>
        <div className="atlas-border-inner w-full" style={{ borderRadius: PATH_SEG.imgRadius }}>
          <div
            className="w-full h-full flex items-center justify-center bg-white/67"
            style={{ aspectRatio: "4 / 3", borderRadius: PATH_SEG.imgRadius }}
          />
        </div>
      </div>
      <span className="atlas-frame-label w-full text-center truncate leading-tight mt-1" style={{ color: ATLAS_INACTIVE_LABEL_COLOR, ...fontStyle, fontSize: ATLAS_NAV_THUMB_LABEL_FONT_SIZE }}>
        All
      </span>
    </button>
  );
}

function ChildrenStrip({
  nodes,
  activeId,
  isMobile,
  prefersReducedMotion,
  omitTopBorder,
  onHover,
  onHoverLeave,
  onSelect,
}: {
  nodes: NavNode[];
  activeId: string | null;
  isMobile: boolean;
  prefersReducedMotion: boolean;
  /** When true, no top rule (drawer container draws the separator under the category strip). */
  omitTopBorder?: boolean;
  onHover: (id: string) => void;
  onHoverLeave: () => void;
  onSelect: (id: string) => void;
}) {
  useAnimatedBorderCSS();
  const { handleEnter, handleLeave: debouncedLeave } = useDebouncedHover(onHover, 50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const fontStyle = isMobile ? NAV_FONT_STYLE_MOBILE : NAV_FONT_STYLE;
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const containerRect = scrollRef.current.getBoundingClientRect();
      const elRect = activeRef.current.getBoundingClientRect();
      if (elRect.left < containerRect.left || elRect.right > containerRect.right) {
        activeRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeId]);
  const handleMouseLeave = useCallback(() => {
    debouncedLeave();
    onHoverLeave();
  }, [debouncedLeave, onHoverLeave]);
  const edgeFade = prefersReducedMotion ? ATLAS_AMBIENT_BG : ATLAS_CHROME_GLASS_RGBA;
  return (
    <div
      className={`relative z-10 w-full bg-transparent ${omitTopBorder ? "" : "border-t border-white/[0.1]"}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none z-10" style={{ background: `linear-gradient(to right, ${edgeFade}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-10" style={{ background: `linear-gradient(to left, ${edgeFade}, transparent)` }} />
      <div ref={scrollRef} className="overflow-x-auto" onMouseLeave={handleMouseLeave}>
        <div className="flex items-end px-4 sm:px-[3%]" style={{ gap: STRIP_THUMB_GAP, paddingTop: 8, paddingBottom: 8, width: "fit-content", minWidth: "100%", justifyContent: "flex-start" }}>
          {nodes.map((node) => {
            const isActive = activeId === node.id;
            const thumbUrl = getThumbUrl(node.id);
            return (
              <button key={node.id} ref={isActive ? activeRef : undefined} onClick={() => onSelect(node.id)} onMouseEnter={!isMobile ? () => handleEnter(node.id) : undefined} onMouseLeave={!isMobile ? debouncedLeave : undefined} className="group flex flex-col items-center shrink-0 cursor-pointer" style={{ width: STRIP_THUMB.width, contain: "layout style" }}>
                <div className={`w-full ${isActive ? "atlas-active-border" : "atlas-idle-border"}`} style={{ borderRadius: STRIP_THUMB.borderRadius }}>
                  <div className="atlas-border-inner w-full" style={{ borderRadius: STRIP_THUMB.imgRadius }}>
                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4 / 3", borderRadius: STRIP_THUMB.imgRadius }}>
                      {thumbUrl ? (
                        <FadeImg src={thumbUrl} alt={node.label} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-900"><FileText size={14} className="text-white/30" /></div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="atlas-frame-label w-full text-center truncate leading-tight mt-1" style={{ color: isActive ? "#f5f5f5" : ATLAS_INACTIVE_LABEL_COLOR, ...fontStyle, fontSize: ATLAS_NAV_THUMB_LABEL_FONT_SIZE }}>
                  {node.shortLabel || node.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export interface TopNavProps {
  activeNodeId: string | null;
  onNavigate: (nodeId: string) => void;
  /** Detail-mode escape hatch: return to browse while preserving strict history semantics. */
  onBackToBrowse?: () => void;
  onPreviewNavigate?: (nodeId: string | null) => void;
  externalSearch?: string;
  onSearchChange?: (query: string) => void;
  visibleProfileCount?: number;
  locationKey?: string;
  /** When true, category strip is hidden visually but kept in layout so scroll spacer height is unchanged (avoids CLS when opening profile detail). */
  hideCategoryNavStrip?: boolean;
  children?: ReactNode;
}

function TopNavInner({
  activeNodeId,
  onNavigate,
  onBackToBrowse,
  onPreviewNavigate,
  externalSearch,
  onSearchChange,
  visibleProfileCount = 0,
  locationKey,
  hideCategoryNavStrip = false,
  children,
}: TopNavProps) {
  const isMobile = useIsMobile();
  usePageFadeCSS();
  const { committedPath, setCommittedPath, searchQuery, setSearchQuery, clearFilter } = useNavFilter();
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [hoveredL2Id, setHoveredL2Id] = useState<string | null>(null);
  const [hoveredPortalId, setHoveredPortalId] = useState<string | null>(null);
  const hoveredPortalIdRef = useRef<string | null>(null);
  const [l1Hovered, setL1Hovered] = useState(false);
  const [childrenOpenOnMobile, setChildrenOpenOnMobile] = useState(false);
  const [atlasScrollPortEl, setAtlasScrollPortEl] = useState<HTMLDivElement | null>(null);
  const navStripMeasureRef = useRef<HTMLDivElement>(null);
  const topChromeStackRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  /** Ignore scroll-driven nav hide/show while chrome height is settling (avoids padTop ↔ scrollTop feedback flicker). */
  const scrollNavSuppressedUntilRef = useRef(0);
  const scrollNavRafRef = useRef<number | null>(null);
  const prevNavStripHiddenByScrollRef = useRef<boolean | null>(null);
  const l1LeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPath = selectedPath.length > 0;
  const visibleSearch = externalSearch ?? searchQuery;

  const setSearch = useCallback((next: string) => {
    setSearchQuery(next);
    onSearchChange?.(next);
  }, [onSearchChange, setSearchQuery]);

  useEffect(() => {
    return () => {
      if (l1LeaveTimer.current) clearTimeout(l1LeaveTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!activeNodeId || activeNodeId === "home") {
      setSelectedPath(committedPath);
      return;
    }
    const path = findNodePath(atlasNavigation, activeNodeId);
    if (path) setSelectedPath(path);
  }, [activeNodeId, committedPath]);

  const level2Nodes = useMemo(() => {
    if (selectedPath.length === 0 && hoveredPortalId) {
      return findNode(atlasNavigation, hoveredPortalId)?.children || [];
    }
    const rootId = selectedPath[0];
    if (!rootId) return [];
    return findNode(atlasNavigation, rootId)?.children || [];
  }, [selectedPath, hoveredPortalId]);
  const activeLevel2Id = hoveredL2Id ?? selectedPath[1] ?? null;
  const level3Nodes = useMemo(() => {
    const anchor = hoveredL2Id ?? selectedPath[1] ?? null;
    if (!anchor) return [];
    return findNode(atlasNavigation, anchor)?.children || [];
  }, [hoveredL2Id, selectedPath]);
  const activeLevel3Id = selectedPath[2] ?? null;
  /** At a grid-scoped fiber family (e.g. Silk) or a nav leaf, do not open L2/L3 strips from hovering the breadcrumb row. */
  const suppressChildrenStripOnBreadcrumbHover = useMemo(() => {
    if (!hasPath || !activeNodeId || activeNodeId === "home") return false;
    const node = findNode(atlasNavigation, activeNodeId);
    const isNavLeaf = !node?.children?.length;
    const gridScopedFamily = mapNavToGridFilters(activeNodeId).fiberSubcategory != null;
    return isNavLeaf || gridScopedFamily;
  }, [hasPath, activeNodeId]);
  const showChildrenStrip =
    level2Nodes.length > 0 &&
    (isMobile ? childrenOpenOnMobile : l1Hovered && !suppressChildrenStripOnBreadcrumbHover);
  const stripHeight = showChildrenStrip
    ? CHILDREN_STRIP_HEIGHT + (level3Nodes.length > 0 ? CHILDREN_STRIP_HEIGHT : 0)
    : 0;

  const prefersReducedMotion = usePrefersReducedMotion();
  const { nfaMarkStyle } = useNfaMarkScrollRotation(atlasScrollPortEl, prefersReducedMotion);
  /** Drawer height only — frosted glass is on the parent column so one `backdrop-filter` covers L1 + L2/L3. */
  const childrenStripDrawerStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      height: stripHeight,
      pointerEvents: stripHeight === 0 ? "none" : "auto",
    };
    if (prefersReducedMotion) return base;
    return { ...base, transition: `height 250ms ${TRANSITION_EASE}` };
  }, [prefersReducedMotion, stripHeight]);
  /** Breadcrumb path (All › …) or open L2/L3 strip — keep the thumb/breadcrumb nav visible. */
  const breadcrumbFilterRowActive = hasPath || stripHeight > 0;
  const pinNavStripOnScroll = breadcrumbFilterRowActive;

  const [navStripMeasuredHeight, setNavStripMeasuredHeight] = useState<number | null>(null);
  const [navStripHiddenByScroll, setNavStripHiddenByScroll] = useState(false);
  const [scrollPadTop, setScrollPadTop] = useState(0);

  /** Outer slot height includes L2/L3 (in-flow under L1) so the pointer stays inside one hit box — avoids instant `mouseleave` when moving into the subcategory row. */
  const navStripSlotHeight =
    navStripHiddenByScroll && !pinNavStripOnScroll
      ? 0
      : navStripMeasuredHeight != null
        ? navStripMeasuredHeight + stripHeight
        : undefined;

  const navStripMeasureRafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = navStripMeasureRef.current;
    if (!el) return;
    const flush = () => {
      navStripMeasureRafRef.current = null;
      setNavStripMeasuredHeight(el.offsetHeight);
    };
    const schedule = () => {
      if (navStripMeasureRafRef.current != null) return;
      navStripMeasureRafRef.current = requestAnimationFrame(flush);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    schedule();
    return () => {
      ro.disconnect();
      if (navStripMeasureRafRef.current != null) {
        cancelAnimationFrame(navStripMeasureRafRef.current);
        navStripMeasureRafRef.current = null;
      }
    };
  }, [isMobile, hasPath, stripHeight]);

  /** Spacer height for overlaid chrome — coalesce ResizeObserver to one `setScrollPadTop` per frame (avoids layout thrash during chrome height changes). */
  const scrollPadRafRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const stack = topChromeStackRef.current;
    if (!stack) return;
    const flushPad = () => {
      scrollPadRafRef.current = null;
      setScrollPadTop(stack.offsetHeight);
    };
    const schedulePad = () => {
      if (scrollPadRafRef.current != null) return;
      scrollPadRafRef.current = requestAnimationFrame(flushPad);
    };
    const ro = new ResizeObserver(schedulePad);
    ro.observe(stack);
    schedulePad();
    return () => {
      ro.disconnect();
      if (scrollPadRafRef.current != null) {
        cancelAnimationFrame(scrollPadRafRef.current);
        scrollPadRafRef.current = null;
      }
    };
  }, []);

  /**
   * ResizeObserver pad updates are rAF-coalesced above — that can leave the spacer one frame
   * behind the real chrome height. Measure synchronously after every commit so profile-open
   * strip removal and similar jumps align spacer + scroll compensation before paint.
   */
  useLayoutEffect(() => {
    const stack = topChromeStackRef.current;
    if (!stack) return;
    const next = stack.offsetHeight;
    setScrollPadTop((prev) => (prev === next ? prev : next));
  });

  /** When chrome height changes, nudge scrollTop by the same delta. Set suppress **before** `scrollTop` so synchronous scroll handlers don’t toggle nav. */
  const prevScrollPadTopRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const root = atlasScrollPortEl;
    if (!root) return;
    const prev = prevScrollPadTopRef.current;
    prevScrollPadTopRef.current = scrollPadTop;
    if (prev === null) return;
    const delta = scrollPadTop - prev;
    if (delta === 0) return;
    if (Math.abs(delta) < 2) return;
    const maxScroll = Math.max(0, root.scrollHeight - root.clientHeight);
    const adjusted = Math.min(maxScroll, Math.max(0, root.scrollTop + delta));
    scrollNavSuppressedUntilRef.current = Date.now() + 550;
    root.scrollTop = adjusted;
    lastScrollTopRef.current = adjusted;
  }, [scrollPadTop, atlasScrollPortEl]);

  useEffect(() => {
    if (pinNavStripOnScroll) setNavStripHiddenByScroll(false);
  }, [pinNavStripOnScroll]);

  useEffect(() => {
    if (hideCategoryNavStrip) setNavStripHiddenByScroll(false);
  }, [hideCategoryNavStrip]);

  useEffect(() => {
    if (hideCategoryNavStrip || pinNavStripOnScroll) {
      prevNavStripHiddenByScrollRef.current = navStripHiddenByScroll;
      return;
    }
    const prev = prevNavStripHiddenByScrollRef.current;
    prevNavStripHiddenByScrollRef.current = navStripHiddenByScroll;
    if (prev !== null && prev !== navStripHiddenByScroll) {
      scrollNavSuppressedUntilRef.current = Date.now() + 550;
    }
  }, [navStripHiddenByScroll, hideCategoryNavStrip, pinNavStripOnScroll]);

  useEffect(() => {
    const root = atlasScrollPortEl;
    if (!root) return;
    const DOWN_DELTA = 36;
    const UP_DELTA = 24;
    const TOP_EPSILON = 8;

    const processScroll = () => {
      const st = root.scrollTop;
      if (Date.now() < scrollNavSuppressedUntilRef.current) {
        lastScrollTopRef.current = st;
        return;
      }
      if (hideCategoryNavStrip || pinNavStripOnScroll) {
        setNavStripHiddenByScroll(false);
        lastScrollTopRef.current = st;
        return;
      }
      const prev = lastScrollTopRef.current;
      lastScrollTopRef.current = st;

      if (st <= TOP_EPSILON) {
        setNavStripHiddenByScroll((h) => (h ? false : h));
        return;
      }
      if (st < prev - UP_DELTA) {
        setNavStripHiddenByScroll((h) => (h ? false : h));
      } else if (st > prev + DOWN_DELTA) {
        setNavStripHiddenByScroll((h) => (!h ? true : h));
      }
    };

    const onScroll = () => {
      if (hideCategoryNavStrip) {
        setNavStripHiddenByScroll(false);
        lastScrollTopRef.current = root.scrollTop;
        return;
      }
      if (pinNavStripOnScroll) {
        setNavStripHiddenByScroll(false);
        lastScrollTopRef.current = root.scrollTop;
        return;
      }
      if (scrollNavRafRef.current != null) return;
      scrollNavRafRef.current = requestAnimationFrame(() => {
        scrollNavRafRef.current = null;
        processScroll();
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    lastScrollTopRef.current = root.scrollTop;
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (scrollNavRafRef.current != null) {
        cancelAnimationFrame(scrollNavRafRef.current);
        scrollNavRafRef.current = null;
      }
    };
  }, [atlasScrollPortEl, hideCategoryNavStrip, pinNavStripOnScroll]);

  const handleRootClick = useCallback((id: string) => {
    setHoveredL2Id(null);
    setHoveredPortalId(null);
    hoveredPortalIdRef.current = null;
    setSelectedPath([id]);
    setChildrenOpenOnMobile(true);
    setCommittedPath([id]);
    onPreviewNavigate?.(null);
    onNavigate(id);
  }, [onNavigate, onPreviewNavigate, setCommittedPath]);

  const handleNodeClick = useCallback((id: string) => {
    setHoveredL2Id(null);
    const path = findNodePath(atlasNavigation, id);
    if (path) {
      setSelectedPath(path);
      setCommittedPath(path);
    }
    onPreviewNavigate?.(null);
    onNavigate(id);
    if (isMobile) {
      const node = findNode(atlasNavigation, id);
      setChildrenOpenOnMobile(Boolean(node?.children?.length));
    }
  }, [isMobile, onNavigate, onPreviewNavigate, setCommittedPath]);

  const resetToAll = useCallback(() => {
    setHoveredL2Id(null);
    setSelectedPath([]);
    setHoveredPortalId(null);
    hoveredPortalIdRef.current = null;
    clearFilter();
    onSearchChange?.("");
    onPreviewNavigate?.(null);
    onNavigate("home");
    setChildrenOpenOnMobile(false);
    if (atlasScrollPortEl) atlasScrollPortEl.scrollTop = 0;
  }, [atlasScrollPortEl, clearFilter, onNavigate, onPreviewNavigate, onSearchChange]);

  /* Scroll architecture:
     1) `h-dvh min-h-0` fixes shell height to the viewport.
     2) Main content scrolls in a full-bleed layer (`absolute inset-0`); a top **spacer** (not
        container padding) matches chrome height so the first row clears the bars, then scrolls away
        and tiles pass under the glass wordmark row.
     3) Wordmark + category strip + subcategory drawer sit in `pointer-events-none` stack; interactive
        rows use `pointer-events-auto`. L1 and L2/L3 share one frosted flex column (single
        `backdrop-filter`) so the drawer matches the category bar; horizontal clip stays on the portal
        row only. Scroll-collapse uses **instant** height so ResizeObserver + scroll compensation don’t
        fight each frame. */
  return (
    <div
      className="relative h-dvh min-h-0 w-full overflow-hidden"
      style={{ backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION }}
    >
      <div
        ref={setAtlasScrollPortEl}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        data-testid="atlas-main-scroll"
        style={{
          touchAction: "pan-y",
          transform: "translateZ(0)",
          overflowAnchor: "none" as const,
        }}
      >
        <AtlasScrollPortContext.Provider value={atlasScrollPortEl ?? undefined}>
          <div
            className="shrink-0"
            style={{ height: scrollPadTop }}
            aria-hidden
          />
          {/*
            Fill at least the viewport below the top spacer so in-flow content (e.g. site footer)
            can sit after the grid while still anchoring to the bottom when the grid is short.
          */}
          <div
            className="flex min-h-[min-content] flex-col"
            style={{
              minHeight: `calc(100dvh - ${scrollPadTop}px)`,
              paddingTop: 20,
              paddingBottom: 20,
            }}
          >
            {locationKey ? (
              <div
                key={locationKey}
                className="atlas-page-fade flex min-h-[min-content] flex-1 flex-col"
              >
                {children}
              </div>
            ) : (
              <div className="flex min-h-[min-content] flex-1 flex-col">{children}</div>
            )}
          </div>
        </AtlasScrollPortContext.Provider>
      </div>

      <div
        ref={topChromeStackRef}
        className="pointer-events-none absolute left-0 right-0 top-0 z-[45] flex flex-col overflow-visible"
      >
      <div className="pointer-events-auto shrink-0 border-b border-white/[0.1]" style={atlasChromeGlassRowStyle(prefersReducedMotion)}>
        <div
          className={`flex px-4 sm:px-[3%] ${isMobile ? "flex-col items-stretch gap-2 py-2" : "min-h-14 items-center gap-3 justify-between"}`}
        >
          <div
            className={`flex min-w-0 items-center gap-3 ${isMobile ? "atlas-topnav-wordmark-slot w-full" : "shrink-0"}`}
          >
            <button
              type="button"
              onClick={resetToAll}
              className={`atlas-wordmark-home flex min-w-0 cursor-pointer items-center gap-2.5 text-left ${isMobile ? "max-w-full" : ""}`}
            >
              <NfaMark
                className="atlas-nfa-mark-target block h-9 w-9 shrink-0 text-[#e8e0d0]"
                style={nfaMarkStyle}
              />
              <span
                className={`min-w-0 whitespace-nowrap text-[#e8e0d0] ${isMobile ? "atlas-wordmark-fluid max-w-full" : ""}`}
                style={
                  isMobile
                    ? { ...NAV_FONT_STYLE, fontWeight: ATLAS_GRID_TITLE_STYLE.fontWeight }
                    : { ...NAV_FONT_STYLE, ...ATLAS_GRID_TITLE_STYLE }
                }
              >
                Natural Fiber Atlas
              </span>
            </button>
            {!isMobile && (
              <span className="whitespace-nowrap text-[#c4bbb0]" style={{ ...NAV_FONT_STYLE, ...ATLAS_GRID_SUBHEAD_MUTED_STYLE }}>
                {visibleProfileCount} Profiles
              </span>
            )}
            {hideCategoryNavStrip && (
              <button
                type="button"
                onClick={() => {
                  if (onBackToBrowse) {
                    onBackToBrowse();
                    return;
                  }
                  resetToAll();
                }}
                className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-white/75 hover:text-white transition-colors"
                style={ATLAS_GRID_SUBHEAD_MUTED_STYLE}
                aria-label="Back to browse"
              >
                Back to browse
              </button>
            )}
          </div>
          <div
            className={
              isMobile
                ? "atlas-topnav-search-slot relative my-2.5 min-w-0 w-full"
                : ATLAS_SEARCH_WRAPPER_CLASS
            }
          >
            <Search
              size={isMobile ? 11 : 13}
              className={
                isMobile
                  ? "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20"
                  : ATLAS_SEARCH_ICON_CLASS
              }
            />
            <input
              type="text"
              aria-label="Search fibers"
              placeholder={isMobile ? `Search ${visibleProfileCount} profiles...` : "Search profiles..."}
              value={visibleSearch}
              onChange={(e) => {
                const next = e.target.value;
                setSearch(next);
              }}
              className={`${ATLAS_SEARCH_INPUT_CLASS}${isMobile ? " atlas-search-input-fluid py-1 pl-7 pr-7" : ""}`}
              style={isMobile ? { ...NAV_FONT_STYLE } : ATLAS_GRID_SEARCH_STYLE}
            />
            {visibleSearch && (
              <button
                onClick={() => setSearch("")}
                className={ATLAS_SEARCH_CLEAR_BUTTON_CLASS}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${
          navStripHiddenByScroll && !pinNavStripOnScroll
            ? "pointer-events-auto shrink-0 overflow-hidden"
            : "pointer-events-auto shrink-0 overflow-visible"
        }${hideCategoryNavStrip ? " invisible pointer-events-none select-none" : ""}`}
        style={{
          height: navStripSlotHeight,
          minHeight: navStripHiddenByScroll && !pinNavStripOnScroll ? 0 : undefined,
          pointerEvents:
            hideCategoryNavStrip || (navStripHiddenByScroll && !pinNavStripOnScroll)
              ? "none"
              : undefined,
        }}
        aria-hidden={
          hideCategoryNavStrip || (navStripHiddenByScroll && !pinNavStripOnScroll)
            ? true
            : undefined
        }
        data-testid="atlas-nav-category-slot"
        onMouseEnter={() => {
          if (l1LeaveTimer.current) {
            clearTimeout(l1LeaveTimer.current);
            l1LeaveTimer.current = null;
          }
          setL1Hovered(true);
        }}
        onMouseLeave={() => {
          leaveTimer.current = setTimeout(() => {
            setHoveredL2Id(null);
            setHoveredPortalId(null);
            hoveredPortalIdRef.current = null;
          }, 80);
          l1LeaveTimer.current = setTimeout(() => setL1Hovered(false), 80);
          onPreviewNavigate?.(null);
        }}
      >
        <div
          className={`flex w-full min-h-0 shrink-0 flex-col ${navStripSlotHeight != null ? "h-full" : ""}`}
          style={atlasChromeGlassRowStyle(prefersReducedMotion, { omitTopInset: true })}
        >
          <div
            ref={navStripMeasureRef}
            className="relative z-40 min-w-0 w-full shrink-0 border-b border-white/[0.1]"
          >
          {/*
            Horizontal clipping only on the portal/breadcrumb row. The frosted panel is the parent
            column so L2/L3 inherit the same blur as L1 without a second `backdrop-filter` layer.
          */}
          <div className="min-w-0 w-full overflow-x-hidden">
          <div
            className="flex items-center px-4 sm:px-[3%]"
            style={{
              minHeight: isMobile ? MOBILE_PRIMARY_NAV_STRIP_MIN_HEIGHT : 76,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 12,
              justifyContent: "flex-start",
              transition: `gap ${TRANSITION_MS}ms ${TRANSITION_EASE}`,
            }}
          >
            {!hasPath &&
              atlasNavigation.map((node) => (
                <PortalThumb
                  key={node.id}
                  nodeId={node.id}
                  mode="full"
                  isActiveSegment={false}
                  isHovered={hoveredPortalId === node.id}
                  isMobile={isMobile}
                  onClick={() => handleRootClick(node.id)}
                  onMouseEnter={!isMobile ? () => {
                    setHoveredL2Id(null);
                    setHoveredPortalId(node.id);
                    hoveredPortalIdRef.current = node.id;
                    onPreviewNavigate?.(node.id);
                  } : undefined}
                />
              ))}

            {hasPath && (
              <div className="flex min-w-0 items-center gap-2">
                <AllSegment isMobile={isMobile} onClick={resetToAll} />
                {selectedPath.map((id, i) => {
                  const isLast = i === selectedPath.length - 1;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <ChevronRight size={10} className="text-white/30" />
                      <PathSegment
                        nodeId={id}
                        isActive={isLast}
                        isMobile={isMobile}
                        onClick={() => handleNodeClick(id)}
                        onMouseEnter={!isMobile ? () => onPreviewNavigate?.(id) : undefined}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {isMobile && hasPath && level2Nodes.length > 0 && (
              <button
                type="button"
                onClick={() => setChildrenOpenOnMobile((prev) => !prev)}
                className="ml-auto p-1.5 rounded-full text-white/40 hover:text-white/70 transition-colors"
                aria-label={childrenOpenOnMobile ? "Hide subcategories" : "Browse subcategories"}
                aria-expanded={childrenOpenOnMobile}
                aria-controls="atlas-children-strip"
              >
                {childrenOpenOnMobile ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
          </div>
          </div>

          <div
            id="atlas-children-strip"
            className={`relative z-10 flex min-h-0 w-full shrink-0 flex-col overflow-hidden ${stripHeight > 0 ? "border-b border-white/[0.1]" : ""}`}
            style={childrenStripDrawerStyle}
          >
            {level2Nodes.length > 0 && (
              <ChildrenStrip
                nodes={level2Nodes}
                activeId={activeLevel2Id}
                isMobile={isMobile}
                prefersReducedMotion={prefersReducedMotion}
                omitTopBorder
                onHover={(id) => {
                  const nodePath = findNodePath(atlasNavigation, id);
                  const node = findNode(atlasNavigation, id);
                  if (nodePath && node?.children?.length) {
                    setHoveredL2Id(id);
                  } else {
                    setHoveredL2Id(null);
                  }
                  onPreviewNavigate?.(id);
                }}
                onHoverLeave={() => {
                  const root = hoveredPortalIdRef.current;
                  if (root && selectedPath.length === 0) onPreviewNavigate?.(root);
                  else if (selectedPath.length > 0) {
                    const anchor = hoveredL2Id ?? selectedPath[1] ?? selectedPath[selectedPath.length - 1] ?? null;
                    onPreviewNavigate?.(anchor);
                  }
                  else onPreviewNavigate?.(null);
                }}
                onSelect={(id) => handleNodeClick(id)}
              />
            )}
            {level3Nodes.length > 0 && (
              <ChildrenStrip
                nodes={level3Nodes}
                activeId={activeLevel3Id}
                isMobile={isMobile}
                prefersReducedMotion={prefersReducedMotion}
                onHover={(id) => onPreviewNavigate?.(id)}
                onHoverLeave={() => {
                  const anchor = hoveredL2Id ?? selectedPath[1] ?? null;
                  if (anchor) onPreviewNavigate?.(anchor);
                  else onPreviewNavigate?.(null);
                }}
                onSelect={(id) => handleNodeClick(id)}
              />
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export function TopNav(props: TopNavProps) {
  return (
    <NavFilterProvider>
      <TopNavInner {...props} />
    </NavFilterProvider>
  );
}
