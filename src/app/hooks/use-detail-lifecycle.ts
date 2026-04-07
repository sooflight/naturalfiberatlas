/**
 * useDetailLifecycle — phased inhale for detail mode (single state machine).
 *
 * Phases map to CSS on `.detail-card-slot` (see getDetailSlotClassSuffix).
 *
 * Coherence: `phase` state can lag `selectedId` for a frame when opening or
 * switching fibers. We derive `phase` for consumers so slots never use `idle`
 * or a previous fiber's `settled` while a new `selectedId` is active (that
 * mismatch caused visible compositor / backdrop-filter glitching).
 *
 * useLayoutEffect: reset `pre_raster` before the browser paints the new
 * selection so the first painted frame already has correct slot modifiers.
 */

import { useState, useLayoutEffect, useRef } from "react";
import { afterPaint } from "../utils/paint-fence";
import { DETAIL_COMPOSITOR_SETTLE_MS } from "../utils/detail-motion";
import type { DetailInhalePhase } from "../utils/detail-slot-classes";

export type { DetailInhalePhase };

export interface DetailLifecycle {
  /** Safe to pass to getDetailSlotClassSuffix — coherent with selectedId */
  phase: DetailInhalePhase;
}

export function useDetailLifecycle(selectedId: string | null): DetailLifecycle {
  const [phase, setPhase] = useState<DetailInhalePhase>("idle");
  /** Which fiber id the `phase` machine last started for (layout effect) */
  const [phaseOwnerId, setPhaseOwnerId] = useState<string | null>(null);
  const phaseCleanupRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    phaseCleanupRef.current?.();
    phaseCleanupRef.current = null;

    if (selectedId === null) {
      setPhase("idle");
      setPhaseOwnerId(null);
      return;
    }

    setPhaseOwnerId(selectedId);
    setPhase("pre_raster");

    const cancelPhase1 = afterPaint(() => {
      setPhase("revealing");

      const cancelPhase2 = afterPaint(() => {
        setPhase("backdrop_on");
      });

      const settleTimer = setTimeout(() => {
        setPhase("settled");
      }, DETAIL_COMPOSITOR_SETTLE_MS);

      phaseCleanupRef.current = () => {
        cancelPhase2();
        clearTimeout(settleTimer);
      };
    });

    phaseCleanupRef.current = cancelPhase1;
    return () => {
      phaseCleanupRef.current?.();
      phaseCleanupRef.current = null;
    };
  }, [selectedId]);

  const coherentPhase: DetailInhalePhase =
    selectedId === null
      ? "idle"
      : phaseOwnerId !== selectedId
        ? "pre_raster"
        : phase;

  return { phase: coherentPhase };
}
