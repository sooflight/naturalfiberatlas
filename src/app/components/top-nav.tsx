import { ChevronDown, ChevronRight, ChevronUp, FileText, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { atlasNavigation, findNode, findNodePath, type NavNode } from "../data/atlas-navigation";
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
  getThumbUrl,
  NAV_FONT_STYLE,
  NAV_FONT_STYLE_MOBILE,
} from "./atlas-shared";
import { NavFilterProvider, useNavFilter } from "../context/nav-filter-context";
import { ImageWithFallback } from "./figma/ImageWithFallback";
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
  return (
    <ImageWithFallback
      {...props}
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
const PORTAL_PATH = { width: 52, borderRadius: 6, imgRadius: 5 };
const PATH_SEG = { width: 52, borderRadius: 6, imgRadius: 5 };
const STRIP_THUMB = { width: 72, borderRadius: 8, imgRadius: 7 };
const ATLAS_AMBIENT_BG = "var(--atlas-ambient-bg, #111111)";
const ATLAS_AMBIENT_TRANSITION = "background-color 2s ease";

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
  onHover,
  onHoverLeave,
  onSelect,
}: {
  nodes: NavNode[];
  activeId: string | null;
  isMobile: boolean;
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
  return (
    <div
      className="relative w-full border-t border-white/[0.06]"
      style={{ backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-10 pointer-events-none z-10" style={{ background: `linear-gradient(to right, ${ATLAS_AMBIENT_BG}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-10 pointer-events-none z-10" style={{ background: `linear-gradient(to left, ${ATLAS_AMBIENT_BG}, transparent)` }} />
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
  onPreviewNavigate?: (nodeId: string | null) => void;
  externalSearch?: string;
  onSearchChange?: (query: string) => void;
  visibleProfileCount?: number;
  locationKey?: string;
  children?: ReactNode;
}

function TopNavInner({
  activeNodeId,
  onNavigate,
  onPreviewNavigate,
  externalSearch,
  onSearchChange,
  visibleProfileCount = 0,
  locationKey,
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
  const showChildrenStrip = level2Nodes.length > 0 && (isMobile ? childrenOpenOnMobile : l1Hovered);
  const stripHeight = showChildrenStrip
    ? CHILDREN_STRIP_HEIGHT + (level3Nodes.length > 0 ? CHILDREN_STRIP_HEIGHT : 0)
    : 0;

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
  }, [clearFilter, onNavigate, onPreviewNavigate, onSearchChange]);

  return (
    <div
      className="flex min-h-dvh w-full flex-col overflow-hidden"
      style={{ backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION }}
    >
      <div
        className="shrink-0 border-b border-white/[0.06]"
        style={{ backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION }}
      >
        <div
          className={`flex min-h-14 items-center gap-3 px-4 sm:px-[3%] ${isMobile ? "py-2" : "justify-between"}`}
        >
          <div
            className={`flex min-w-0 items-center gap-3 ${isMobile ? "atlas-topnav-wordmark-slot flex-1" : "shrink-0"}`}
          >
            <button
              onClick={resetToAll}
              className={`cursor-pointer text-left whitespace-nowrap text-[#e8e0d0] ${isMobile ? "atlas-wordmark-fluid min-w-0 max-w-full" : ""}`}
              style={
                isMobile
                  ? { ...NAV_FONT_STYLE, fontWeight: ATLAS_GRID_TITLE_STYLE.fontWeight }
                  : { ...NAV_FONT_STYLE, ...ATLAS_GRID_TITLE_STYLE }
              }
            >
              Natural Fiber Atlas
            </button>
            {!isMobile && (
              <span className="whitespace-nowrap text-[#8e8678]" style={{ ...NAV_FONT_STYLE, ...ATLAS_GRID_SUBHEAD_MUTED_STYLE }}>
                {visibleProfileCount} Profiles
              </span>
            )}
          </div>
          <div
            className={
              isMobile
                ? "atlas-topnav-search-slot relative min-w-0 flex-1"
                : ATLAS_SEARCH_WRAPPER_CLASS
            }
          >
            <Search size={13} className={ATLAS_SEARCH_ICON_CLASS} />
            <input
              type="text"
              aria-label="Search fibers"
              placeholder={isMobile ? `Search ${visibleProfileCount} profiles...` : "Search profiles..."}
              value={visibleSearch}
              onChange={(e) => {
                const next = e.target.value;
                setSearch(next);
              }}
              className={`${ATLAS_SEARCH_INPUT_CLASS}${isMobile ? " atlas-search-input-fluid" : ""}`}
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
        className="relative shrink-0 border-b border-white/[0.06] z-40"
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
        style={{ backgroundColor: ATLAS_AMBIENT_BG, transition: ATLAS_AMBIENT_TRANSITION }}
      >
        <div className="flex items-center px-4 sm:px-[3%]" style={{ minHeight: 76, paddingTop: 8, paddingBottom: 8, gap: 12, justifyContent: "flex-start", transition: `gap ${TRANSITION_MS}ms ${TRANSITION_EASE}` }}>
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

        <div
          id="atlas-children-strip"
          className="absolute left-0 top-full z-50 w-full overflow-hidden"
          style={{
            height: stripHeight,
            transition: `height 250ms ${TRANSITION_EASE}`,
          }}
        >
          {level2Nodes.length > 0 && (
            <ChildrenStrip
              nodes={level2Nodes}
              activeId={activeLevel2Id}
              isMobile={isMobile}
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

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {locationKey ? (
          <div key={locationKey} className="atlas-page-fade" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {children}
          </div>
        ) : (
          children
        )}
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
