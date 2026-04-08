import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Degrees per pixel of `scrollTop`: larger scrollTop → more clockwise rotation in CSS.
 * Position-based mapping keeps the mark aligned with scroll through layout-driven scrollTop
 * nudges and avoids “stalls” from unrelated scroll-suppression windows in the shell.
 */
const DEGREES_PER_PIXEL = 0.09;

/**
 * Drives the NFA logo mark rotation from the main atlas scrollport. Rotation is derived from
 * absolute `scrollTop` (not frame deltas), so it stays consistent for continuous scroll. Updates
 * are rAF-coalesced to one React commit per frame.
 */
export function useNfaMarkScrollRotation(
  scrollPort: HTMLElement | null,
  prefersReducedMotion: boolean,
): { nfaMarkStyle: CSSProperties } {
  const [rotationDeg, setRotationDeg] = useState(0);
  const pendingScrollTopRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scrollPort || prefersReducedMotion) return;

    const flush = () => {
      rafRef.current = null;
      const st = pendingScrollTopRef.current;
      pendingScrollTopRef.current = null;
      if (st == null) return;
      setRotationDeg(st * DEGREES_PER_PIXEL);
    };

    const onScroll = () => {
      pendingScrollTopRef.current = scrollPort.scrollTop;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    setRotationDeg(scrollPort.scrollTop * DEGREES_PER_PIXEL);
    scrollPort.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scrollPort.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scrollPort, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return { nfaMarkStyle: {} };
  }

  return {
    nfaMarkStyle: {
      transform: `rotate(${rotationDeg}deg)`,
    },
  };
}
