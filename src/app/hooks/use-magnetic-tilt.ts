/**
 * useMagneticTilt — Optimization #4: spatial-index magnetic cursor tilt.
 *
 * Instead of calling getBoundingClientRect() on all ~119 cards every
 * mousemove frame, maintains a cached spatial index of card centres
 * in document-absolute coordinates, sorted by Y.  On each frame we
 * binary-search the Y band [mouseY ± RADIUS] and only check ~5–15
 * nearby cards.  Tilt is disabled entirely during detail mode.
 *
 * Touch devices are skipped (no tilt on mobile).
 */

import { useRef, useEffect, useCallback, type MutableRefObject, type RefObject } from "react";

/* ── Tilt tuning ── */
const RADIUS = 280;   // proximity radius in px
const MAX_TILT = 1.5; // degrees at full proximity (reduced to avoid 3D render blur)

interface CachedRect {
  id: string;
  el: HTMLDivElement;
  cx: number; // center X in document coords
  cy: number; // center Y in document coords
}

/** Binary search: find first index where cy >= threshold */
function lowerBound(arr: CachedRect[], threshold: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].cy < threshold) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Attaches magnetic perspective-tilt to grid cells.
 *
 * @param gridRef       — ref to the grid container (event listener target)
 * @param tiltRefs      — Map<fiberId, HTMLDivElement> of tiltable cells
 * @param selectedIdRef — ref to current selection (tilt disabled when set)
 * @param deps          — extra deps that invalidate the spatial index (e.g. filtered, cols, selectedId)
 */
export function useMagneticTilt(
  gridRef: RefObject<HTMLDivElement | null>,
  tiltRefs: MutableRefObject<Map<string, HTMLDivElement>>,
  selectedIdRef: MutableRefObject<string | null>,
  deps: unknown[] = [],
): void {
  const spatialIndexRef = useRef<CachedRect[]>([]);
  const spatialDirtyRef = useRef(true);

  const rebuildSpatialIndex = useCallback(() => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const rects: CachedRect[] = [];
    tiltRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      rects.push({
        id,
        el,
        cx: r.left + r.width / 2 + scrollX,
        cy: r.top + r.height / 2 + scrollY,
      });
    });
    rects.sort((a, b) => a.cy - b.cy);
    spatialIndexRef.current = rects;
    spatialDirtyRef.current = false;
  }, [tiltRefs]);

  /* Mark dirty on resize */
  useEffect(() => {
    const markDirty = () => { spatialDirtyRef.current = true; };
    window.addEventListener("resize", markDirty);
    return () => window.removeEventListener("resize", markDirty);
  }, []);

  /* Mark dirty when external deps change */
  useEffect(() => {
    spatialDirtyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  /* Main mousemove/mouseleave effect */
  useEffect(() => {
    if ("ontouchstart" in window) return;
    const gridEl = gridRef.current;
    if (!gridEl) return;

    let rafId = 0;
    const activeTilts = new Set<string>();

    const resetTilt = (id: string) => {
      const el = tiltRefs.current.get(id);
      if (el) {
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-y", "0deg");
      }
    };

    const resetAll = () => {
      activeTilts.forEach(resetTilt);
      activeTilts.clear();
    };

    const onMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        /* Skip tilt during detail mode */
        if (selectedIdRef.current) {
          if (activeTilts.size > 0) resetAll();
          return;
        }

        /* Rebuild spatial index if stale */
        if (spatialDirtyRef.current) rebuildSpatialIndex();
        const idx = spatialIndexRef.current;
        if (idx.length === 0) return;

        /* Mouse → document-absolute coords */
        const absX = e.clientX + window.scrollX;
        const absY = e.clientY + window.scrollY;

        /* Find the Y band via binary search */
        const lo = lowerBound(idx, absY - RADIUS);
        const visited = new Set<string>();

        for (let i = lo; i < idx.length; i++) {
          const entry = idx[i];
          if (entry.cy > absY + RADIUS) break;

          visited.add(entry.id);
          const dx = absX - entry.cx;
          const dy = absY - entry.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < RADIUS) {
            const factor = 1 - dist / RADIUS;
            const eased = Math.sqrt(factor);
            const tiltY = (dx / RADIUS) * MAX_TILT * eased;
            const tiltX = -(dy / RADIUS) * MAX_TILT * eased;
            entry.el.style.setProperty("--tilt-x", `${tiltX.toFixed(3)}deg`);
            entry.el.style.setProperty("--tilt-y", `${tiltY.toFixed(3)}deg`);
            activeTilts.add(entry.id);
          } else if (activeTilts.has(entry.id)) {
            resetTilt(entry.id);
            activeTilts.delete(entry.id);
          }
        }

        /* Reset cards that fell out of the band */
        for (const id of activeTilts) {
          if (!visited.has(id)) {
            resetTilt(id);
            activeTilts.delete(id);
          }
        }
      });
    };

    const onMouseLeave = () => {
      cancelAnimationFrame(rafId);
      resetAll();
    };

    gridEl.addEventListener("mousemove", onMouseMove, { passive: true });
    gridEl.addEventListener("mouseleave", onMouseLeave);

    return () => {
      gridEl.removeEventListener("mousemove", onMouseMove);
      gridEl.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [gridRef, tiltRefs, selectedIdRef, rebuildSpatialIndex]);
}