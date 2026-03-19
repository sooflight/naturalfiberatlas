/**
 * useDetailLifecycle — 4-phase inhale/exhale lifecycle for detail mode.
 *
 * Phase 1 (primed):     compositor layers promoted via will-change
 * Phase 2 (revealed):   detail cards begin opacity transition
 * Phase 3 (backdrop):   backdrop-filter enabled
 * Phase 4 (settled):    will-change reclaimed, VRAM released
 *
 * On exhale (selectedId → null), all flags reset immediately.
 */

import { useState, useEffect, useRef } from "react";
import { afterPaint } from "../utils/paint-fence";

export interface DetailLifecycle {
  detailRevealed: boolean;
  detailPrimed: boolean;
  backdropActive: boolean;
  detailSettled: boolean;
}

export function useDetailLifecycle(selectedId: string | null): DetailLifecycle {
  const [detailRevealed, setDetailRevealed] = useState(false);
  const [detailPrimed, setDetailPrimed] = useState(false);
  const [backdropActive, setBackdropActive] = useState(false);
  const [detailSettled, setDetailSettled] = useState(false);
  const phaseCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    phaseCleanupRef.current?.();
    phaseCleanupRef.current = null;

    if (selectedId === null) {
      setDetailRevealed(false);
      setDetailPrimed(false);
      setBackdropActive(false);
      setDetailSettled(false);
      return;
    }

    // Inhale — start phased lifecycle
    setDetailRevealed(false);
    setDetailPrimed(false);
    setBackdropActive(false);
    setDetailSettled(false);

    // Phase 1: after paint fence, prime compositor + reveal cards
    const cancelPhase1 = afterPaint(() => {
      setDetailPrimed(true);
      setDetailRevealed(true);

      // Phase 2: enable backdrop-filter after detail cards started animating
      const cancelPhase2 = afterPaint(() => {
        setBackdropActive(true);
      });

      // Phase 3: settle — reclaim VRAM after animations complete
      const settleTimer = setTimeout(() => {
        setDetailSettled(true);
      }, 2400);

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

  return { detailRevealed, detailPrimed, backdropActive, detailSettled };
}
