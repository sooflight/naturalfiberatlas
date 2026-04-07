import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * When selection clears, plate-layout delay maps recompute to empty.
 * Snapshot the last non-empty maps so AnimatePresence exit transitions
 * still read the prior stagger values.
 */
export function useExhaleLayoutSnapshot(
  selectedId: string | null,
  profileExhaleDelays: Map<number, number>,
  detailExhaleDelays: Map<number, number>,
): {
  profileDelaysRef: MutableRefObject<Map<number, number>>;
  detailDelaysRef: MutableRefObject<Map<number, number>>;
} {
  const profileDelaysRef = useRef<Map<number, number>>(new Map());
  const detailDelaysRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    if (selectedId && profileExhaleDelays.size > 0) {
      profileDelaysRef.current = new Map(profileExhaleDelays);
      detailDelaysRef.current = new Map(detailExhaleDelays);
    }
  }, [selectedId, profileExhaleDelays, detailExhaleDelays]);

  return { profileDelaysRef, detailDelaysRef };
}
