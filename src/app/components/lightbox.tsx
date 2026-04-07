import type { GalleryImageEntry } from "../data/atlas-data";
import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "motion/react";
import { useImagePipeline } from "../context/image-pipeline";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Eye,
  EyeOff,
} from "lucide-react";

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

/* ── Swipe thresholds ── */
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 500;
const RUBBER_BAND = 0.45;
const HORIZONTAL_NAV_DISTANCE = 72;
const HORIZONTAL_NAV_RATIO = 1.35;

/* ── Filmstrip constants ── */
const FILMSTRIP_HEIGHT = 48;

/** Hero clip radius — explicit px on all layers (inherit is flaky on <img> in WebKit). */
const HERO_RADIUS_PX = 16;
const ZOOM_MAX = 4;
const ZOOM_SNAP_BELOW = 1.05;

function getFullscreenElement(): Element | null {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

async function requestFullscreenEl(el: HTMLElement): Promise<void> {
  const req =
    el.requestFullscreen?.bind(el) ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(el);
  if (req) await Promise.resolve(req());
}

async function exitFullscreenDoc(): Promise<void> {
  if (!getFullscreenElement()) return;
  const ex =
    document.exitFullscreen?.bind(document) ??
    (document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen?.bind(document);
  if (ex) await Promise.resolve(ex());
}

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
   ═══════════════════════════════════════════════════════════════════ */
interface SlideProps {
  targetSrc: string | undefined;
  lqipSrc: string | undefined;
  alt: string;
  isInMorph: boolean;
  heroStyle?: React.CSSProperties;
  heroRef?: React.Ref<HTMLDivElement>;
  maxWidthCss: string;
  maxHeightCss: string;
  onZoomLockChange?: (locked: boolean) => void;
}

function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function LightboxSlide({
  targetSrc,
  lqipSrc,
  alt,
  isInMorph,
  heroStyle,
  heroRef,
  maxWidthCss,
  maxHeightCss,
  onZoomLockChange,
}: SlideProps) {
  const [loaded, setLoaded] = useState(() => {
    if (!targetSrc) return false;
    const probe = new Image();
    probe.src = targetSrc;
    return probe.complete && probe.naturalWidth > 0;
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const pinchLayerRef = useRef<HTMLDivElement>(null);

  const [pinch, setPinch] = useState({ s: 1, x: 0, y: 0 });
  const pinchLiveRef = useRef(pinch);
  pinchLiveRef.current = pinch;

  const gestureRef = useRef<"idle" | "pinch" | "pan">("idle");
  const pinchStartRef = useRef({ dist: 1, scale: 1 });
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    setPinch({ s: 1, x: 0, y: 0 });
    gestureRef.current = "idle";
    onZoomLockChange?.(false);
  }, [targetSrc, onZoomLockChange]);

  useEffect(() => {
    if (isInMorph) return;
    const el = pinchLayerRef.current;
    if (!el) return;

    const clampPan = (s: number, x: number, y: number) => {
      const lim = 180 * s;
      return {
        s,
        x: Math.max(-lim, Math.min(lim, x)),
        y: Math.max(-lim, Math.min(lim, y)),
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      const p = pinchLiveRef.current;
      if (e.touches.length === 2) {
        gestureRef.current = "pinch";
        const d = Math.max(8, getTouchDistance(e.touches));
        pinchStartRef.current = { dist: d, scale: p.s };
      } else if (e.touches.length === 1 && p.s > 1.02) {
        gestureRef.current = "pan";
        const t = e.touches[0];
        panStartRef.current = { x: t.clientX, y: t.clientY, tx: p.x, ty: p.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (gestureRef.current === "pinch" && e.touches.length >= 2) {
        e.preventDefault();
        const d = Math.max(8, getTouchDistance(e.touches));
        const { dist, scale } = pinchStartRef.current;
        const nextS = Math.min(ZOOM_MAX, Math.max(1, scale * (d / dist)));
        setPinch((prev) => clampPan(nextS, prev.x, prev.y));
        onZoomLockChange?.(nextS > 1.02);
      } else if (gestureRef.current === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const { x, y, tx, ty } = panStartRef.current;
        setPinch((prev) =>
          clampPan(prev.s, tx + (t.clientX - x), ty + (t.clientY - y)),
        );
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        gestureRef.current = "idle";
        setPinch((prev) => {
          if (prev.s < ZOOM_SNAP_BELOW) {
            onZoomLockChange?.(false);
            return { s: 1, x: 0, y: 0 };
          }
          return clampPan(prev.s, prev.x, prev.y);
        });
      } else if (e.touches.length === 1 && gestureRef.current === "pinch") {
        const t = e.touches[0];
        setPinch((p) => {
          if (p.s > 1.02) {
            gestureRef.current = "pan";
            panStartRef.current = { x: t.clientX, y: t.clientY, tx: p.x, ty: p.y };
          } else {
            gestureRef.current = "idle";
          }
          return p;
        });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isInMorph, onZoomLockChange, targetSrc]);

  useEffect(() => {
    if (loaded) return;
    if (!targetSrc) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [targetSrc, loaded]);

  const roundedClip = !isInMorph;
  const radiusStyle = roundedClip
    ? ({
        borderRadius: HERO_RADIUS_PX,
        WebkitBorderRadius: HERO_RADIUS_PX,
      } as React.CSSProperties)
    : {};

  // w-fit shell: outer flex hero fills the stage; radius on it was ~invisible at 16px viewport-scale.
  const clipShellStyle: React.CSSProperties | undefined = roundedClip
    ? { ...radiusStyle, overflow: "hidden", maxWidth: "100%", maxHeight: "100%" }
    : undefined;

  return (
    <div
      ref={heroRef}
      className={`relative flex min-h-0 min-w-0 max-h-full max-w-full items-center justify-center ${roundedClip ? "" : "overflow-hidden"}`}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        transition: isInMorph
          ? `all ${MORPH_DURATION}s cubic-bezier(0.16, 1, 0.3, 1)`
          : undefined,
        ...heroStyle,
      }}
    >
      <div
        className={
          roundedClip
            ? "relative flex min-h-0 min-w-0 w-fit max-h-full max-w-full touch-manipulation items-center justify-center"
            : "relative flex min-h-0 min-w-0 max-h-full max-w-full touch-manipulation items-center justify-center"
        }
        style={clipShellStyle}
      >
        <div
          ref={pinchLayerRef}
          className="relative flex min-h-0 min-w-0 max-h-full max-w-full touch-manipulation items-center justify-center"
          style={{
            transform: `translate3d(${pinch.x}px, ${pinch.y}px, 0) scale(${pinch.s})`,
            touchAction: pinch.s > 1.02 ? "none" : "manipulation",
            willChange: pinch.s > 1.01 ? "transform" : "auto",
            ...(roundedClip ? radiusStyle : {}),
          }}
        >
        {!loaded && lqipSrc && (
          <img
            src={lqipSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              filter: "blur(20px)",
              transform: "scale(1.1)",
              ...(roundedClip ? radiusStyle : {}),
            }}
            draggable={false}
          />
        )}

        <img
          ref={imgRef}
          src={targetSrc}
          alt={alt}
          className="pointer-events-none min-h-0 min-w-0 select-none"
          style={{
            maxWidth: isInMorph ? "100%" : maxWidthCss,
            maxHeight: isInMorph ? "100%" : maxHeightCss,
            width: isInMorph ? "100%" : "auto",
            height: isInMorph ? "100%" : "auto",
            objectFit: "contain",
            ...(roundedClip ? radiusStyle : {}),
            filter: "brightness(0.92) contrast(1.05)",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          draggable={false}
          onLoad={() => {
            setLoaded(true);
          }}
        />
        </div>
      </div>
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
  const [morphComplete, setMorphComplete] = useState(!sourceRect);
  const [isClosing, setIsClosing] = useState(false);

  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);

  const autopausedUntil = useRef(0);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const zoomDismissLockRef = useRef(false);

  const handleZoomLockChange = useCallback((locked: boolean) => {
    zoomDismissLockRef.current = locked;
  }, []);

  const lightboxPreset = browserFullscreen ? "lightboxHi" : "lightbox";

  useEffect(() => {
    const onFs = () => setBrowserFullscreen(!!getFullscreenElement());
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      void exitFullscreenDoc();
    };
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    firstFocusable?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  const safeCurrent = Math.max(0, Math.min(current, images.length - 1));
  useEffect(() => {
    if (safeCurrent !== current) {
      setCurrent(safeCurrent);
    }
  }, [safeCurrent, current]);

  useEffect(() => {
    const neighbors = getLightboxPrefetchNeighbors(safeCurrent, images.length);
    if (neighbors.length === 0) return;
    const timer = window.setTimeout(() => {
      neighbors.forEach((idx) => {
        const url = pipeline.transform(images[idx]?.url, lightboxPreset);
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [safeCurrent, images, pipeline, lightboxPreset]);

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

  const goFirst = useCallback(() => {
    if (images.length <= 1) return;
    setDirection(safeCurrent > 0 ? -1 : 0);
    setCurrent(0);
  }, [images.length, safeCurrent]);

  const goLast = useCallback(() => {
    if (images.length <= 1) return;
    const last = images.length - 1;
    setDirection(safeCurrent < last ? 1 : 0);
    setCurrent(last);
  }, [images.length, safeCurrent]);

  const pauseAutoAdvance = useCallback(() => {
    autopausedUntil.current = Date.now() + SLIDESHOW_INTERVAL;
  }, []);

  const goNextManual = useCallback(() => { pauseAutoAdvance(); goNext(); }, [pauseAutoAdvance, goNext]);
  const goPrevManual = useCallback(() => { pauseAutoAdvance(); goPrev(); }, [pauseAutoAdvance, goPrev]);

  const toggleBrowserFullscreen = useCallback(async () => {
    const el = modalRef.current;
    if (!el) return;
    try {
      if (getFullscreenElement()) {
        await exitFullscreenDoc();
        setChromeVisible(true);
      } else {
        await requestFullscreenEl(el);
        setChromeVisible(false);
      }
    } catch {
      /* iOS / policy — ignore */
    }
  }, []);

  const handleClose = useCallback(() => {
    void exitFullscreenDoc();
    if (sourceRect && !isClosing) {
      setIsClosing(true);
      setTimeout(onClose, MORPH_DURATION * 1000);
    } else {
      onClose();
    }
  }, [sourceRect, isClosing, onClose]);

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
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNextManual();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevManual();
      }
      if (e.key === "Home") {
        e.preventDefault();
        pauseAutoAdvance();
        goFirst();
      }
      if (e.key === "End") {
        e.preventDefault();
        pauseAutoAdvance();
        goLast();
      }
      if (e.key === "f" || e.key === "F") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        void toggleBrowserFullscreen();
      }
      if (e.key === "i" || e.key === "I") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        setChromeVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, goNextManual, goPrevManual, goFirst, goLast, pauseAutoAdvance, toggleBrowserFullscreen]);

  useEffect(() => {
    if (!slideshowPlaying || images.length <= 1) return;
    const timer = setInterval(() => {
      if (Date.now() < autopausedUntil.current) return;
      goNext();
    }, SLIDESHOW_INTERVAL);
    return () => clearInterval(timer);
  }, [slideshowPlaying, images.length, goNext]);

  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [safeCurrent]);

  const heroRef = useRef<HTMLDivElement>(null);
  const [morphStyle, setMorphStyle] = useState<React.CSSProperties | undefined>(undefined);

  useLayoutEffect(() => {
    if (!sourceRect || morphComplete) return;
    setMorphStyle({
      position: "fixed",
      top: sourceRect.top,
      left: sourceRect.left,
      width: sourceRect.width,
      height: sourceRect.height,
      borderRadius: 12,
    });
  }, []);

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

  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-300, 0, 300], [0.3, 1, 0.3]);
  const dragScale = useTransform(dragY, [-300, 0, 300], [0.85, 1, 0.85]);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const dismissed = useRef(false);
  const dragPointerId = useRef<number | null>(null);
  const stagePointerIds = useRef(new Set<number>());

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (zoomDismissLockRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    const el = e.currentTarget as HTMLElement;
    stagePointerIds.current.add(e.pointerId);
    if (stagePointerIds.current.size > 1) {
      isDragging.current = false;
      if (dragPointerId.current !== null) {
        try {
          el.releasePointerCapture(dragPointerId.current);
        } catch {
          /* not capturing */
        }
      }
      dragPointerId.current = null;
      animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
      return;
    }

    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartX.current = e.clientX;
    lastY.current = e.clientY;
    lastTime.current = performance.now();
    dismissed.current = false;
    dragPointerId.current = e.pointerId;
    el.setPointerCapture(e.pointerId);
  }, [dragY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || e.pointerId !== dragPointerId.current) return;
    const dy = e.clientY - dragStartY.current;
    const resistance = 1 - Math.min(Math.abs(dy) / 600, 1) * (1 - RUBBER_BAND);
    dragY.set(dy * resistance);
    lastY.current = e.clientY;
    lastTime.current = performance.now();
  }, [dragY]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    stagePointerIds.current.delete(e.pointerId);

    if (!isDragging.current || e.pointerId !== dragPointerId.current) return;
    isDragging.current = false;
    dragPointerId.current = null;

    if (zoomDismissLockRef.current) {
      animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
      return;
    }

    const dx = e.clientX - dragStartX.current;
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
        onComplete: () => {
          void exitFullscreenDoc();
          onClose();
        },
      });
      return;
    }

    if (
      images.length > 1 &&
      Math.abs(dx) > HORIZONTAL_NAV_DISTANCE &&
      Math.abs(dx) > Math.abs(dy) * HORIZONTAL_NAV_RATIO
    ) {
      pauseAutoAdvance();
      if (dx > 0) goPrev();
      else goNext();
    }

    animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
  }, [dragY, onClose, images.length, pauseAutoAdvance, goPrev, goNext]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    stagePointerIds.current.delete(e.pointerId);
    if (e.pointerId !== dragPointerId.current) return;
    isDragging.current = false;
    dragPointerId.current = null;
    animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
  }, [dragY]);

  const img = images[safeCurrent];
  if (!img) return null;

  const targetSrc = pipeline.transform(img.url, lightboxPreset);
  const lqipSrc = pipeline.transform(img.url, "lqip");

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

  const heroStyle: React.CSSProperties | undefined =
    closingStyle ?? morphStyle ?? undefined;

  const isInMorph = !!morphStyle || isClosing;

  const chromeActive = chromeVisible && !isClosing;
  const maxWidthCss = chromeActive
    ? "calc(100vw - max(2rem, env(safe-area-inset-left) + env(safe-area-inset-right)) - 2rem)"
    : "calc(100vw - max(1rem, env(safe-area-inset-left) + env(safe-area-inset-right)))";
  const maxHeightCss = chromeActive
    ? "calc(100dvh - max(2rem, env(safe-area-inset-top) + env(safe-area-inset-bottom)) - 11rem)"
    : "calc(100dvh - max(1.5rem, env(safe-area-inset-top) + env(safe-area-inset-bottom)) - 1rem)";

  const safeTop = "max(12px, env(safe-area-inset-top))";
  const safeBottom = "max(12px, env(safe-area-inset-bottom))";
  const safeX = "max(16px, env(safe-area-inset-left))";

  return (
    <motion.div
      ref={modalRef}
      className="fixed inset-0 z-[100] flex flex-col bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-label={`${fiberName} image gallery`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isClosing ? MORPH_DURATION : BACKDROP_DURATION, ease: IMAGE_EASE }}
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {`Image ${safeCurrent + 1} of ${images.length}${img.title ? `: ${img.title}` : ""}`}
      </span>

      <motion.div
        className="absolute inset-0 bg-black/92 backdrop-blur-2xl"
        style={{ opacity: dragOpacity }}
        onClick={handleClose}
        initial={{ backdropFilter: "blur(0px)" }}
        animate={{ backdropFilter: isClosing ? "blur(0px)" : "blur(24px)" }}
        transition={{ duration: BACKDROP_DURATION * 1.6, ease: IMAGE_EASE }}
      />

      <div className="relative z-10 flex flex-1 flex-col min-h-0 min-w-0">
        {/* Top chrome — overlays stage */}
        <motion.div
          className="absolute left-0 right-0 z-30 flex items-center justify-between gap-2 pointer-events-none"
          style={{ top: 0, paddingTop: safeTop, paddingLeft: safeX, paddingRight: safeX }}
          initial={{ opacity: 0 }}
          animate={{ opacity: chromeActive ? 1 : 0 }}
          transition={{ duration: 0.35, ease: IMAGE_EASE }}
        >
          <div
            className={`flex items-center gap-3 min-w-0 ${chromeActive ? "pointer-events-auto" : "pointer-events-none"}`}
          >
            <span
              className="tracking-[0.18em] uppercase text-white/30 truncate"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              {fiberName}
            </span>
            <span className="text-white/15 flex-shrink-0" style={{ fontSize: "11px" }}>
              {`${current + 1} / ${images.length}`}
            </span>
          </div>
          <div
            className={`flex items-center gap-1.5 flex-shrink-0 ${chromeActive ? "pointer-events-auto" : "pointer-events-none"}`}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  pauseAutoAdvance();
                  setSlideshowPlaying((p) => !p);
                }}
                aria-label={slideshowPlaying ? "Pause slideshow" : "Resume slideshow"}
                className="flex items-center justify-center p-2 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color] duration-200 cursor-pointer"
              >
                {slideshowPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleBrowserFullscreen()}
              aria-label={browserFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="flex items-center justify-center p-2 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color] duration-200 cursor-pointer"
            >
              {browserFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setChromeVisible(false)}
              aria-label="Hide captions and thumbnails"
              className="flex items-center justify-center p-2 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color] duration-200 cursor-pointer"
            >
              <EyeOff size={14} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close gallery"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-[color,border-color] duration-200 cursor-pointer"
              style={{ fontSize: "11px" }}
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>

        {!chromeActive && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
            style={{ top: safeTop }}
          >
            <button
              type="button"
              onClick={() => setChromeVisible(true)}
              aria-label="Show captions and controls"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-[11px] font-medium cursor-pointer backdrop-blur-md"
            >
              <Eye size={14} />
              Show UI
            </button>
          </div>
        )}

        {/* Stage — vertical dismiss + horizontal nav */}
        <motion.div
          className="relative flex-1 flex items-center justify-center min-h-0 px-4 sm:px-8"
          style={{
            y: dragY,
            scale: dragScale,
            paddingTop: chromeActive ? "3.25rem" : safeTop,
            paddingBottom: chromeActive ? "10rem" : safeBottom,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <AnimatePresence initial={false} custom={direction} mode="sync">
            <motion.div
              key={current}
              className="absolute inset-4 sm:inset-8 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: CROSSFADE_DURATION, ease: IMAGE_EASE }}
            >
              <LightboxSlide
                targetSrc={targetSrc}
                lqipSrc={lqipSrc}
                alt={img.title ?? `${fiberName} ${current + 1}`}
                isInMorph={isInMorph}
                heroStyle={heroStyle}
                heroRef={heroRef}
                maxWidthCss={maxWidthCss}
                maxHeightCss={maxHeightCss}
                onZoomLockChange={handleZoomLockChange}
              />
            </motion.div>
          </AnimatePresence>

          {images.length > 1 && chromeActive && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrevManual(); }}
                aria-label="Previous image"
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-[color,background-color] duration-200 cursor-pointer pointer-events-auto"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNextManual(); }}
                aria-label="Next image"
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-[color,background-color] duration-200 cursor-pointer pointer-events-auto"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </motion.div>

        {/* Bottom chrome */}
        <motion.div
          className="absolute left-0 right-0 z-30 pointer-events-none"
          style={{ bottom: 0, paddingBottom: safeBottom, paddingLeft: safeX, paddingRight: safeX }}
          initial={{ opacity: 0 }}
          animate={{ opacity: chromeActive ? 1 : 0 }}
          transition={{ duration: 0.35, ease: IMAGE_EASE }}
        >
          <div className={chromeActive ? "pointer-events-auto" : "pointer-events-none"}>
            {images.length > 1 && (
              <div
                ref={filmstripRef}
                className="flex items-center justify-center gap-1.5 mb-3 overflow-x-auto scrollbar-none"
                style={{ scrollbarWidth: "none" }}
              >
                {images.map((thumb, i) => {
                  const isActive = i === safeCurrent;
                  const thumbSrc = pipeline.transform(thumb.url, "contactSheet");
                  return (
                    <div key={`${thumb.url}-${i}`} className="relative flex-shrink-0">
                      <button
                        type="button"
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

            <div className="flex flex-col items-center gap-1">
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
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
