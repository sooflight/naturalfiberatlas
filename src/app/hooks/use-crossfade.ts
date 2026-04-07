import { useEffect, useMemo, useRef, useState } from "react";

const BASE_HOLD_MS = 6000;
const HOLD_SPREAD_MS = 3000;
/** Extra wait before the *first* advance only; keeps per-card hold/crossfade cadence unchanged after that. */
const INITIAL_DELAY_SPREAD_MS = 2500;
const CROSSFADE_MS = 3000;

interface UseCrossfadeOptions {
  id: string;
  imageCount: number;
  paused: boolean;
}

export interface CrossfadeState {
  activeIndex: number;
  previousIndex: number;
}

export function seededFloat(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function useCrossfade({ id, imageCount, paused }: UseCrossfadeOptions): CrossfadeState {
  const [state, setState] = useState<CrossfadeState>({ activeIndex: 0, previousIndex: 0 });
  const startedRef = useRef(false);

  const holdDurationMs = useMemo(
    () => BASE_HOLD_MS + seededFloat(id) * HOLD_SPREAD_MS,
    [id],
  );
  const initialDelayMs = useMemo(
    () => seededFloat(`${id}:delay`) * INITIAL_DELAY_SPREAD_MS,
    [id],
  );

  useEffect(() => {
    startedRef.current = false;
    setState({ activeIndex: 0, previousIndex: 0 });
  }, [id, imageCount]);

  useEffect(() => {
    if (paused || imageCount <= 1) return;

    const timeoutMs = startedRef.current
      ? holdDurationMs + CROSSFADE_MS
      : initialDelayMs + holdDurationMs;

    const timer = window.setTimeout(() => {
      setState((prev) => ({
        previousIndex: prev.activeIndex,
        activeIndex: (prev.activeIndex + 1) % imageCount,
      }));
      startedRef.current = true;
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [paused, imageCount, holdDurationMs, initialDelayMs, state.activeIndex]);

  return state;
}
