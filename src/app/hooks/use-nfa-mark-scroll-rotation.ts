import { useCallback, useEffect, useRef, type CSSProperties } from "react";

/**
 * Degrees per pixel of `scrollTop`: larger scrollTop → more clockwise rotation in CSS.
 * Position-based mapping keeps the mark aligned with scroll through layout-driven scrollTop
 * nudges and avoids “stalls” from unrelated scroll-suppression windows in the shell.
 */
const DEGREES_PER_PIXEL = 0.09;

/**
 * Interpolates toward `scrollTop`-derived angle each frame (only when motion is allowed).
 * Higher = snappier; lower = softer trailing. Tuned so flick-scroll settles in a few frames.
 */
const ROTATION_SMOOTHING = 0.42;

/** Stop scheduling rAF when within this many degrees of the target. */
const ANGLE_EPSILON = 0.06;

/**
 * Drives the NFA logo mark rotation from the main atlas scrollport. Rotation is derived from
 * absolute `scrollTop` (not frame deltas), so it stays consistent for continuous scroll.
 *
 * Updates the transform on the host element via the DOM instead of React state, so scrolling
 * does not re-render the full top nav every frame. When motion is allowed, angle eases toward
 * the scroll-derived target each frame to soften scroll event jitter vs. display refresh.
 *
 * Higher-level alternatives (for future consideration):
 * - **scroll-driven animations** (`animation-timeline: scroll()` / ViewTimeline): ties rotation
 *   directly to scroll position on the compositor where supported; needs fallbacks.
 * - **Merge scroll listeners** in the shell: one rAF per frame reading `scrollTop` and fanning
 *   out to logo + nav-strip logic reduces duplicate work vs. several independent listeners.
 * - **Virtual scroll / content visibility**: less scroll churn on long grids indirectly smooths
 *   any scroll-linked chrome.
 */
export function useNfaMarkScrollRotation(
  scrollPort: HTMLElement | null,
  prefersReducedMotion: boolean,
): {
  nfaMarkTransformHostRef: (el: HTMLSpanElement | null) => void;
  nfaMarkHostStyle: CSSProperties;
} {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  /** Displayed angle; null until first snap so we always align to scroll on mount. */
  const currentDegRef = useRef<number | null>(null);

  const writeRotateDeg = useCallback((deg: number) => {
    const el = hostRef.current;
    if (!el) return;
    // translateZ(0) promotes a compositor layer so only this subtree repaints during scroll.
    el.style.transform = `translateZ(0) rotate(${deg}deg)`;
  }, []);

  const snapToScrollTop = useCallback(
    (scrollTop: number) => {
      const deg = scrollTop * DEGREES_PER_PIXEL;
      currentDegRef.current = deg;
      writeRotateDeg(deg);
    },
    [writeRotateDeg],
  );

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tickSmooth = useCallback(() => {
    rafRef.current = null;
    if (!scrollPort || prefersReducedMotion) return;

    const targetDeg = scrollPort.scrollTop * DEGREES_PER_PIXEL;
    let current = currentDegRef.current;
    if (current == null) {
      snapToScrollTop(scrollPort.scrollTop);
      return;
    }

    const next = current + (targetDeg - current) * ROTATION_SMOOTHING;
    if (Math.abs(targetDeg - next) <= ANGLE_EPSILON) {
      currentDegRef.current = targetDeg;
      writeRotateDeg(targetDeg);
      return;
    }

    currentDegRef.current = next;
    writeRotateDeg(next);
    rafRef.current = requestAnimationFrame(tickSmooth);
  }, [prefersReducedMotion, scrollPort, snapToScrollTop, writeRotateDeg]);

  const scheduleTick = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(tickSmooth);
  }, [tickSmooth]);

  const setNfaMarkTransformHostRef = useCallback(
    (el: HTMLSpanElement | null) => {
      hostRef.current = el;
      if (!el) return;
      if (prefersReducedMotion || !scrollPort) {
        el.style.transform = "";
        currentDegRef.current = null;
        return;
      }
      snapToScrollTop(scrollPort.scrollTop);
    },
    [prefersReducedMotion, scrollPort, snapToScrollTop],
  );

  useEffect(() => {
    if (!scrollPort || prefersReducedMotion) {
      cancelRaf();
      return;
    }

    snapToScrollTop(scrollPort.scrollTop);

    const onScroll = () => {
      scheduleTick();
    };

    scrollPort.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollPort.removeEventListener("scroll", onScroll);
      cancelRaf();
    };
  }, [scrollPort, prefersReducedMotion, snapToScrollTop, scheduleTick, cancelRaf]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (prefersReducedMotion || !scrollPort) {
      cancelRaf();
      el.style.transform = "";
      currentDegRef.current = null;
    } else {
      snapToScrollTop(scrollPort.scrollTop);
    }
  }, [prefersReducedMotion, scrollPort, snapToScrollTop, cancelRaf]);

  return {
    nfaMarkTransformHostRef: setNfaMarkTransformHostRef,
    nfaMarkHostStyle: prefersReducedMotion ? {} : { willChange: "transform" },
  };
}
