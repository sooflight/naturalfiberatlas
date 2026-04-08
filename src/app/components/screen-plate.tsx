/**
 * ScreenPlate — Fullscreen "double-inhale" detail view.
 *
 * Renders a scaled-up GlassCard in the same 3:4 aspect ratio as the
 * source DetailCard, morphing from the grid cell position to a centered,
 * viewport-fitted size. Uses the identical GlassCard shell so the
 * frosted-glass background, ambient image, bevel, grain, and orbiting
 * border are visually continuous with the detail plate the user clicked.
 *
 * Navigation: vertical snap-scroll between plates — each page is its own
 * centered GlassCard. When there are multiple plates, top/bottom padding on
 * the scroller shows a peek of the prev/next card. Arrow keys move between
 * plates; long content scrolls inside the active card.
 *
 * Layers: Grid → Inhale #1 (detail cards) → Inhale #2 (ScreenPlate) → Lightbox
 *
 * Renders via a portal to `document.body` so `position: fixed` is viewport-anchored.
 * TopNav’s scroll port uses `transform: translateZ(0)` for compositing; without a portal,
 * fixed descendants are trapped in that layer and grid detail plates (e.g. See Also)
 * can composite above the overlay.
 */

import { useEffect, useCallback, useState, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import type { FiberProfile, PlateType } from "../data/atlas-data";
import {
  RegionsPlate,
  WorldNamesPlate,
  SeeAlsoPlate,
  SilkVariantPlate,
  AnatomyPlate,
  CarePlate,
  ContactSheetPlate,
  getProfilePropertyBoxItems,
  getSupplementalProfileTags,
} from "./detail-plates";
import { GlassCard } from "./glass-card";
import {
  Layers,
  DollarSign,
  Package,
  Clock,
  CalendarDays,
  MapPin,
  Dna,
  Microscope,
  Scissors,
  Flame,
  Droplets,
  Shirt,
  WashingMachine,
  Sun,
  Thermometer,
  ShieldCheck,
  LayoutGrid,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { getValidYoutubeEmbedEntries } from "../utils/youtube-embed-urls";
import { YouTubeEmbedFrame } from "./youtube-embed-frame";
import { insightExcerptFromAboutPart } from "./insight-excerpt";
import { useImagePipeline } from "../context/image-pipeline";
import { useImageAnalysis } from "../hooks/use-image-brightness";
import { dataSource } from "../data/data-provider";
import type { GalleryImageEntry } from "../data/atlas-data";

/* ── Shared primitives ── */
import {
  SCREEN_PAD as pad,
  densityByPlate,
  ScreenSectionLabel as SectionLabel,
  splitAboutText,
  StackedDataRowsExpanded,
  T, ink, accent, sp,
  propertiesCellSurface,
  propertiesPlateLabelStyle,
  propertiesPlateValueStyle,
  type DataRowItem,
  DetailScrollRegion,
} from "./plate-primitives";

const warmA = accent.warm;
const coolA = accent.cool;
const neutA = accent.neutral;

/** A plate available for arrow-key cycling */
export interface ScreenPlateEntry {
  plateType: PlateType;
  cellIndex: number;
  /** When `plateType` is `youtubeEmbed`, which video index this slide shows (mobile may use several slides with the same cellIndex). */
  youtubeEmbedSlot?: number;
}

interface ScreenPlateProps {
  fiber: FiberProfile;
  /** The initially-selected plate */
  initialPlateType: PlateType;
  /** Disambiguates multiple contact-sheet slides (grid cell or mobile chunk index). */
  initialCellIndex?: number;
  /** Ordered list of all navigable plates for this fiber (storytelling order) */
  plates: ScreenPlateEntry[];
  /** Bounding rect of the source grid cell — morph origin */
  sourceRect: DOMRect;
  /** Lookup from cellIndex → DOMRect for exit-morph when cycling */
  getCellRect: (cellIndex: number) => DOMRect | null;
  galleryImages?: GalleryImageEntry[];
  /** Per–grid-cell slices when contact sheet is split across cards */
  gallerySlotImages?: Map<number, GalleryImageEntry[]>;
  gallerySlotStartIndex?: Map<number, number>;
  onOpenLightbox?: (imageIndex?: number, sourceRect?: DOMRect) => void;
  onClose: () => void;
  onSelectFiber: (id: string) => void;
}

/* ── Morph animation configs ── */
const MORPH_SPRING = {
  type: "spring" as const,
  stiffness: 180,
  damping: 22,
  mass: 1,
};

/** Neighbor card peek (px), derived from viewport height. */
function neighborPeekPx(viewportHeight: number): number {
  return Math.round(Math.min(52, Math.max(28, viewportHeight * 0.055)));
}

/**
 * Peek layout: each slide has height (V − 2×peek); scroller has top/bottom padding peek.
 * Slides use scroll-snap-align: center so each card is vertically centered in the viewport,
 * showing ~peek px of the previous card above and the next card below (symmetric).
 * Snapped scroll positions: scrollTop = index × slideStridePx.
 */
function peekScrollMetrics(viewportHeight: number, plateCount: number) {
  if (plateCount <= 1) {
    return { peekPx: 0, slideStridePx: viewportHeight };
  }
  const peekPx = neighborPeekPx(viewportHeight);
  return { peekPx, slideStridePx: viewportHeight - 2 * peekPx };
}

export function ScreenPlate({
  fiber,
  initialPlateType,
  initialCellIndex,
  plates,
  sourceRect,
  getCellRect,
  galleryImages = [],
  gallerySlotImages,
  gallerySlotStartIndex,
  onOpenLightbox,
  onClose,
  onSelectFiber,
}: ScreenPlateProps) {
  const pipeline = useImagePipeline();

  /* ── Hue-tinted static frost ── */
  const hueProbeUrl = pipeline.transform(fiber.image, "hueProbe");
  const imageAnalysis = useImageAnalysis(hueProbeUrl);
  const frostFill = useMemo(() => {
    if (!imageAnalysis) return "rgba(18, 18, 18, 0.82)";
    const h = Math.round(imageAnalysis.hue);
    return `hsla(${h}, 18%, 13%, 0.78)`;
  }, [imageAnalysis]);

  const initialIndex = useMemo(() => {
    if (initialCellIndex !== undefined) {
      const byCell = plates.findIndex(
        (p) => p.plateType === initialPlateType && p.cellIndex === initialCellIndex,
      );
      if (byCell >= 0) return byCell;
    }
    const idx = plates.findIndex((p) => p.plateType === initialPlateType);
    return idx >= 0 ? idx : 0;
  }, [plates, initialPlateType, initialCellIndex]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [entered, setEntered] = useState(false);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const plateScrollRef = useRef<HTMLDivElement>(null);
  const currentIndexRef = useRef(initialIndex);
  const scrollRafRef = useRef<number | null>(null);
  currentIndexRef.current = currentIndex;

  /* ── Track exit state ── */
  const isExitingRef = useRef(false);

  useEffect(() => {
    return () => {
      isExitingRef.current = true;
    };
  }, []);

  const current = plates[currentIndex] ?? plates[0];

  /* Lock body scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  const onInitialMorphComplete = useCallback(() => {
    if (isExitingRef.current) return;
    setEntered(true);
    setEntranceComplete(true);
  }, []);

  /* ── Vertical snap-scroll: sync active plate from scroll position ── */
  const syncIndexFromScroll = useCallback(() => {
    const el = plateScrollRef.current;
    if (!el) return;
    const V = el.clientHeight;
    if (V <= 0) return;
    const { slideStridePx } = peekScrollMetrics(V, plates.length);
    const raw = plates.length <= 1 ? el.scrollTop / V : el.scrollTop / slideStridePx;
    const clamped = Math.max(0, Math.min(plates.length - 1, Math.round(raw)));
    setCurrentIndex((prev) => (prev !== clamped ? clamped : prev));
  }, [plates.length]);

  const onPlateScroll = useCallback(() => {
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncIndexFromScroll();
    });
  }, [syncIndexFromScroll]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    const el = plateScrollRef.current;
    if (!el) return;
    const onScrollEnd = () => syncIndexFromScroll();
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [syncIndexFromScroll]);

  /* Jump to the opened plate as soon as layout height is known (no smooth scroll) */
  useLayoutEffect(() => {
    const el = plateScrollRef.current;
    if (!el) return;
    const V = el.clientHeight;
    if (V <= 0) return;
    const { slideStridePx } = peekScrollMetrics(V, plates.length);
    el.scrollTop = plates.length <= 1 ? initialIndex * V : initialIndex * slideStridePx;
    setCurrentIndex(initialIndex);
  }, [initialIndex, plates.length]);

  /* Keep snap position when the card viewport is resized */
  useEffect(() => {
    const el = plateScrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const V = el.clientHeight;
      if (V <= 0) return;
      const idx = currentIndexRef.current;
      const { slideStridePx } = peekScrollMetrics(V, plates.length);
      el.scrollTop = plates.length <= 1 ? idx * V : idx * slideStridePx;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Navigation (keyboard; touch uses native snap scroll) ── */
  const goNext = useCallback(() => {
    const el = plateScrollRef.current;
    if (!el || plates.length <= 1) return;
    const V = el.clientHeight;
    if (V <= 0) return;
    const { slideStridePx } = peekScrollMetrics(V, plates.length);
    const i = Math.round(
      plates.length <= 1 ? el.scrollTop / V : el.scrollTop / slideStridePx,
    );
    const next = Math.min(plates.length - 1, i + 1);
    const top = plates.length <= 1 ? next * V : next * slideStridePx;
    el.scrollTo({ top, behavior: "smooth" });
    setCurrentIndex(next);
  }, [plates.length]);

  const goPrev = useCallback(() => {
    const el = plateScrollRef.current;
    if (!el || plates.length <= 1) return;
    const V = el.clientHeight;
    if (V <= 0) return;
    const { slideStridePx } = peekScrollMetrics(V, plates.length);
    const i = Math.round(
      plates.length <= 1 ? el.scrollTop / V : el.scrollTop / slideStridePx,
    );
    const prev = Math.max(0, i - 1);
    const top = plates.length <= 1 ? prev * V : prev * slideStridePx;
    el.scrollTo({ top, behavior: "smooth" });
    setCurrentIndex(prev);
  }, [plates.length]);

  useEffect(() => {
    if (!entered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"),
        ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement as HTMLElement | null;
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, goNext, goPrev, onClose]);

  /* ── Layout measurements ── */
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = vw < 640;

  const { peekPx, slideStridePx } = useMemo(
    () => peekScrollMetrics(vh, plates.length),
    [vh, plates.length],
  );

  const target = useMemo(() => {
    const p = isMobile ? 12 : 40;
    const slotH = plates.length <= 1 ? vh : slideStridePx;
    const availW = vw - p * 2;
    const availH = slotH - p * 2;
    let w = availH * 0.75;
    let h = availH;
    if (w > availW) {
      w = availW;
      h = availW * (4 / 3);
    }
    return { width: w, height: h, left: (vw - w) / 2, top: (vh - h) / 2 };
  }, [vw, vh, isMobile, plates.length, slideStridePx]);

  const exitRect = useMemo(() => {
    const rect = getCellRect(current.cellIndex);
    return rect ?? sourceRect;
  }, [current.cellIndex, getCellRect, sourceRect]);

  /* ── FLIP: pure translate() morph ── */
  const enterScale = sourceRect.width / target.width;
  const exitScale = exitRect.width / target.width;
  const enterDx = sourceRect.left - target.left;
  const enterDy = sourceRect.top - target.top;
  const exitDx = exitRect.left - target.left;
  const exitDy = exitRect.top - target.top;

  /* Render plate content */
  const renderContent = (entry: ScreenPlateEntry) => {
    const pt = entry.plateType;
    switch (pt) {
      case "about": return <IdentityScreenPlate fiber={fiber} />;
      case "properties": return <PropertiesScreenPlate fiber={fiber} />;
      case "insight1": return <InsightScreenPlate fiber={fiber} half={1} />;
      case "insight2": return <InsightScreenPlate fiber={fiber} half={2} />;
      case "insight3": return <InsightScreenPlate fiber={fiber} half={3} />;
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza":
        return <SilkVariantPlate plateType={pt} />;
      case "quote": return <QuoteScreenPlate fiber={fiber} />;
      case "youtubeEmbed":
        return <YouTubeScreenPlate fiber={fiber} slotIndex={entry.youtubeEmbedSlot ?? 0} />;
      case "trade": return <TradeScreenPlate fiber={fiber} />;
      case "worldNames": return <WorldNamesPlate fiber={fiber} />;
      case "regions": return <RegionsPlate fiber={fiber} />;
      case "process": return <ProcessScreenPlate fiber={fiber} />;
      case "anatomy": return <AnatomyScreenPlate fiber={fiber} />;
      case "care": return <CareScreenPlate fiber={fiber} />;
      case "seeAlso": return <SeeAlsoPlate fiber={fiber} onSelect={onSelectFiber} />;
      case "contactSheet": {
        const slotImages =
          gallerySlotImages?.get(entry.cellIndex) ?? galleryImages;
        const start = gallerySlotStartIndex?.get(entry.cellIndex) ?? 0;
        return (
          <ContactSheetPlate
            images={slotImages}
            fiberName={fiber.name}
            imageNumberOffset={start}
            onOpenAt={(imgIndex, sourceRect) =>
              onOpenLightbox?.(start + imgIndex, sourceRect)
            }
          />
        );
      }
      default: return null;
    }
  };

  const overlay = (
    <motion.div
      ref={modalRef}
      className="fixed inset-0 z-[90] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`${fiber.name} detail viewer`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop scrim */}
      <motion.div
        className="absolute inset-0 bg-black/93"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
      />

      {/* ── Full-viewport snap: one GlassCard per page; peek shows prev/next when 2+ plates ── */}
      <div
        ref={plateScrollRef}
        role="region"
        aria-label="Profile plates"
        data-testid="screen-plate-snap-scroll"
        className="absolute inset-0 z-[92] overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
        style={{
          touchAction: "pan-y",
          ...(peekPx > 0 ? { paddingTop: peekPx, paddingBottom: peekPx } : {}),
        }}
        onScroll={onPlateScroll}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {plates.map((entry, index) => {
          const plateDensity = densityByPlate[entry.plateType] ?? 0;
          const isCurrent = index === currentIndex;
          const showEntrance = index === initialIndex && !entranceComplete;
          return (
            <section
              key={`screen-slide-${index}`}
              className={`pointer-events-none flex w-full shrink-0 snap-center snap-always items-center justify-center box-border p-3 sm:p-10 ${
                plates.length <= 1 ? "min-h-full" : ""
              }`}
              style={plates.length > 1 ? { height: slideStridePx, minHeight: slideStridePx } : undefined}
              aria-hidden={!isCurrent}
              inert={!isCurrent || undefined}
            >
              <motion.div
                className={`pointer-events-auto rounded-3xl overflow-hidden screen-plate-morph${
                  entered ? " morph-settled" : ""
                }`}
                style={{
                  width: target.width,
                  height: target.height,
                  transformOrigin: "0 0",
                  ["--frost-fill" as any]: frostFill,
                }}
                initial={showEntrance ? { x: enterDx, y: enterDy, scale: enterScale } : false}
                animate={{ x: 0, y: 0, scale: 1 }}
                exit={isCurrent ? { x: exitDx, y: exitDy, scale: exitScale } : undefined}
                transition={MORPH_SPRING}
                onAnimationComplete={index === initialIndex ? onInitialMorphComplete : undefined}
              >
                <div className="h-full w-full" style={{ containerType: "inline-size" }}>
                  <GlassCard
                    fillContainer
                    isHoverable={false}
                    ambientImage={fiber.image}
                    contentDensity={plateDensity}
                  >
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                      {renderContent(entry)}
                    </div>
                  </GlassCard>
                </div>
              </motion.div>
            </section>
          );
        })}
      </div>
    </motion.div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlay, document.body);
}

/* ══════════════════════════════════════════════════════════
   Expanded plate variants (ScreenPlate-specific)
   Use screen-scale typography from plate-primitives.
   ══════════════════════════════════════════════════════════ */

/* ── IDENTITY (Editorial — narrative only; expanded) ── */
function IdentityScreenPlate({ fiber }: { fiber: FiberProfile }) {
  return (
    <div
      className="h-full flex flex-col min-h-0"
      style={{ padding: "clamp(20px, 6.5cqi, 40px)" }}
    >
      <SectionLabel icon={Layers}>Identity</SectionLabel>
      <div className={`w-[${sp.xl}] h-px bg-[${warmA}]/50 mb-[${sp.lg}] shrink-0`} />
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
        <p
          lang="en"
          className={`${T.secondary} detail-prose antialiased [text-wrap:pretty] hyphens-auto`}
          style={{
            fontSize: "clamp(14px, 5.2cqi, 30px)",
            lineHeight: 1.75,
            letterSpacing: "0.01em",
            fontWeight: 450,
            color: "rgba(255, 255, 255, 0.9)",
            textRendering: "optimizeLegibility",
          }}
        >
          {fiber.about}
        </p>
      </div>
    </div>
  );
}

/* ── PROPERTIES (profile metadata + tag chips; expanded) ── */
function PropertiesScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const items = getProfilePropertyBoxItems(fiber);
  const supplementalTags = getSupplementalProfileTags(fiber);
  const tagGridClass = `grid ${supplementalTags.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-[${sp.xs}]`;
  const cellPad = `p-[${sp.sm}]`;
  return (
    <div className={`h-full flex flex-col min-h-0 ${pad}`}>
      <SectionLabel icon={LayoutGrid}>Properties</SectionLabel>
      <div className={`w-[${sp.xl}] h-px bg-[${warmA}]/50 mb-[${sp.md}] shrink-0`} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col justify-center">
          <div className={`flex flex-col gap-[${sp.sm}]`}>
            <div className={`grid grid-cols-2 gap-[${sp.xs}]`}>
              {items.map((item) => (
                <div key={item.label} className={`${cellPad} ${propertiesCellSurface}`}>
                  <span
                    className={`tracking-[0.15em] uppercase ${T.tertiary} block mb-[clamp(1px,0.5cqi,3px)]`}
                    style={propertiesPlateLabelStyle}
                  >
                    {item.label}
                  </span>
                  <span className={`${T.primary} capitalize`} style={propertiesPlateValueStyle}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            {supplementalTags.length > 0 && (
              <div className={tagGridClass}>
                {supplementalTags.map((tag) => (
                  <div
                    key={tag}
                    className={`${cellPad} ${propertiesCellSurface} flex items-center justify-center min-h-[clamp(36px,11cqi,56px)]`}
                  >
                    <span className={`${T.secondary} text-center [text-wrap:balance]`} style={propertiesPlateValueStyle}>
                      {tag}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── INSIGHT (Editorial — warm accent, expanded) ── */
function InsightScreenPlate({ fiber, half }: { fiber: FiberProfile; half: 1 | 2 | 3 }) {
  const parts = splitAboutText(fiber.about, 3);
  const segment = parts[half - 1];
  const text = segment ? insightExcerptFromAboutPart(segment, half) : "";

  if (!text) return null;

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.md}]`}>
        <div className="relative">
          <div aria-hidden="true" className={`absolute inset-0 border-l-[2px] border-[${warmA}]/40 pointer-events-none`} />
          <p className={`${T.primary} detail-prose`} style={{ fontSize: "clamp(14px, 5.2cqi, 24px)", lineHeight: 1.6, fontFamily: "'Pica', serif", letterSpacing: "0.08em", paddingLeft: sp.lg }}>
            {text}
          </p>
        </div>

        <div className={`flex items-center gap-[${sp.xs}]`}>
          <div className={`w-[${sp.lg}] h-px bg-[${warmA}]/30 shrink-0`} />
          <span className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`} style={{ fontSize: "clamp(8px, 2.8cqi, 12px)" }}>
            {fiber.name} &mdash; {half === 1 ? "Origins" : half === 2 ? "Depth" : "Context"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── YOUTUBE (optional embed — one video per fullscreen slide) ── */
function YouTubeScreenPlate({ fiber, slotIndex = 0 }: { fiber: FiberProfile; slotIndex?: number }) {
  const entries = getValidYoutubeEmbedEntries(fiber);
  const row = entries[slotIndex];
  if (!row) return null;

  return (
    <div className={`h-full flex flex-col min-h-0 ${pad}`}>
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className={`flex items-center gap-[${sp.xs}] min-w-0`}>
          <Youtube size={10} className={`text-[${accent.neutral}]/90 shrink-0`} aria-hidden />
          <span
            className={`tracking-[0.18em] uppercase text-[${accent.neutral}] truncate`}
            style={{ fontSize: "clamp(8px, 2.6cqi, 11px)", fontWeight: 500 }}
          >
            Video
          </span>
        </div>
        <span
          className={`text-[${warmA}]/40 uppercase tracking-[0.12em] shrink-0`}
          style={{ fontSize: "clamp(7px, 2.2cqi, 9px)", fontWeight: 600 }}
        >
          YouTube
        </span>
      </div>
      <div className={`w-full h-px bg-gradient-to-r from-[${warmA}]/35 via-white/10 to-transparent mb-[${sp.sm}] shrink-0`} />
      <DetailScrollRegion wrapperClassName="flex-1 min-h-0" scrollClassName={`pt-[${sp.xs}]`}>
        <div className={`min-h-full flex flex-col justify-center gap-[${sp.lg}]`}>
          <div className={`flex flex-col gap-[${sp.sm}]`}>
            <YouTubeEmbedFrame videoId={row.videoId} title={`${fiber.name} on YouTube`} />
            <div className="flex justify-end shrink-0">
              <a
                href={row.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 ${T.secondary} transition-colors hover:bg-white/[0.08] hover:text-white/[0.9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D9A6D]/45`}
                style={{ fontSize: "clamp(10px, 3cqi, 12px)", fontWeight: 600, letterSpacing: "0.06em" }}
              >
                <ExternalLink size={12} className="opacity-75" aria-hidden />
                Watch on YouTube
              </a>
            </div>
          </div>
        </div>
      </DetailScrollRegion>
    </div>
  );
}

/* ── QUOTE (Editorial — warm accent, expanded) ── */
function QuoteScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const quotes = dataSource.getQuoteData()[fiber.id] ?? [];
  const sentences = fiber.about.match(/[^.!?]+[.!?]+/g) ?? [fiber.about];
  const pullQuote = sentences.slice(0, 3).join(" ").trim();
  const hasQuotes = quotes.length > 0;

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <span className={`text-[${warmA}]/25 shrink-0`} style={{ fontSize: "clamp(40px, 16cqi, 80px)", lineHeight: 0.6, fontFamily: "'PICA', 'Pica', serif" }}>&ldquo;</span>

      <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.md}] pt-[${sp.sm}]`}>
        {hasQuotes ? (
          quotes.map((q, i) => (
            <div key={i} className={`flex flex-col gap-[${sp.sm}]`}>
              <div className="relative">
                <div aria-hidden="true" className={`absolute inset-0 border-l-[2px] border-[${warmA}]/40 pointer-events-none`} />
                <p className={`${T.primary} detail-prose`} style={{ fontSize: "clamp(15px, 5.8cqi, 28px)", lineHeight: 1.55, fontFamily: "'Pica', serif", letterSpacing: "0.08em", paddingLeft: sp.lg }}>
                  {q.text}
                </p>
              </div>
              <div className={`flex items-center gap-[${sp.xs}]`}>
                <div className={`w-[${sp.lg}] h-px bg-[${warmA}]/30 shrink-0`} />
                <span className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`} style={{ fontSize: "clamp(8px, 2.8cqi, 12px)" }}>
                  {q.attribution}
                </span>
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="relative">
              <div aria-hidden="true" className={`absolute inset-0 border-l-[2px] border-[${warmA}]/40 pointer-events-none`} />
              <p className={`${T.primary} detail-prose`} style={{ fontSize: "clamp(15px, 5.8cqi, 28px)", lineHeight: 1.55, fontFamily: "'Pica', serif", letterSpacing: "0.08em", paddingLeft: sp.lg }}>
                {pullQuote}
              </p>
            </div>
            <div className={`flex items-center gap-[${sp.xs}]`}>
              <div className={`w-[${sp.lg}] h-px bg-[${warmA}]/30 shrink-0`} />
              <span className={`text-[${warmA}]/60 uppercase tracking-[0.15em]`} style={{ fontSize: "clamp(8px, 2.8cqi, 12px)" }}>
                {fiber.name}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── TRADE (Data — cool accent, expanded with sourcing context) ── */
function TradeScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const rows: DataRowItem[] = [
    { icon: DollarSign, label: "Cost Range", value: fiber.priceRange.raw },
    { icon: Package, label: "Typical MOQ", value: `${fiber.typicalMOQ.quantity} ${fiber.typicalMOQ.unit.toUpperCase()}` },
    { icon: Clock, label: "Lead Time", value: `${fiber.leadTime.minWeeks}–${fiber.leadTime.maxWeeks} Weeks` },
    { icon: CalendarDays, label: "Season", value: fiber.seasonality },
    { icon: MapPin, label: "Sourcing", value: fiber.regions.join(", ") },
  ];
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={DollarSign}>Source &amp; Trade</SectionLabel>
      <StackedDataRowsExpanded rows={rows} accentHex={coolA} />

      {/* Contextual metadata footer */}
      <div className={`grid grid-cols-2 gap-[${sp.xs}] mt-[${sp.md}]`}>
        {[
          { label: "Origin", value: fiber.profilePills.origin },
          { label: "Fiber Type", value: fiber.profilePills.fiberType },
        ].map((item) => (
          <div key={item.label} className={`p-[${sp.sm}] rounded-lg bg-white/[0.03] border border-white/[0.05]`}>
            <span className={`tracking-[0.15em] uppercase ${T.tertiary} block mb-[clamp(1px,0.5cqi,3px)]`} style={{ fontSize: "clamp(8px, 2.5cqi, 10px)", fontWeight: 600 }}>{item.label}</span>
            <span className={`${T.primary} capitalize`} style={{ fontSize: "clamp(10px, 3.2cqi, 14px)", fontWeight: 500 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ANATOMY (Data — cool accent, expanded with fiber context) ── */
function AnatomyScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const data = dataSource.getAnatomyData()[fiber.id];
  if (!data) return <AnatomyPlate fiber={fiber} />;

  const rows: DataRowItem[] = [
    { icon: Dna, label: "Diameter", value: data.diameter.raw },
    { icon: Layers, label: "Cross Section", value: data.crossSection },
    { icon: Microscope, label: "Surface", value: data.surfaceTexture },
    { icon: Scissors, label: "Staple Length", value: data.length.raw },
    { icon: Flame, label: "Tensile Strength", value: data.tensileStrength.raw },
    { icon: Droplets, label: "Moisture Regain", value: data.moistureRegain.raw },
  ];

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Dna}>Anatomy</SectionLabel>
      <StackedDataRowsExpanded rows={rows} accentHex={coolA} />

      {/* Contextual metadata footer */}
      <div className={`grid grid-cols-3 gap-[${sp.xs}] mt-[${sp.md}]`}>
        {[
          { label: "Scientific", value: fiber.profilePills.scientificName },
          { label: "Plant Part", value: fiber.profilePills.plantPart },
          { label: "Hand", value: fiber.profilePills.handFeel },
        ].map((item) => (
          <div key={item.label} className={`p-[${sp.sm}] rounded-lg bg-white/[0.03] border border-white/[0.05]`}>
            <span className={`tracking-[0.15em] uppercase ${T.tertiary} block mb-[clamp(1px,0.5cqi,3px)]`} style={{ fontSize: "clamp(7px, 2.2cqi, 9px)", fontWeight: 600 }}>{item.label}</span>
            <span className={`${T.primary} capitalize`} style={{ fontSize: "clamp(9px, 3cqi, 12px)", fontWeight: 500 }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CARE (Data — cool accent, expanded with full uses grid) ── */
function CareScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const data = dataSource.getCareData()[fiber.id];
  if (!data) return <CarePlate fiber={fiber} />;

  const rows: DataRowItem[] = [
    { icon: WashingMachine, label: "Wash Temperature", value: data.washTemp },
    { icon: Sun, label: "Drying Method", value: data.dryMethod },
    { icon: Thermometer, label: "Iron Temperature", value: data.ironTemp },
    { icon: ShieldCheck, label: "Special Notes", value: data.specialNotes },
  ];

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Shirt}>Care &amp; Use</SectionLabel>
      <StackedDataRowsExpanded rows={rows} accentHex={coolA} />

    </div>
  );
}

/* ── PROCESS (Discovery — expanded with all steps) ── */
function ProcessScreenPlate({ fiber }: { fiber: FiberProfile }) {
  const steps = dataSource.getProcessData()[fiber.id] ?? [];
  if (steps.length === 0) return null;
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Layers}>Process</SectionLabel>
      <div className={`flex-1 flex flex-col justify-center min-h-0`}>
        {steps.map((step, i) => (
          <div key={step.name} className={`flex gap-[${sp.md}] items-stretch ${i === 0 ? `pt-[${sp.md}]` : ""}`}>
            <div className="flex flex-col items-center flex-shrink-0 self-stretch">
              <div
                className={`rounded-full shrink-0 bg-[${neutA}]/10 border border-[${neutA}]/25 flex items-center justify-center`}
                style={{ width: "clamp(28px, 8cqi, 44px)", height: "clamp(28px, 8cqi, 44px)" }}
              >
                <span className={`text-[${neutA}]/70`} style={{ fontSize: "clamp(11px, 3.5cqi, 16px)", fontWeight: 700 }}>{i + 1}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 w-px min-h-[6px] bg-white/[${ink.ghost}]`} />}
            </div>
            <div
              className={`min-w-0 flex flex-col gap-[clamp(5px,1.2cqi,10px)] ${i < steps.length - 1 ? "pb-[clamp(28px,10cqi,48px)]" : ""}`}
            >
              <span className={`${T.primary} block`} style={{ fontSize: "clamp(13px, 4.5cqi, 19px)", fontWeight: 600, lineHeight: 1.3 }}>
                {step.name}
              </span>
              <span className={`${T.tertiary} block`} style={{ fontSize: "clamp(12px, 4cqi, 17px)", lineHeight: 1.55 }}>
                {step.detail}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScreenPlate;