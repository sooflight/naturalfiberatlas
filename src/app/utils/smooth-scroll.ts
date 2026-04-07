/**
 * Smooth scroll to center an element in the viewport.
 *
 * Uses a sine ease-in-out curve for perceptually smooth motion.
 * Duration is adaptive: 500ms–1100ms based on scroll distance.
 */

/** Element center lies in this inset from viewport edges → already comfortable, skip scroll */
const VIEW_INSET_RATIO = 0.12;

/**
 * Like `smoothScrollTo`, but no-ops when the element’s center is already
 * within the middle band of the viewport (reduces layout jank when opening
 * a profile that is already on-screen).
 */
export function smoothScrollToIfNeeded(el: HTMLElement, delay = 100): Promise<void> {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0 || rect.width <= 0) {
    return smoothScrollTo(el, delay);
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const mx = vw * VIEW_INSET_RATIO;
  const my = vh * VIEW_INSET_RATIO;
  if (cx >= mx && cx <= vw - mx && cy >= my && cy <= vh - my) {
    return Promise.resolve();
  }
  return smoothScrollTo(el, delay);
}

export function smoothScrollTo(el: HTMLElement, delay = 300): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const viewH = window.innerHeight;
      const targetY = scrollTop + rect.top - viewH / 2 + rect.height / 2;
      const startY = scrollTop;
      const distance = Math.abs(targetY - startY);
      const duration = Math.min(1100, Math.max(500, distance * 0.8));
      let start: number | null = null;

      const step = (ts: number) => {
        if (!start) start = ts;
        const elapsed = ts - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        window.scrollTo(0, startY + (targetY - startY) * eased);
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    }, delay);
  });
}
