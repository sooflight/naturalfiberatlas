/**
 * MobileDetailView — Gesture-native mobile detail experience.
 *
 * Replaces the desktop grid-based plate layout on small screens (cols <= 2)
 * with a full-screen, vertically-scrollable single-column stack.
 *
 * Features:
 *  - Scroll-snap sections for each plate ("chapter" feel)
 *  - Full-width hero image banner with fiber identity
 *  - Each plate in a frosted-glass card (flexible height, not 3:4)
 *  - Contact sheet as horizontal scrollable image rail
 *  - Swipe-right-to-dismiss via useSwipe
 *  - Plate indicator dots on the right edge (auto-tracking scroll position)
 *  - Slide-up entry / slide-down exit animation via Motion
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  type FiberProfile,
  type PlateType,
  type GalleryImageEntry,
  mergeFiberGalleryWithFallback,
} from "../data/atlas-data";
import { useSwipe } from "../hooks/use-swipe";
import { useImagePipeline } from "../context/image-pipeline";
import { ProgressiveImage } from "./progressive-image";
import { getAvailablePlates } from "./plate-availability";
import {
  AboutPlate,
  PropertiesPlate,
  InsightPlate,
  SilkVariantPlate,
  RegionsPlate,
  TradePlate,
  WorldNamesPlate,
  SeeAlsoPlate,
  QuotePlate,
  ProcessPlate,
  AnatomyPlate,
  CarePlate,
  YouTubeEmbedPlate,
} from "./detail-plates";
import {
  plateLabelMap,
} from "./plate-primitives";
import {
  X,
  ChevronDown,
  Layers,
} from "lucide-react";

/* ── Animation constants ── */
const SLIDE_DURATION = 0.42;
const SLIDE_EASE = [0.25, 1, 0.5, 1] as unknown as import("framer-motion").Easing;
const DISMISS_THRESHOLD = 80;

/* ── Stagger cascade timing ── */
const STAGGER_OFFSET = 0.09;   // seconds between each plate
const STAGGER_CAP = 0.45;      // max delay so deep plates don't wait forever
const CASCADE_DURATION = 0.55;  // individual plate reveal duration
const CASCADE_EASE = [0.25, 1, 0.5, 1] as unknown as import("framer-motion").Easing;
const CASCADE_DISTANCE = 28;    // px vertical travel

/* ═══════════════════════════════════════════════════════════════════
   useCascadeReveal — Wave-aware stagger for IntersectionObserver.
   Plates entering the viewport within WAVE_WINDOW ms of each other
   are grouped into the same "wave" and receive staggered delays.
   Solo plates entering after a gap animate instantly (delay = 0).
   ═══════════════════════════════════════════════════════════════════ */
const WAVE_WINDOW = 250; // ms — entries within this window share a wave

interface CascadeEntry {
  revealed: boolean;
  delay: number;
}

function useCascadeReveal(
  count: number,
  scrollRoot: React.RefObject<HTMLElement | null>,
) {
  const [entries, setEntries] = useState<CascadeEntry[]>(() =>
    Array.from({ length: count }, () => ({ revealed: false, delay: 0 })),
  );
  const elemsRef = useRef<Map<number, HTMLElement>>(new Map());
  const waveRef = useRef<{ startTime: number; count: number }>({
    startTime: 0,
    count: 0,
  });
  const revealedRef = useRef<Set<number>>(new Set());

  /* Register an element for observation */
  const setRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      if (el) elemsRef.current.set(index, el);
      else elemsRef.current.delete(index);
    },
    [],
  );

  useEffect(() => {
    const root = scrollRoot.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (ioEntries) => {
        const now = performance.now();
        const newReveals: { index: number; wavePos: number }[] = [];

        for (const ioEntry of ioEntries) {
          if (!ioEntry.isIntersecting) continue;
          // Find which index this element belongs to
          let idx = -1;
          elemsRef.current.forEach((el, i) => {
            if (el === ioEntry.target) idx = i;
          });
          if (idx === -1 || revealedRef.current.has(idx)) continue;

          revealedRef.current.add(idx);
          observer.unobserve(ioEntry.target);

          // Wave grouping: if this entry is within WAVE_WINDOW of the
          // current wave start, it joins the wave; otherwise, new wave.
          if (now - waveRef.current.startTime > WAVE_WINDOW) {
            waveRef.current = { startTime: now, count: 0 };
          }
          const wavePos = waveRef.current.count;
          waveRef.current.count += 1;

          newReveals.push({ index: idx, wavePos });
        }

        if (newReveals.length > 0) {
          setEntries((prev) => {
            const next = [...prev];
            for (const { index, wavePos } of newReveals) {
              next[index] = {
                revealed: true,
                delay: Math.min(wavePos * STAGGER_OFFSET, STAGGER_CAP),
              };
            }
            return next;
          });
        }
      },
      {
        root,
        rootMargin: "0px 0px 60px 0px", // trigger slightly early
        threshold: 0.12,
      },
    );

    elemsRef.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [count, scrollRoot]);

  return { entries, setRef };
}

