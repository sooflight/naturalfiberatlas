/**
 * Schedule a callback during browser idle time.
 *
 * Uses `requestIdleCallback` where available, falling back to `setTimeout`.
 * Consolidates the 3 repeated instances of this pattern across the codebase.
 */
export function scheduleIdle(
  fn: () => void,
  options?: { timeout?: number; fallbackMs?: number },
): void {
  const { timeout = 2000, fallbackMs = 200 } = options ?? {};
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, fallbackMs);
  }
}
