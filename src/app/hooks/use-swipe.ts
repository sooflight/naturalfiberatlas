/**
 * useSwipe — Horizontal swipe gesture detection for touch devices.
 *
 * Returns a set of touch event handlers to spread onto the swipeable element,
 * plus a live `dragOffset` (px) for visual feedback during the gesture.
 *
 * Features:
 *  • Distance-based trigger (configurable, default 50 px)
 *  • Velocity-based trigger (fast flicks ≥ 0.4 px/ms even if short)
 *  • Locks to horizontal axis once intent is detected (|dx| > |dy| × 1.2)
 *  • Ignores vertical-dominant gestures so scroll isn't hijacked
 *  • Reports live dragOffset for rubber-band / parallax effects
 */

import { useRef, useState, useCallback, useEffect } from "react";

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: () => void;
}

export interface UseSwipeOptions {
  /** Minimum px to count as a completed swipe (default 50) */
  threshold?: number;
  /** Minimum velocity in px/ms to count as a flick (default 0.4) */
  velocityThreshold?: number;
  /** Called on swipe-left (i.e. finger moved left → navigate forward) */
  onSwipeLeft?: () => void;
  /** Called on swipe-right (i.e. finger moved right → navigate back) */
  onSwipeRight?: () => void;
  /** Disable the hook entirely */
  disabled?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  /** null = undecided, true = horizontal, false = vertical */
  isHorizontal: boolean | null;
}

export function useSwipe({
  threshold = 50,
  velocityThreshold = 0.4,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: UseSwipeOptions): { handlers: SwipeHandlers; dragOffset: number } {
  const touchRef = useRef<TouchState | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const frameRef = useRef(0);
  const pendingOffsetRef = useRef(0);

  const flushOffset = useCallback(() => {
    frameRef.current = 0;
    setDragOffset((prev) => (prev === pendingOffsetRef.current ? prev : pendingOffsetRef.current));
  }, []);

  const scheduleOffset = useCallback(
    (value: number) => {
      pendingOffsetRef.current = value;
      if (frameRef.current) return;
      frameRef.current = requestAnimationFrame(flushOffset);
    },
    [flushOffset],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isHorizontal: null,
      };
      scheduleOffset(0);
    },
    [disabled, scheduleOffset],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const state = touchRef.current;
      if (!state || disabled) return;

      const touch = e.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Decide intent once we have enough travel
      if (state.isHorizontal === null && (absDx > 8 || absDy > 8)) {
        state.isHorizontal = absDx > absDy * 1.2;
      }

      if (state.isHorizontal === false) {
        // Vertical scroll — bail out completely
        touchRef.current = null;
        scheduleOffset(0);
        return;
      }

      if (state.isHorizontal) {
        // Prevent vertical scroll while swiping horizontally
        e.preventDefault();
        // Apply rubber-band resistance beyond threshold
        const resist = absDx > threshold ? threshold + (absDx - threshold) * 0.3 : absDx;
        scheduleOffset(dx > 0 ? resist : -resist);
      }
    },
    [disabled, threshold, scheduleOffset],
  );

  const reset = useCallback(() => {
    touchRef.current = null;
    scheduleOffset(0);
  }, [scheduleOffset]);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = touchRef.current;
      if (!state || disabled || !state.isHorizontal) {
        reset();
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch.clientX - state.startX;
      const absDx = Math.abs(dx);
      const elapsed = Math.max(1, Date.now() - state.startTime);
      const velocity = absDx / elapsed; // px/ms

      const triggered = absDx >= threshold || velocity >= velocityThreshold;

      if (triggered) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }

      reset();
    },
    [disabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, reset],
  );

  const onTouchCancel = useCallback(() => reset(), [reset]);

  // Cleanup any scheduled frame when the hook owner unmounts.
  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    dragOffset,
  };
}
