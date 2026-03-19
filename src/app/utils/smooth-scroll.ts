/**
 * Smooth scroll to center an element in the viewport.
 *
 * Uses a sine ease-in-out curve for perceptually smooth motion.
 * Duration is adaptive: 500ms–1100ms based on scroll distance.
 */

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
