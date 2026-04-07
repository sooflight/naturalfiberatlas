/**
 * useVirtualGrid — IntersectionObserver-based viewport virtualization.
 *
 * Tracks which grid cells are "near the viewport" (within `rootMargin`)
 * and returns a Set of their string IDs. Cells outside the viewport
 * can be replaced with lightweight skeleton placeholders to reduce
 * DOM weight, backdrop-filter compositing, and image decode work.
 *
 * **Hybrid detail-mode**: When `disabled` is true (e.g. detail mode is
 * active), the hook returns `null` — signalling the consumer to render
 * ALL cells regardless of viewport position. This is necessary because
 * plate layout assigns content to arbitrary cells across the full grid.
 *
 * Cells that enter the viewport are kept mounted for a grace period
 * (`LEAVE_GRACE_MS`) after leaving to avoid thrash on small scrolls.
 */

import { useEffect, useRef, useState, useCallback } from "react";

/** How far outside the viewport to pre-mount cells */
const ROOT_MARGIN = "300px 0px 300px 0px";

/** How long (ms) to keep a cell mounted after it leaves the viewport */
const LEAVE_GRACE_MS = 1500;

/** Minimum intersection ratio to consider a cell "entering" */
const ENTER_THRESHOLD = 0.01;

export function useVirtualGrid(disabled: boolean, intersectionRoot?: Element | null) {
  // null = "render everything" (detail mode or initial)
  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  /** Bumps when the IO instance is (re)created so GridView can re-observe cells (refs run before the effect). */
  const [virtualIoGeneration, setVirtualIoGeneration] = useState(0);

  // Internal mutable tracking (doesn't trigger renders on every IO callback)
  const liveSet = useRef(new Set<string>());
  const leaveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const batchRaf = useRef<number | null>(null);

  /** Flush the current liveSet into React state (batched per-frame) */
  const scheduleFlush = useCallback(() => {
    if (batchRaf.current !== null) return;
    batchRaf.current = requestAnimationFrame(() => {
      batchRaf.current = null;
      const next = liveSet.current;
      setVisibleIds((prev) => {
        if (prev === null) return new Set(next);
        if (prev.size !== next.size) return new Set(next);
        for (const id of next) {
          if (!prev.has(id)) return new Set(next);
        }
        for (const id of prev) {
          if (!next.has(id)) return new Set(next);
        }
        return prev;
      });
    });
  }, []);

  /* ── Create / destroy observer ── */
  useEffect(() => {
    if (disabled) {
      // Detail mode — everything is visible.
      // No state update needed here — the return value on line 123
      // already short-circuits to null when disabled is true.
      // Avoiding setVisibleIds(null) eliminates a wasteful re-render
      // of GridView during inhale transitions.
      return;
    }

    liveSet.current.clear();
    setVisibleIds(null);
    for (const timer of leaveTimers.current.values()) clearTimeout(timer);
    leaveTimers.current.clear();
    if (batchRaf.current !== null) cancelAnimationFrame(batchRaf.current);
    batchRaf.current = null;

    const ioOpts: IntersectionObserverInit = {
      rootMargin: ROOT_MARGIN,
      threshold: [0, ENTER_THRESHOLD],
    };
    if (intersectionRoot) {
      ioOpts.root = intersectionRoot;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let changed = false;

        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.virtualId;
          if (!id) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= ENTER_THRESHOLD) {
            // Cancel any pending leave timer
            const timer = leaveTimers.current.get(id);
            if (timer) {
              clearTimeout(timer);
              leaveTimers.current.delete(id);
            }

            if (!liveSet.current.has(id)) {
              liveSet.current.add(id);
              changed = true;
            }
          } else {
            // Cell left the expanded viewport — start grace timer
            if (liveSet.current.has(id) && !leaveTimers.current.has(id)) {
              leaveTimers.current.set(
                id,
                setTimeout(() => {
                  leaveTimers.current.delete(id);
                  liveSet.current.delete(id);
                  scheduleFlush();
                }, LEAVE_GRACE_MS),
              );
            }
          }
        }

        if (changed) scheduleFlush();
      },
      ioOpts,
    );

    observerRef.current = observer;
    setVirtualIoGeneration((g) => g + 1);

    return () => {
      observer.disconnect();
      observerRef.current = null;
      // Clean up timers
      for (const timer of leaveTimers.current.values()) clearTimeout(timer);
      leaveTimers.current.clear();
      if (batchRaf.current !== null) cancelAnimationFrame(batchRaf.current);
      batchRaf.current = null;
    };
  }, [disabled, scheduleFlush, intersectionRoot]);

  /** Ref callback for grid cells. Attach `data-virtual-id` and observe. */
  const observeCell = useCallback(
    (el: HTMLElement | null, id: string) => {
      if (!el || disabled) return;
      el.dataset.virtualId = id;
      observerRef.current?.observe(el);
    },
    [disabled],
  );

  return { visibleIds: disabled ? null : visibleIds, observeCell, virtualIoGeneration };
}