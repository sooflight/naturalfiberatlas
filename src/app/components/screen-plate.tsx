/**
 * ScreenPlate — Fullscreen "double-inhale" detail view.
 *
 * Renders a scaled-up GlassCard in the same 3:4 aspect ratio as the
 * source DetailCard, morphing from the grid cell position to a centered,
 * viewport-fitted size. Uses the identical GlassCard shell so the
 * frosted-glass background, ambient image, bevel, grain, and orbiting
 * border are visually continuous with the detail plate the user clicked.
 *
 * Navigation: thumbnail index strip at the bottom for plate switching.
 * Arrow keys and swipe gestures also cycle plates.
 *
 * Layers: Grid → Inhale #1 (detail cards) → Inhale #2 (ScreenPlate) → Lightbox
 */

import { useEffect, useCallback, useState, useMemo, useRef, type ComponentType } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { FiberProfile, PlateType } from "../data/atlas-data";
import {
  RegionsPlate,
  WorldNamesPlate,
  SeeAlsoPlate,
  AnatomyPlate,
  CarePlate,
  ContactSheetPlate,
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
  Tag,
  Quote,
  Globe2,
  Link2,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { useSwipe } from "../hooks/use-swipe";
import { useImagePipeline } from "../context/image-pipeline";
import { useImageAnalysis } from "../hooks/use-image-brightness";
import { dataSource } from "../data/data-provider";
import type { GalleryImageEntry } from "../data/atlas-data";

/* ── Shared primitives ── */
import {
  SCREEN_PAD as pad,
  densityByPlate,
  plateLabelMap,
  ScreenSectionLabel as SectionLabel,
  screenBodyFs as bodyFs,
  screenHeroFs as heroFs,
  screenTagFs as tagFs,
  splitAboutText,
  StackedDataRowsExpanded,
  T, B, ink, accent, sp, plateIcon,
  type DataRowItem,
} from "./plate-primitives";

const warmA = accent.warm;
const coolA = accent.cool;
const neutA = accent.neutral;

/** Icon per plate type for thumbnail strip */
const PLATE_ICON_MAP: Partial<Record<PlateType, ComponentType<{ size?: number; className?: string }>>> = {
  about: Layers,
  insight1: Sparkles,
  insight2: Sparkles,
  insight3: Sparkles,
  quote: Quote,
  trade: DollarSign,
  worldNames: Globe2,
  regions: MapPin,
  process: Layers,
  anatomy: Dna,
  care: Shirt,
  seeAlso: Link2,
  contactSheet: ImageIcon,
};

/** A plate available for arrow-key cycling */
export interface ScreenPlateEntry {
  plateType: PlateType;
  cellIndex: number;
}

interface ScreenPlateProps {
  fiber: FiberProfile;
  /** The initially-selected plate */
  initialPlateType: PlateType;
  /** Ordered list of all navigable plates for this fiber (storytelling order) */
  plates: ScreenPlateEntry[];
  /** Bounding rect of the source grid cell — morph origin */
  sourceRect: DOMRect;
  /** Lookup from cellIndex → DOMRect for exit-morph when cycling */
  getCellRect: (cellIndex: number) => DOMRect | null;
  galleryImages?: GalleryImageEntry[];
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

const SLIDE_TRANSITION = {
  duration: 0.38,
  ease: [0.25, 1, 0.5, 1] as unknown as import("framer-motion").Easing,
};

export function ScreenPlate({
  fiber,
  initialPlateType,
  plates,
  sourceRect,
  getCellRect,
  galleryImages = [],
  onOpenLightbox,
  onClose,
  onSelectFiber,
}: ScreenPlateProps) {
  const pipeline = useImagePipeline();

  /* ── Hue-tinted static frost ── */
  const glowUrl = pipeline.transform(fiber.image, "glow");
  const imageAnalysis = useImageAnalysis(glowUrl);
  const frostFill = useMemo(() => {
    if (!imageAnalysis) return "rgba(18, 18, 18, 0.82)";
    const h = Math.round(imageAnalysis.hue);
    return `hsla(${h}, 18%, 13%, 0.78)`;
  }, [imageAnalysis]);

  const initialIndex = useMemo(() => {
    const idx = plates.findIndex((p) => p.plateType === initialPlateType);
    return idx >= 0 ? idx : 0;
  }, [plates, initialPlateType]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [navDirection, setNavDirection] = useState(0);
  const [entered, setEntered] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  /* ── Track exit state ── */
  const isExitingRef = useRef(false);

  useEffect(() => {
    return () => {
      isExitingRef.current = true;
    };
  }, []);

  const current = plates[currentIndex] ?? plates[0];
  const contentDensity = densityByPlate[current.plateType] ?? 0;
  const plateLabel = plateLabelMap[current.plateType] ?? current.plateType;

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

  const handleAnimationComplete = useCallback(() => {
    if (isExitingRef.current) return;
    setEntered(true);
    setIsMorphing(false);
  }, []);

  /* ── Navigation ── */
  const goNext = useCallback(() => {
    if (plates.length <= 1) return;
    setNavDirection(1);
    setCurrentIndex((i) => (i + 1) % plates.length);
  }, [plates.length]);

  const goPrev = useCallback(() => {
    if (plates.length <= 1) return;
    setNavDirection(-1);
    setCurrentIndex((i) => (i - 1 + plates.length) % plates.length);
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
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, goNext, goPrev, onClose]);

  /* ── Swipe gestures (left/right to navigate plates) ── */
  const { handlers: swipeHandlers, dragOffset } = useSwipe({
    threshold: 50,
    velocityThreshold: 0.4,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    disabled: plates.length <= 1,
  });

  /* ── Layout measurements ── */
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = vw < 640;

  const target = useMemo(() => {
    const p = isMobile ? 12 : 40;
    const availW = vw - p * 2;
    const availH = vh - p * 2;
    let w = availH * 0.75;
    let h = availH;
    if (w > availW) {
      w = availW;
      h = availW * (4 / 3);
    }
    return { width: w, height: h, left: (vw - w) / 2, top: (vh - h) / 2 };
  }, [vw, vh, isMobile]);

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
  const renderContent = (pt: PlateType) => {
    switch (pt) {
      case "about": return <AboutScreenPlate fiber={fiber} />;
      case "insight1": return <InsightScreenPlate fiber={fiber} half={1} />;
      case "insight2": return <InsightScreenPlate fiber={fiber} half={2} />;
      case "insight3": return <InsightScreenPlate fiber={fiber} half={3} />;
      case "quote": return <QuoteScreenPlate fiber={fiber} />;
      case "trade": return <TradeScreenPlate fiber={fiber} />;
      case "worldNames": return <WorldNamesPlate fiber={fiber} />;
      case "regions": return <RegionsPlate fiber={fiber} />;
      case "process": return <ProcessScreenPlate fiber={fiber} />;
      case "anatomy": return <AnatomyScreenPlate fiber={fiber} />;
      case "care": return <CareScreenPlate fiber={fiber} />;
      case "seeAlso": return <SeeAlsoPlate fiber={fiber} onSelect={onSelectFiber} />;
      case "contactSheet":
        return (
          <ContactSheetPlate
            images={galleryImages}
            fiberName={fiber.name}
            onOpenAt={(imgIndex, sourceRect) => onOpenLightbox?.(imgIndex, sourceRect)}
          />
        );
      default: return null;
    }
  };

  const canNavigate = plates.length > 1;
  const canCycle = canNavigate && entered;
  const showThumbStrip = canNavigate; // Show immediately; no need to wait for morph

  return (
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
      {...swipeHandlers}
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

      {/* ── Center: Morphing main card ── */}
      <motion.div
        className={`absolute z-[92] rounded-3xl overflow-hidden screen-plate-morph${
          isMorphing ? ' is-morphing' : entered ? ' morph-settled' : ''
        }`}
        style={{
          width: target.width, height: target.height, left: target.left, top: target.top,
          transformOrigin: "0 0", touchAction: "pan-y",
          ["--frost-fill" as any]: frostFill,
        }}
        initial={{ x: enterDx, y: enterDy, scale: enterScale }}
        animate={{ x: 0, y: 0, scale: 1 }}
        exit={{ x: exitDx, y: exitDy, scale: exitScale }}
        transition={MORPH_SPRING}
        onAnimationComplete={handleAnimationComplete}
      >
        <div
          className="w-full h-full"
          style={{
            containerType: "inline-size",
            transform: dragOffset ? `translateX(${dragOffset}px)` : undefined,
            transition: dragOffset ? "none" : "transform 0.3s cubic-bezier(0.25,1,0.5,1)",
          }}
        >
          <GlassCard isHoverable={false} ambientImage={fiber.image} contentDensity={contentDensity}>
            <AnimatePresence mode="wait" initial={false} custom={navDirection}>
              <motion.div
                key={current.plateType}
                className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar"
                initial={{ opacity: 0, x: navDirection * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -navDirection * 30 }}
                transition={SLIDE_TRANSITION}
              >
                {renderContent(current.plateType)}
              </motion.div>
            </AnimatePresence>
          </GlassCard>
        </div>
      </motion.div>

      {/* ── Thumbnail index strip at bottom ── */}
      {showThumbStrip && (
        <div
          data-testid="screen-plate-thumb-strip"
          className="fixed z-[93] left-0 right-0 flex justify-center px-4 pt-3"
          style={{
            bottom: 0,
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)",
          }}
        >
          <div
            className="flex gap-2 overflow-x-auto scrollbar-none py-1"
            style={{
              maxWidth: "min(100%, 520px)",
              scrollSnapType: "x proximity",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {plates.map((p, i) => {
              const Icon = PLATE_ICON_MAP[p.plateType];
              const isActive = i === currentIndex;
              const label = p.plateType === "contactSheet" ? "Gallery" : (plateLabelMap[p.plateType] ?? p.plateType);
              return (
                <button
                  key={p.plateType}
                  type="button"
                  onClick={() => {
                    setNavDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  aria-label={`Open ${label} plate`}
                  aria-current={isActive ? "true" : undefined}
                  className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group transition-all duration-200 rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  style={{
                    scrollSnapAlign: "start",
                    width: 56,
                  }}
                >
                  <div
                    className={`relative w-full rounded-lg overflow-hidden transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-white/60 ring-offset-2 ring-offset-black/80 scale-105"
                        : "opacity-70 hover:opacity-90 hover:scale-[1.02]"
                    }`}
                    style={{ aspectRatio: "3/4" }}
                  >
                    <img
                      src={glowUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: "blur(20px) saturate(1.2) brightness(0.4)" }}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
                    >
                      {Icon && <Icon size={18} className="text-white/90" />}
                    </div>
                  </div>
                  <span
                    className={`text-center truncate w-full transition-colors ${
                      isActive ? "text-white/90" : "text-white/50 group-hover:text-white/70"
                    }`}
                    style={{ fontSize: "9px", fontWeight: 500, letterSpacing: "0.05em" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════
   Expanded plate variants (ScreenPlate-specific)
   Use screen-scale typography from plate-primitives.
   ══════════════════════════════════════════════════════════ */

/* ── ABOUT (Editorial — warm accent, expanded) ── */
function AboutScreenPlate({ fiber }: { fiber: FiberProfile }) {
  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <SectionLabel icon={Layers} iconColor={plateIcon.editorial}>About</SectionLabel>

      {/* Accent divider */}
      <div className={`w-[${sp.xl}] h-px bg-[${warmA}]/50 mb-[${sp.md}]`} />

      <h3 className={`${T.primary} uppercase tracking-[0.06em] mb-[2px]`} style={heroFs}>{fiber.name}</h3>
      <p className={`text-[${warmA}]/70 mb-[${sp.md}]`} style={{ fontSize: "clamp(10px, 3.2cqi, 14px)", fontWeight: 500 }}>{fiber.subtitle}</p>

      {/* Body text — unclamped for expanded view */}
      <div className="flex-1 min-w-0 min-h-0">
        <p className={`${T.secondary} detail-prose`} style={{ ...bodyFs, letterSpacing: "0.01em" }}>{fiber.about}</p>
      </div>

      <div className={`flex flex-wrap gap-[${sp.xs}] mt-[${sp.md}]`}>
        {fiber.tags.map((tag) => (
          <span key={tag} className={`px-[clamp(6px,2cqi,10px)] py-[clamp(2px,0.6cqi,4px)] rounded-full border ${B.ghost} ${T.tertiary}`} style={tagFs}>{tag}</span>
        ))}
      </div>
      <div className={`grid grid-cols-2 gap-[${sp.xs}] mt-[${sp.md}]`}>
        {[
          { label: "Category", value: fiber.category },
          { label: "Origin", value: fiber.profilePills.origin },
          { label: "Plant Part", value: fiber.profilePills.plantPart },
          { label: "Era", value: fiber.profilePills.era },
          { label: "Hand", value: fiber.profilePills.handFeel },
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

/* ── INSIGHT (Editorial — warm accent, expanded) ── */
function InsightScreenPlate({ fiber, half }: { fiber: FiberProfile; half: 1 | 2 | 3 }) {
  const parts = splitAboutText(fiber.about, 3);
  const text = parts[half - 1];

  return (
    <div className={`h-full flex flex-col ${pad}`}>
      <span className={`text-[${warmA}]/20 shrink-0`} style={{ fontSize: "clamp(28px, 12cqi, 48px)", lineHeight: 0.7 }}>◈</span>

      <div className={`flex-1 min-h-0 flex flex-col justify-center gap-[${sp.md}] pt-[${sp.sm}]`}>
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
      <SectionLabel icon={DollarSign} iconColor={plateIcon.trade}>Source &amp; Trade</SectionLabel>
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
      <SectionLabel icon={Dna} iconColor={plateIcon.anatomy}>Anatomy</SectionLabel>
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
      <SectionLabel icon={Shirt} iconColor={plateIcon.care}>Care &amp; Use</SectionLabel>
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
      <div className={`flex-1 flex flex-col justify-center gap-[${sp.sm}]`}>
        {steps.map((step, i) => (
          <div key={step.name} className={`flex gap-[${sp.md}]`}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-[${sp.xl}] h-[${sp.xl}] rounded-full bg-[${neutA}]/10 border border-[${neutA}]/25 flex items-center justify-center`}>
                <span className={`text-[${neutA}]/70`} style={{ fontSize: "clamp(10px, 3cqi, 14px)", fontWeight: 700 }}>{i + 1}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 w-px bg-white/[${ink.ghost}] my-[clamp(2px,0.8cqi,6px)]`} />}
            </div>
            <div className={`pb-[${sp.sm}]`}>
              <span className={`${T.primary} block`} style={{ fontSize: "clamp(12px, 4cqi, 16px)", fontWeight: 600 }}>{step.name}</span>
              <span className={`${T.tertiary} block`} style={{ fontSize: "clamp(11px, 3.5cqi, 14px)", lineHeight: 1.5 }}>{step.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScreenPlate;