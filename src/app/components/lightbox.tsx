import type { GalleryImageEntry } from "../data/atlas-data";
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";
import { useImagePipeline } from "../context/image-pipeline";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxProps {
  images: GalleryImageEntry[];
  initialIndex?: number;
  fiberName: string;
  onClose: () => void;
  /** Source thumbnail rect for FLIP zoom-to-origin morph */
  sourceRect?: DOMRect | null;
}

/* ── Timing constants ── */
const SLIDESHOW_INTERVAL = 8000;
const CROSSFADE_DURATION = 1.2;
const BACKDROP_DURATION = 0.5;
const TITLE_FADE = 0.4;
const MORPH_DURATION = 0.55;
const IMAGE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ── Swipe-to-dismiss thresholds ── */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 500;
const RUBBER_BAND = 0.45;

/* ── Filmstrip constants ── */
const FILMSTRIP_HEIGHT = 48;

function getLightboxPrefetchNeighbors(
  current: number,
  total: number,
): number[] {
  if (total <= 1 || typeof navigator === "undefined") return [];
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const saveData = nav.connection?.saveData;
  const effectiveType = nav.connection?.effectiveType ?? "";
  if (saveData || /(^2g$|slow-2g)/.test(effectiveType)) return [];
  if (effectiveType === "3g") {
    return [(current + 1) % total];
  }
  return [
    (current + 1) % total,
    (current - 1 + total) % total,
  ];
}

/* ═══════════════════════════════════════════════════════════════════
   LightboxSlide — isolated per-slide load state
   Each AnimatePresence key gets its own instance, so the outgoing
   slide's LQIP doesn't interfere with the incoming slide's hi-res.
   ═══════════════════════════════════════════════════════════════════ */
interface SlideProps {
  targetSrc: string | undefined;
  lqipSrc: string | undefined;
  alt: string;
  isInMorph: boolean;
  heroStyle?: React.CSSProperties;
  heroRef?: React.Ref<HTMLDivElement>;
}

function LightboxSlide({ targetSrc, lqipSrc, alt, isInMorph, heroStyle, heroRef }: SlideProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(() => {
    if (!targetSrc) return null;
    const probe = new Image();
    probe.src = targetSrc;
    if (!probe.complete || probe.naturalWidth <= 0 || probe.naturalHeight <= 0) return null;
    return { width: probe.naturalWidth, height: probe.naturalHeight };
  });
  const [loaded, setLoaded] = useState(() => {
    // Eagerly check if the browser already has this image decoded
    // (handles prefetch hits where onLoad fires before first effect)
    if (!targetSrc) return false;
    const probe = new Image();
    probe.src = targetSrc;
    return probe.complete && probe.naturalWidth > 0;
  });
  const imgRef = useRef<HTMLImageElement>(null);

  /* Secondary check after DOM mount — catches images that were
     already complete by the time React committed the <img> element */
  useEffect(() => {
    if (loaded) return;
    if (!targetSrc) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      if (el.naturalHeight > 0) {
        setNaturalSize({ width: el.naturalWidth, height: el.naturalHeight });
      }
      setLoaded(true);
    }
  }, [targetSrc, loaded]);

  return (
    <div
      ref={heroRef}
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        borderRadius: isInMorph ? undefined : 16,
        transition: isInMorph
          ? `all ${MORPH_DURATION}s cubic-bezier(0.16, 1, 0.3, 1)`
          : undefined,
        ...heroStyle,
      }}
    >
      {/* LQIP placeholder — visible until hi-res loads */}
      {!loaded && lqipSrc && (
        <img
          src={lqipSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            filter: "blur(20px)",
            transform: "scale(1.1)",
            borderRadius: "inherit",
          }}
          draggable={false}
        />
      )}

      {/* Hi-res image — naturally sized for real rounded corners */}
      <img
        ref={imgRef}
        src={targetSrc}
        alt={alt}
        className="pointer-events-none"
        style={{
          maxWidth: isInMorph ? "100%" : "calc(100vw - 4rem)",
          maxHeight: isInMorph ? "100%" : "calc(100vh - 12rem)",
          width: isInMorph ? "100%" : (naturalSize ? `${naturalSize.width}px` : undefined),
          height: isInMorph ? "100%" : (naturalSize ? `${naturalSize.height}px` : undefined),
          objectFit: "contain",
          borderRadius: "inherit",
          filter: "brightness(0.92) contrast(1.05)",
          userSelect: "none",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        draggable={false}
        onLoad={(event) => {
          const imageEl = event.currentTarget;
          if (imageEl.naturalWidth > 0 && imageEl.naturalHeight > 0) {
            setNaturalSize({ width: imageEl.naturalWidth, height: imageEl.naturalHeight });
          }
          setLoaded(true);
        }}
      />
    </div>
  );
}

export function Lightbox({
  images,
  initialIndex = 0,
  fiberName,
  onClose,
  sourceRect,
}: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const pipeline = useImagePipeline();
  const modalRef = useRef<HTMLDivElement>(null);
  /** Whether the FLIP open morph has completed */
  const [morphComplete, setMorphComplete] = useState(!sourceRect);
  /** Track closing state for reverse-FLIP */
  const [isClosing, setIsClosing] = useState(false);

  const autopausedUntil = useRef(0);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  /* Clamp current to valid range */
  const safeCurrent = Math.max(0, Math.min(current, images.length - 1));
  useEffect(() => {
    if (safeCurrent !== current) {
      setCurrent(safeCurrent);
    }
  }, [safeCurrent, current]);

  /* ── Prefetch adjacent lightbox images ── */
  useEffect(() => {
    const neighbors = getLightboxPrefetchNeighbors(safeCurrent, images.length);
    if (neighbors.length === 0) return;
    const timer = window.setTimeout(() => {
      neighbors.forEach((idx) => {
        const url = pipeline.transform(images[idx]?.url, "lightbox");
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [safeCurrent, images, pipeline]);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(1);
    setCurrent((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(-1);
    setCurrent((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const pauseAutoAdvance = useCallback(() => {
    autopausedUntil.current = Date.now() + SLIDESHOW_INTERVAL;
  }, []);

  const goNextManual = useCallback(() => { pauseAutoAdvance(); goNext(); }, [pauseAutoAdvance, goNext]);
  const goPrevManual = useCallback(() => { pauseAutoAdvance(); goPrev(); }, [pauseAutoAdvance, goPrev]);

  /* ── Close handler — reverse FLIP if sourceRect available ── */
  const handleClose = useCallback(() => {
    if (sourceRect && !isClosing) {
      setIsClosing(true);
      setTimeout(onClose, MORPH_DURATION * 1000);
    } else {
      onClose();
    }
  }, [sourceRect, isClosing, onClose]);

  /* Keyboard nav */
  useEffect(() => {
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
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNextManual(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevManual(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, goNextManual, goPrevManual]);

  /* Auto-advance — respects manual pause */
  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < autopausedUntil.current) return;
      goNext();
    }, SLIDESHOW_INTERVAL);
    return () => clearInterval(timer);
  }, [goNext]);

  /* Auto-scroll filmstrip to active thumbnail */
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [safeCurrent]);

  /* ── FLIP: compute morph transforms ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const [morphStyle, setMorphStyle] = useState<React.CSSProperties | undefined>(undefined);

  /* On mount, if sourceRect exists, compute the FLIP inversion */
  useLayoutEffect(() => {
    if (!sourceRect || morphComplete) return;
    // The hero container will be positioned by flexbox.
    // We need to compute where it ends up and derive the transform from sourceRect.
    // Since we don't know the image aspect ratio yet, we position the morph
    // element at the sourceRect directly using fixed coordinates.
    setMorphStyle({
      position: "fixed",
      top: sourceRect.top,
      left: sourceRect.left,
      width: sourceRect.width,
      height: sourceRect.height,
      borderRadius: 12,
    });
  }, []);

  /* After setting initial position, animate to final position */
  useEffect(() => {
    if (!sourceRect || morphComplete) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      setMorphStyle(undefined);
      timer = setTimeout(() => setMorphComplete(true), MORPH_DURATION * 1000);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [sourceRect, morphComplete]);

  /* ── Swipe-to-dismiss ── */
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-300, 0, 300], [0.3, 1, 0.3]);
  const dragScale = useTransform(dragY, [-300, 0, 300], [0.85, 1, 0.85]);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const dismissed = useRef(false);
  const dragPointerId = useRef<number | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    isDragging.current = true;
    dragStartY.current = e.clientY;
    lastY.current = e.clientY;
    lastTime.current = performance.now();
    dismissed.current = false;
    dragPointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || e.pointerId !== dragPointerId.current) return;
    const dy = e.clientY - dragStartY.current;
    const resistance = 1 - Math.min(Math.abs(dy) / 600, 1) * (1 - RUBBER_BAND);
    dragY.set(dy * resistance);
    lastY.current = e.clientY;
    lastTime.current = performance.now();
  }, [dragY]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || e.pointerId !== dragPointerId.current) return;
    isDragging.current = false;
    dragPointerId.current = null;

    const dy = e.clientY - dragStartY.current;
    const dt = (performance.now() - lastTime.current) / 1000;
    const velocity = dt > 0 ? Math.abs(e.clientY - lastY.current) / dt : 0;

    if (velocity > DISMISS_VELOCITY || Math.abs(dy) > DISMISS_DISTANCE) {
      if (dismissed.current) return;
      dismissed.current = true;
      const dir = dy >= 0 ? 1 : -1;
      animate(dragY, dir * window.innerHeight * 0.6, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        velocity: velocity * dir,
        onComplete: onClose,
      });
    } else {
      animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
    }
  }, [dragY, onClose]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== dragPointerId.current) return;
    isDragging.current = false;
    dragPointerId.current = null;
    animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
  }, [dragY]);

  const img = images[safeCurrent];
  if (!img) return null;

  const targetSrc = pipeline.transform(img.url, "lightbox");
  const lqipSrc = pipeline.transform(img.url, "lqip");

  /* ── FLIP morph: compute close position ── */
  const closingStyle: React.CSSProperties | undefined =
    isClosing && sourceRect
      ? {
          position: "fixed",
          top: sourceRect.top,
          left: sourceRect.left,
          width: sourceRect.width,
          height: sourceRect.height,
          borderRadius: 12,
          transition: `all ${MORPH_DURATION}s cubic-bezier(0.16, 1, 0.3, 1)`,
        }
      : undefined;

  /* Determine the active hero style: morphing-in → closing → normal */
  const heroStyle: React.CSSProperties | undefined =
    closingStyle ?? morphStyle ?? undefined;

  const isInMorph = !!morphStyle || isClosing;

  return (
    <motion.div
      ref={modalRef}
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${fiberName} image gallery`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isClosing ? MORPH_DURATION : BACKDROP_DURATION, ease: IMAGE_EASE }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/92 backdrop-blur-2xl"
        style={{ opacity: dragOpacity }}
        onClick={handleClose}
        initial={{ backdropFilter: "blur(0px)" }}
        animate={{ backdropFilter: isClosing ? "blur(0px)" : "blur(24px)" }}
        transition={{ duration: BACKDROP_DURATION * 1.6, ease: IMAGE_EASE }}
      />

      {/* Top bar */}
      <motion.div
        className="relative z-10 flex items-center justify-between px-6 py-4 flex-shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.4, delay: isClosing ? 0 : BACKDROP_DURATION * 0.6, ease: IMAGE_EASE }}
      >
        <div className="flex items-center gap-3">
          <span
            className="tracking-[0.18em] uppercase text-white/30"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            {fiberName}
          </span>
          <span className="text-white/15" style={{ fontSize: "11px" }}>
            {`${current + 1} / ${images.length}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClose}
            aria-label="Close gallery"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color] duration-200 cursor-pointer"
            style={{ fontSize: "11px" }}
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>

      {/* Image area — swipe-to-dismiss */}
      <motion.div
        className="relative flex-1 flex items-center justify-center px-8 sm:px-16"
        style={{ y: dragY, scale: dragScale }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={current}
            className="absolute inset-8 sm:inset-12 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: CROSSFADE_DURATION, ease: IMAGE_EASE }}
          >
            {/* Hero image container — FLIP-morphable */}
            <LightboxSlide
              targetSrc={targetSrc}
              lqipSrc={lqipSrc}
              alt={img.title ?? `${fiberName} ${current + 1}`}
              isInMorph={isInMorph}
              heroStyle={heroStyle}
              heroRef={heroRef}
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrevManual(); }}
              aria-label="Previous image"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-[color,background-color] duration-200 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNextManual(); }}
              aria-label="Next image"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-[color,background-color] duration-200 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </motion.div>

      {/* Bottom section: filmstrip + title */}
      <motion.div
        className="relative z-10 flex-shrink-0 pb-5 pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.4, delay: isClosing ? 0 : BACKDROP_DURATION * 0.6, ease: IMAGE_EASE }}
      >
        {/* Filmstrip thumbnail rail */}
        {images.length > 1 && (
          <div
            ref={filmstripRef}
            className="flex items-center justify-center gap-1.5 px-6 mb-3 overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((thumb, i) => {
              const isActive = i === safeCurrent;
              const thumbSrc = pipeline.transform(thumb.url, "contactSheet");
              return (
                <div key={`${thumb.url}-${i}`} className="relative flex-shrink-0">
                  <button
                    ref={isActive ? activeThumbRef : undefined}
                    onClick={() => {
                      pauseAutoAdvance();
                      setDirection(i > current ? 1 : -1);
                      setCurrent(i);
                    }}
                    className="overflow-hidden cursor-pointer transition-all duration-300"
                    style={{
                      width: isActive ? FILMSTRIP_HEIGHT * 1.1 : FILMSTRIP_HEIGHT * 0.85,
                      height: FILMSTRIP_HEIGHT,
                      borderRadius: 8,
                      border: isActive
                        ? "2px solid rgba(255,255,255,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                      opacity: isActive ? 1 : 0.4,
                    }}
                  >
                    <img
                      src={thumbSrc}
                      alt={thumb.title ?? `${fiberName} ${i + 1}`}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Caption + attribution */}
        <div className="flex flex-col items-center gap-1 px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: TITLE_FADE }}
              className="flex flex-col items-center gap-0.5"
            >
              <span
                className="text-white/25 tracking-[0.1em] text-center"
                style={{ fontSize: "11px" }}
              >
                {img.title ?? ""}
              </span>
              {(img.attribution || img.provider) && (
                <span
                  className="text-white/15 tracking-[0.06em] text-center"
                  style={{ fontSize: "10px" }}
                >
                  {img.attribution ? `${img.attribution}` : ""}
                  {img.attribution && img.provider ? " · " : ""}
                  {img.provider ?? ""}
                </span>
              )}
              {img.licenseUrl && (
                <a
                  href={img.licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/10 hover:text-white/25 transition-colors tracking-[0.08em] underline underline-offset-2"
                  style={{ fontSize: "9px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {img.rights || "View license"}
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}