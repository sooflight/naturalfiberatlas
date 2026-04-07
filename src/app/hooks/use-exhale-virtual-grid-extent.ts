import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PlateType } from "../data/atlas-data";
import { DETAIL_FADE } from "../utils/detail-motion";
import { computeDetailGridRenderPlan } from "../utils/detail-slot-classes";
import { EXHALE_MAX_STAGGER } from "../utils/plate-layout";

/** Hold extra virtual grid rows after close so aspect-ratio shells do not collapse before exhale finishes. */
const EXHALE_GRID_HOLD_MS = DETAIL_FADE * 1000 + EXHALE_MAX_STAGGER * 1000 + 100;

/**
 * While detail mode is open, snapshots plate assignments. On real close (not the
 * brief null between fiber switches), keeps `filtered.length` padded for a short
 * window so virtual detail cells are not unmounted in the same frame as
 * `selectedId` clearing — avoids a document-height snap / CLS.
 */
export function useExhaleVirtualGridExtent(
  selectedId: string | null,
  filteredLength: number,
  plateAssignments: Map<number, PlateType>,
  /** True during handleSelectFiber's intermediate null before the next fiber opens */
  deferExhaleLayoutHold: boolean,
): number {
  const snapshotRef = useRef<{ fl: number; assign: Map<number, PlateType> } | null>(null);

  useLayoutEffect(() => {
    if (selectedId !== null) {
      snapshotRef.current = {
        fl: filteredLength,
        assign: new Map(plateAssignments),
      };
    }
  }, [selectedId, filteredLength, plateAssignments]);

  const [exhaleVirtualTail, setExhaleVirtualTail] = useState(0);
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    const was = prevSelectedRef.current;
    prevSelectedRef.current = selectedId;

    if (selectedId !== null) {
      setExhaleVirtualTail(0);
      return;
    }

    if (was === null || deferExhaleLayoutHold) return;

    const snap = snapshotRef.current;
    if (!snap) return;

    const { renderCellCount } = computeDetailGridRenderPlan(snap.fl, snap.assign, true);
    const tail = Math.max(0, renderCellCount - snap.fl);
    if (tail === 0) return;

    setExhaleVirtualTail(tail);
    const id = window.setTimeout(() => setExhaleVirtualTail(0), EXHALE_GRID_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [selectedId, deferExhaleLayoutHold]);

  return exhaleVirtualTail;
}
