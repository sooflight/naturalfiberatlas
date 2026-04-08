import type { DetailInhalePhase } from "./detail-slot-classes";

/** Keep this aligned with `.profile-layer.is-receding` in theme.css. */
export const PROFILE_RECEDE_SECONDS = 0.12;
const VIRTUAL_DETAIL_EARLY_MARGIN_PX = 800;

export interface VirtualDetailHydrationInput {
  detailInhalePhase: DetailInhalePhase;
  isVirtual: boolean;
  top: number;
  bottom: number;
  viewportHeight: number;
}

/**
 * During inhale, virtual/offscreen detail slots can be deferred to avoid
 * raster spikes that surface as flicker. Real (non-virtual) slots remain
 * immediate so around-focus content feels responsive.
 */
export function shouldHydrateDetailSlotDuringInhale(input: VirtualDetailHydrationInput): boolean {
  const { detailInhalePhase, isVirtual, top, bottom, viewportHeight } = input;
  if (!isVirtual) return true;
  if (detailInhalePhase === "settled" || detailInhalePhase === "idle") return true;
  return top < viewportHeight + VIRTUAL_DETAIL_EARLY_MARGIN_PX
    && bottom > -VIRTUAL_DETAIL_EARLY_MARGIN_PX;
}

/**
 * Keep detail shell opacity reveal behind profile recede to avoid one-frame
 * overlap flashes where both layers compete for compositing.
 */
export function computeDetailShellRevealDelay(
  detailDelaySeconds: number,
  prefersReducedMotion: boolean,
): number {
  if (prefersReducedMotion) return Math.max(0, detailDelaySeconds);
  return Math.max(0, detailDelaySeconds + PROFILE_RECEDE_SECONDS);
}
