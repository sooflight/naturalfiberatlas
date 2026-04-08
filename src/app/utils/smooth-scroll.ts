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
 *
 * When `scrollRoot` is set (e.g. TopNav’s `overflow-y-auto` pane), geometry
 * and scrolling use that element instead of the window — required when the
 * grid does not use document scrolling.
 */
export function smoothScrollToIfNeeded(
  el: HTMLElement,
  delay = 100,
  scrollRoot?: HTMLElement | null,
): Promise<void> {
  const rect = el.getBoundingClientRect();
  if (rect.height <= 0 || rect.width <= 0) {
    return smoothScrollTo(el, delay, scrollRoot);
  }
  if (scrollRoot) {
    const rootRect = scrollRoot.getBoundingClientRect();
    if (rootRect.width > 0 && rootRect.height > 0) {
      const cx = rect.left + rect.width / 2 - rootRect.left;
      const cy = rect.top + rect.height / 2 - rootRect.top;
      const vw = rootRect.width;
      const vh = rootRect.height;
      const mx = vw * VIEW_INSET_RATIO;
      const my = vh * VIEW_INSET_RATIO;
      if (cx >= mx && cx <= vw - mx && cy >= my && cy <= vh - my) {
        return Promise.resolve();
      }
    }
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mx = vw * VIEW_INSET_RATIO;
    const my = vh * VIEW_INSET_RATIO;
    if (cx >= mx && cx <= vw - mx && cy >= my && cy <= vh - my) {
      return Promise.resolve();
    }
  }
  return smoothScrollTo(el, delay, scrollRoot);
}

export function smoothScrollTo(
  el: HTMLElement,
  delay = 300,
  scrollRoot?: HTMLElement | null,
): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      const rect = el.getBoundingClientRect();

      if (scrollRoot) {
        const rootRect = scrollRoot.getBoundingClientRect();
        const startY = scrollRoot.scrollTop;
        const contentY = startY + (rect.top - rootRect.top);
        const targetY =
          contentY - scrollRoot.clientHeight / 2 + rect.height / 2;
        const maxScroll = Math.max(
          0,
          scrollRoot.scrollHeight - scrollRoot.clientHeight,
        );
        const targetYClamped = Math.min(maxScroll, Math.max(0, targetY));
        const distance = Math.abs(targetYClamped - startY);
        const duration = Math.min(1100, Math.max(500, distance * 0.8));
        let start: number | null = null;

        const step = (ts: number) => {
          if (!start) start = ts;
          const elapsed = ts - start;
          const t = Math.min(elapsed / duration, 1);
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
          scrollRoot.scrollTop = startY + (targetYClamped - startY) * eased;
          if (t < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
        return;
      }

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