/** Plates that should NOT trigger the ScreenPlate on click (matches detail-card.tsx). */
const NON_SCREEN_PLATES: PlateType[] = ["contactSheet", "seeAlso", "youtubeEmbed"];

interface MobileDetailViewProps {
  fiber: FiberProfile;
  onClose: () => void;
  onSelectFiber: (id: string) => void;
  onOpenLightbox: (imageIndex?: number, sourceRect?: DOMRect) => void;
  /** Callback to open the fullscreen ScreenPlate view (same as desktop) */
  onOpenScreenPlate?: (plateType: PlateType, sourceRect: DOMRect) => void;
}

export function MobileDetailView({
  fiber,
  onClose,
  onSelectFiber,
  onOpenLightbox,
  onOpenScreenPlate,
}: MobileDetailViewProps) {
  const pipeline = useImagePipeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
  const [activePlate, setActivePlate] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  /* ── Available plates for this fiber ── */
  const plates = useMemo(() => getAvailablePlates(fiber), [fiber]);

  /* ── Gallery images ── */
  const galleryImages = useMemo(
    () => mergeFiberGalleryWithFallback(fiber.id, fiber),
    [fiber],
  );
  const hasGallery = galleryImages.length > 0;

  /* ── Cascade reveal — wave-aware stagger ── */
  const cascadeCount = plates.length + (hasGallery ? 1 : 0);
  const { entries: cascadeEntries, setRef: setCascadeRef } = useCascadeReveal(
    cascadeCount,
    scrollRef,
  );

  /* ── Swipe-right-to-dismiss ── */
  const { handlers: swipeHandlers, dragOffset } = useSwipe({
    threshold: DISMISS_THRESHOLD,
    onSwipeRight: () => {
      setIsDismissing(true);
      setTimeout(onClose, 300);
    },
  });

  /* ── Scroll tracking for active plate indicator ── */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let prevClosest = 0;
    let hasMounted = false;

    const onScroll = () => {
      const scrollTop = container.scrollTop;
      const viewportH = container.clientHeight;
      const center = scrollTop + viewportH * 0.4;

      let closest = 0;
      let minDist = Infinity;

      // Index 0 is the hero section
      sectionRefs.current.forEach((el, index) => {
        const dist = Math.abs(el.offsetTop - center);
        if (dist < minDist) {
          minDist = dist;
          closest = index;
        }
      });

      if (closest !== prevClosest) {
        // Haptic pulse on snap boundary — skip initial mount
        if (hasMounted && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(8);
        }
        prevClosest = closest;
      }
      hasMounted = true;

      setActivePlate(closest);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Scroll to plate on dot click ── */
  const scrollToPlate = useCallback((index: number) => {
    const el = sectionRefs.current.get(index);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* ── Escape to close ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ── Lock body scroll ── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── Plate renderer ── */
  const renderPlate = (plateType: PlateType, youtubeEmbedSlot = 0) => {
    switch (plateType) {
      case "about":
        return <AboutPlate fiber={fiber} />;
      case "properties":
        return <PropertiesPlate fiber={fiber} />;
      case "insight1":
        return <InsightPlate fiber={fiber} half={1} />;
      case "insight2":
        return <InsightPlate fiber={fiber} half={2} />;
      case "insight3":
        return <InsightPlate fiber={fiber} half={3} />;
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza":
        return <SilkVariantPlate plateType={plateType} />;
      case "quote":
        return <QuotePlate fiber={fiber} />;
      case "youtubeEmbed":
        return <YouTubeEmbedPlate fiber={fiber} slotIndex={youtubeEmbedSlot} />;
      case "trade":
        return <TradePlate fiber={fiber} />;
      case "regions":
        return <RegionsPlate fiber={fiber} />;
      case "worldNames":
        return <WorldNamesPlate fiber={fiber} />;
      case "process":
        return <ProcessPlate fiber={fiber} />;
      case "anatomy":
        return <AnatomyPlate fiber={fiber} />;
      case "care":
        return <CarePlate fiber={fiber} />;
      case "seeAlso":
        return <SeeAlsoPlate fiber={fiber} onSelect={onSelectFiber} />;
      default:
        return null;
    }
  };

  // Total sections = hero + plates + gallery (if present)
  const totalSections = 1 + plates.length + (hasGallery ? 1 : 0);
  const youtubePlateCount = plates.filter((p) => p === "youtubeEmbed").length;
  const dotLabels = [
    "Hero",
    ...plates.map((p, i) => {
      if (p !== "youtubeEmbed") return plateLabelMap[p] ?? p;
      const slot = plates.slice(0, i).filter((x) => x === "youtubeEmbed").length;
      return youtubePlateCount > 1 ? `Video ${slot + 1}` : plateLabelMap.youtubeEmbed ?? p;
    }),
    ...(hasGallery ? ["Gallery"] : []),
  ];

  return (
    <AnimatePresence>
      {!isDismissing && (
        <motion.div
          className="fixed inset-0 z-[60]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Main scrollable container */}
          <motion.div
            className="absolute inset-0 mobile-detail-scroll"
            ref={scrollRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: SLIDE_DURATION, ease: SLIDE_EASE }}
            style={{
              x: dragOffset,
              opacity: isDismissing ? 0 : 1,
              overflowY: "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              scrollSnapType: "y proximity",
            }}
            {...swipeHandlers}
          >
            {/* ═══ Hero Section ═══ */}
            <section
              className="mobile-detail-snap relative"
              style={{
                minHeight: "85vh",
                scrollSnapAlign: "start",
              }}
              ref={(el) => { if (el) sectionRefs.current.set(0, el); }}
            >
              {/* Hero image */}
              <div className="absolute inset-0">
                <ProgressiveImage
                  src={fiber.image}
                  preset="detail"
                  alt={fiber.name}
                  className="absolute inset-0 w-full h-full"
                />
                {/* Gradient overlay for text legibility */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.15) 100%)",
                  }}
                />
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white/90 transition-colors cursor-pointer"
                style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
                aria-label="Close"
              >
                <X size={16} />
              </button>

              {/* Hero content — bottom aligned */}
              <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 z-10">
                {/* Category badge */}
                <motion.span
                  className="inline-block px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-white/50 uppercase tracking-[0.15em] mb-3"
                  style={{ fontSize: "9px", fontWeight: 600 }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: CASCADE_EASE, delay: SLIDE_DURATION + 0.05 }}
                >
                  {fiber.category}
                </motion.span>

                {/* Fiber name */}
                <motion.h2
                  className="text-white/90 tracking-[0.02em] mb-1"
                  style={{
                    fontSize: "clamp(24px, 7vw, 36px)",
                    fontWeight: 300,
                    lineHeight: 1.15,
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: CASCADE_EASE, delay: SLIDE_DURATION + 0.12 }}
                >
                  {fiber.name}
                </motion.h2>

                {/* Subtitle */}
                <motion.p
                  className="text-white/40 mb-4"
                  style={{
                    fontSize: "clamp(12px, 3.5vw, 15px)",
                    lineHeight: 1.4,
                    maxWidth: "35ch",
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: CASCADE_EASE, delay: SLIDE_DURATION + 0.2 }}
                >
                  {fiber.subtitle}
                </motion.p>

                {/* Scroll affordance */}
                <motion.div
                  className="flex items-center gap-2 text-white/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: SLIDE_DURATION + 0.4 }}
                >
                  <ChevronDown size={14} className="animate-bounce" />
                  <span
                    className="uppercase tracking-[0.2em]"
                    style={{ fontSize: "9px", fontWeight: 500 }}
                  >
                    Scroll to explore
                  </span>
                </motion.div>
              </div>
            </section>

            {/* ═══ Plate Sections ═══ */}
            {plates.map((plateType, i) => {
              const sectionIndex = i + 1; // hero is 0
              const cascade = cascadeEntries[i];
              const canScreen = !NON_SCREEN_PLATES.includes(plateType) && onOpenScreenPlate;
              const youtubeEmbedSlot =
                plateType === "youtubeEmbed"
                  ? plates.slice(0, i).filter((p) => p === "youtubeEmbed").length
                  : 0;

              const openScreenPlateFromRect = (e: React.MouseEvent<HTMLElement> | { currentTarget: HTMLElement }) => {
                if (!canScreen) return;
                const target = e.currentTarget;
                onOpenScreenPlate(plateType, target.getBoundingClientRect());
              };

              return (
                <section
                  key={`${plateType}-${i}`}
                  className="mobile-detail-snap px-3"
                  style={{
                    minHeight: plateType === "seeAlso" ? "40vh" : "70vh",
                    scrollSnapAlign: "start",
                    paddingTop: "clamp(12px, 3vw, 20px)",
                    paddingBottom: "clamp(12px, 3vw, 20px)",
                    containerType: "inline-size",
                  }}
                  ref={(el) => { if (el) sectionRefs.current.set(sectionIndex, el); }}
                >
                  <motion.div
                    ref={setCascadeRef(i)}
                    className="rounded-xl overflow-hidden relative"
                    initial={{ opacity: 0, y: CASCADE_DISTANCE }}
                    animate={cascade?.revealed
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: CASCADE_DISTANCE }
                    }
                    transition={{
                      duration: CASCADE_DURATION,
                      ease: CASCADE_EASE,
                      delay: cascade?.delay ?? 0,
                    }}
                    style={{
                      background: "rgba(18, 18, 18, 0.65)",
                      backdropFilter: "blur(12px) saturate(0.9)",
                      WebkitBackdropFilter: "blur(12px) saturate(0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      minHeight: plateType === "seeAlso" ? "auto" : "min(60vh, 400px)",
                      cursor: canScreen ? "pointer" : undefined,
                    }}
                    onClick={canScreen ? (e) => {
                      if ((e.target as HTMLElement).closest?.("a, button")) return;
                      openScreenPlateFromRect(e);
                    } : undefined}
                    role={canScreen ? "button" : undefined}
                    tabIndex={canScreen ? 0 : undefined}
                    onKeyDown={canScreen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openScreenPlateFromRect(e.currentTarget as HTMLElement); } } : undefined}
                    aria-label={canScreen ? `Open ${plateLabelMap[plateType] ?? plateType} in fullscreen` : undefined}
                  >
                    {/* Ambient image underlayer */}
                    <div
                      className="absolute inset-0 opacity-[0.12] pointer-events-none"
                      style={{ overflow: "hidden", borderRadius: "inherit" }}
                    >
                      <img
                        src={pipeline.transform(fiber.image, "glow")}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        className="w-full h-full object-cover"
                        style={{ filter: "blur(30px) saturate(1.2) brightness(0.5)" }}
                      />
                    </div>

                    {/* Plate content */}
                    <div className="relative z-10">
                      {renderPlate(plateType, youtubeEmbedSlot)}
                    </div>
                  </motion.div>
                </section>
              );
            })}

            {/* ═══ Gallery Rail Section ═══ */}
            {hasGallery && (() => {
              const galleryCascadeIdx = plates.length;
              const galleryCascade = cascadeEntries[galleryCascadeIdx];
              return (
                <section
                  className="mobile-detail-snap px-3"
                  style={{
                    minHeight: "50vh",
                    scrollSnapAlign: "start",
                    paddingTop: "clamp(12px, 3vw, 20px)",
                    paddingBottom: "clamp(12px, 3vw, 20px)",
                  }}
                  ref={(el) => { if (el) sectionRefs.current.set(1 + plates.length, el); }}
                >
                  <motion.div
                    ref={setCascadeRef(galleryCascadeIdx)}
                    initial={{ opacity: 0, y: CASCADE_DISTANCE }}
                    animate={galleryCascade?.revealed
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: CASCADE_DISTANCE }
                    }
                    transition={{
                      duration: CASCADE_DURATION,
                      ease: CASCADE_EASE,
                      delay: galleryCascade?.delay ?? 0,
                    }}
                  >
                    <GalleryRail
                      images={galleryImages}
                      fiberName={fiber.name}
                      onOpenLightbox={onOpenLightbox}
                    />
                  </motion.div>
                </section>
              );
            })()}

            {/* Bottom safe area spacer */}
            <div style={{ height: "max(3rem, env(safe-area-inset-bottom, 0px))" }} />
          </motion.div>

          {/* ═══ Plate Indicator Dots ═══ */}
          <div
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[61] flex flex-col items-end gap-[2px] pointer-events-auto"
            style={{
              opacity: dragOffset !== 0 ? 0 : 1,
              transition: "opacity 0.2s",
              paddingRight: 4,
            }}
          >
            {Array.from({ length: totalSections }).map((_, i) => {
              const isActive = i === activePlate;
              return (
                <button
                  key={i}
                  onClick={() => scrollToPlate(i)}
                  className="relative flex items-center justify-end cursor-pointer"
                  aria-label={`Go to ${dotLabels[i]}`}
                  style={{ minWidth: 36, minHeight: 28 }}
                >
                  {/* Active label — always visible for the current plate */}
                  <span
                    className="whitespace-nowrap px-1.5 py-0.5 rounded transition-all duration-300"
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase" as const,
                      fontWeight: 600,
                      color: isActive ? "rgba(255,255,255,0.50)" : "rgba(255,255,255,0)",
                      marginRight: 6,
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "translateX(0)" : "translateX(4px)",
                    }}
                  >
                    {dotLabels[i]}
                  </span>
                  {/* Dot */}
                  <span
                    className="block rounded-full transition-all duration-300 flex-shrink-0"
                    style={{
                      width: isActive ? 7 : 4,
                      height: isActive ? 7 : 4,
                      backgroundColor: isActive
                        ? "rgba(255, 255, 255, 0.55)"
                        : "rgba(255, 255, 255, 0.12)",
                      boxShadow: isActive ? "0 0 6px rgba(255,255,255,0.2)" : "none",
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* ═══ Swipe Dismiss Indicator ═══ */}
          {dragOffset > 20 && (
            <div
              className="fixed left-3 top-1/2 -translate-y-1/2 z-[61] flex items-center gap-1.5 text-white/30"
              style={{
                opacity: Math.min(1, (dragOffset - 20) / 60),
                transition: "opacity 0.1s",
              }}
            >
              <span
                className="uppercase tracking-[0.15em]"
                style={{ fontSize: "9px", fontWeight: 500 }}
              >
                Release to close
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
/* ═══════════════════════════════════════════════════════════════════
   GalleryRail — Horizontal scrollable image rail for mobile.
   Replaces the desktop contact-sheet grid with larger, swipeable
   thumbnails at full card width.
   ═══════════════════════════════════════════════════════════════════ */

interface GalleryRailProps {
  images: GalleryImageEntry[];
  fiberName: string;
  onOpenLightbox: (imageIndex?: number, sourceRect?: DOMRect) => void;
}

function GalleryRail({ images, fiberName, onOpenLightbox }: GalleryRailProps) {
  const pipeline = useImagePipeline();
  const railRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(18, 18, 18, 0.65)",
        backdropFilter: "blur(12px) saturate(0.9)",
        WebkitBackdropFilter: "blur(12px) saturate(0.9)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Section label */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <Layers size={12} className="text-white/25" />
        <span
          className="text-white/40 uppercase tracking-[0.15em]"
          style={{ fontSize: "10px", fontWeight: 600 }}
        >
          Gallery
        </span>
        <span
          className="text-white/20 ml-auto"
          style={{ fontSize: "10px" }}
        >
          {images.length} images
        </span>
      </div>

      {/* Horizontal rail */}
      <div
        ref={railRef}
        className="flex gap-2.5 overflow-x-auto px-4 pb-4 scrollbar-none"
        style={{
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {images.map((img, i) => (
          <button
            key={`${img.url}-${i}`}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onOpenLightbox(i, rect);
            }}
            className="flex-shrink-0 relative overflow-hidden rounded-lg cursor-pointer group"
            style={{
              width: "clamp(200px, 55vw, 280px)",
              aspectRatio: img.orientation === "portrait" ? "3/4" : "4/3",
              scrollSnapAlign: "start",
            }}
          >
            <img
              src={pipeline.transform(img.url, "filmstrip")}
              alt={img.title || `${fiberName} gallery ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {/* Title chip */}
            {img.title && (
              <div
                className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
                style={{
                  background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                }}
              >
                <span
                  className="text-white/60"
                  style={{ fontSize: "10px", lineHeight: 1.3 }}
                >
                  {img.title}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
