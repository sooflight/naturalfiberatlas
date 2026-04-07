import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks which grid row (0-based) is closest to the vertical center of the
 * atlas scroll port, for ambient UI such as revealing property pills without hover.
 *
 * While the scrollport is at the very top (landing position), returns null so the
 * effect stays off until the user scrolls.
 */
export function useAmbientGridRow(options: {
  enabled: boolean;
  scrollRoot: HTMLElement | undefined;
  filteredLength: number;
  cols: number;
  indexRefs: RefObject<Map<number, HTMLDivElement>>;
}): number | null {
  const { enabled, scrollRoot, filteredLength, cols, indexRefs } = options;
  const [ambientRowIndex, setAmbientRowIndex] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    if (!enabled || filteredLength === 0) {
      setAmbientRowIndex((p) => (p === null ? p : null));
      return;
    }

    const scrollTop = scrollRoot
      ? scrollRoot.scrollTop
      : window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 1) {
      setAmbientRowIndex((p) => (p === null ? p : null));
      return;
    }

    const portRect = scrollRoot?.getBoundingClientRect();
    const centerY = portRect
      ? portRect.top + portRect.height / 2
      : window.innerHeight / 2;

    const rowCount = Math.ceil(filteredLength / cols);
    let bestRow: number | null = null;
    let bestDist = Infinity;

    for (let r = 0; r < rowCount; r++) {
      const el = indexRefs.current?.get(r * cols);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const rowCenter = rect.top + rect.height / 2;
      const d = Math.abs(rowCenter - centerY);
      if (d < bestDist) {
        bestDist = d;
        bestRow = r;
      }
    }

    if (bestRow === null) {
      setAmbientRowIndex((p) => (p === null ? p : null));
      return;
    }

    setAmbientRowIndex((prev) => (prev === bestRow ? prev : bestRow));
  }, [enabled, filteredLength, cols, scrollRoot, indexRefs]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measure();
    });
  }, [measure]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const scrollTargets: (HTMLElement | Window)[] = [];
    if (scrollRoot) scrollTargets.push(scrollRoot);
    else scrollTargets.push(window);

    const onScroll = () => {
      scheduleMeasure();
    };

    for (const t of scrollTargets) {
      t.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", scheduleMeasure, { passive: true });

    let ro: ResizeObserver | null = null;
    if (scrollRoot && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => scheduleMeasure());
      ro.observe(scrollRoot);
    }

    return () => {
      for (const t of scrollTargets) {
        t.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", scheduleMeasure);
      ro?.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scrollRoot, scheduleMeasure]);

  return ambientRowIndex;
}
