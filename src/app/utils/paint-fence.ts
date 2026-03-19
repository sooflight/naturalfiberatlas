/**
 * Paint Fence — Optimization Technique #5
 *
 * Double-requestAnimationFrame fence that guarantees a full browser paint
 * cycle has completed before executing the callback. This ensures that
 * visual state changes (e.g. profile cards fading to opacity 0) have
 * been composited to the screen before triggering dependent operations
 * (e.g. detail cards starting their fade-in).
 *
 * Why double-rAF?
 *   - First rAF: scheduled callback runs just before the NEXT frame's paint
 *   - Second rAF: runs just before the frame AFTER that
 *   By the time the second rAF fires, the browser has guaranteed painted
 *   the state set before the first rAF.
 *
 * This eliminates the micro-task gap where profile fadeout and detail
 * fadein can overlap on the same composite, causing a flash of both
 * layers at intermediate opacity.
 */

/**
 * Execute `fn` after the next full paint cycle.
 * Returns a cleanup function that cancels pending frames.
 */
export function afterPaint(fn: () => void): () => void {
  let raf1: number | null = null;
  let raf2: number | null = null;

  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      raf1 = null;
      raf2 = null;
      fn();
    });
  });

  return () => {
    if (raf1 !== null) cancelAnimationFrame(raf1);
    if (raf2 !== null) cancelAnimationFrame(raf2);
  };
}

/**
 * Promise-based version: resolves after one full paint cycle.
 */
export function paintFence(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}
