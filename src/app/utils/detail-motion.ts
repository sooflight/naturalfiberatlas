/**
 * Canonical timing for detail inhale / exhale and related glass effects.
 * Single source of truth for values that must stay aligned across TS and CSS.
 *
 * CSS sync: `src/styles/theme.css` — @keyframes detail-content-reveal duration
 * must match DETAIL_CONTENT_FADE_SECONDS.
 */

/** Detail card opacity transition (seconds), used by Motion exit and plate-layout math */
export const DETAIL_FADE = 0.528;

export const EXHALE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Inner plate content fade (seconds) — mirror in theme.css `.detail-content-fade` */
export const DETAIL_CONTENT_FADE_SECONDS = 0.528;

/**
 * After inhale, hold compositor hints until glass / stagger quiesce.
 * Matches GlassCard specular sweep cleanup window.
 */
export const DETAIL_COMPOSITOR_SETTLE_MS = 2400;

export const GLASS_SPECULAR_SWEEP_MS = DETAIL_COMPOSITOR_SETTLE_MS;
