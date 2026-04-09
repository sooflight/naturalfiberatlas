/**
 * Syncs the visible mobile webview height to `--atlas-vvh` (px).
 *
 * `100dvh` / `min-h-dvh` track the layout viewport; on Android Chrome (and
 * similar), the bottom toolbar often paints over content because the layout
 * viewport can remain taller than the visual viewport. `visualViewport.height`
 * matches what the user actually sees, so the shell can size to it.
 *
 * When `visualViewport` is missing or unset, consumers fall back via
 * `var(--atlas-vvh, 100dvh)` or the prior `min-height` cascade in theme.css.
 */
export const ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR = "--atlas-vvh";

export function installAtlasVisualViewportHeightSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const root = document.documentElement;

  const apply = () => {
    const vv = window.visualViewport;
    if (!vv) {
      root.style.removeProperty(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR);
      return;
    }
    /* Some engines disagree between layout (`innerHeight`) and visual height; use the smaller
     * so the shell never extends under browser chrome (e.g. Android Chrome bottom toolbar). */
    const h = Math.max(0, Math.min(vv.height, window.innerHeight));
    root.style.setProperty(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR, `${h}px`);
  };

  const applySoon = () => {
    apply();
    requestAnimationFrame(apply);
  };

  applySoon();

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", applySoon);
    vv.addEventListener("scroll", applySoon);
  }
  window.addEventListener("resize", applySoon);
  window.addEventListener("orientationchange", applySoon);
  window.addEventListener("pageshow", applySoon);
  document.addEventListener("visibilitychange", applySoon);

  return () => {
    if (vv) {
      vv.removeEventListener("resize", applySoon);
      vv.removeEventListener("scroll", applySoon);
    }
    window.removeEventListener("resize", applySoon);
    window.removeEventListener("orientationchange", applySoon);
    window.removeEventListener("pageshow", applySoon);
    document.removeEventListener("visibilitychange", applySoon);
    root.style.removeProperty(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR);
  };
}
