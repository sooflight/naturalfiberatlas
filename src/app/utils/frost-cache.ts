/**
 * Frost Params Precomputation Cache — Optimization Technique #1
 *
 * Pre-computes the adaptive frost parameters (blur, saturate, brightness,
 * overlayOpacity, maskBottomOpacity) for every fiber image at warmup time,
 * keyed by glow-preset URL. When a DetailCard mounts, its GlassCard can
 * look up pre-computed frost params synchronously instead of waiting for
 * useImageBrightness to resolve → eliminates the null→computed flash
 * that causes the "inhale flicker" on first detail view.
 *
 * The cache is populated in two ways:
 *   1. Eagerly during warmUpImageAnalysis (idle-time batch)
 *   2. On-demand when useImageAnalysis returns a new value
 *
 * Consumers should use `getFrostParams()` for synchronous lookup
 * and `computeAndCacheFrost()` to populate from raw analysis data.
 */

import type { ImageAnalysis } from "./analyze-image";

export interface FrostParams {
  blur: number;
  saturate: number;
  brightness: number;
  overlayOpacity: number;
  maskBottomOpacity: number;
}

/**
 * Module-level frost cache: glowUrl → Map<densityKey, FrostParams>
 * densityKey is the contentDensity rounded to 2 decimal places.
 */
const frostCache = new Map<string, Map<string, FrostParams>>();

/** Standard density values used across the app (from detail-card.tsx) */
const KNOWN_DENSITIES = [
  0, 0.1, 0.3, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
];

/**
 * Compute frost params from raw inputs (mirrors GlassCard's useMemo logic).
 * Pure function — no side effects.
 */
function computeFrost(
  contentDensity: number,
  imgBrightness: number,
): FrostParams {
  const b = imgBrightness;
  const intensity = contentDensity * (0.4 + 0.6 * b);

  return {
    blur: 6 + 8 * intensity,
    saturate: 1 - 0.25 * intensity,
    brightness: 1 - 0.35 * intensity,
    overlayOpacity: 0.2 * intensity,
    maskBottomOpacity: 0.55 + 0.45 * intensity,
  };
}

/**
 * Pre-compute frost params for a given glow URL and image analysis,
 * across all known content densities. Called during warmup.
 */
export function precomputeFrostParams(
  glowUrl: string,
  analysis: ImageAnalysis,
): void {
  if (frostCache.has(glowUrl)) return;

  const densityMap = new Map<string, FrostParams>();
  for (const d of KNOWN_DENSITIES) {
    if (d === 0) continue; // density 0 means no frost
    densityMap.set(d.toFixed(2), computeFrost(d, analysis.brightness));
  }
  frostCache.set(glowUrl, densityMap);
}

/**
 * Synchronous lookup: get pre-computed frost params for a URL + density.
 * Returns null if not cached (fallback to runtime computation).
 */
export function getFrostParams(
  glowUrl: string | undefined,
  contentDensity: number,
): FrostParams | null {
  if (!glowUrl || contentDensity === 0) return null;
  const densityMap = frostCache.get(glowUrl);
  if (!densityMap) return null;
  return densityMap.get(contentDensity.toFixed(2)) ?? null;
}

/**
 * On-demand computation + caching. Used when a new analysis arrives
 * at runtime (cache miss during warmup).
 */
export function computeAndCacheFrost(
  glowUrl: string,
  analysis: ImageAnalysis,
  contentDensity: number,
): FrostParams {
  const params = computeFrost(contentDensity, analysis.brightness);

  let densityMap = frostCache.get(glowUrl);
  if (!densityMap) {
    densityMap = new Map();
    frostCache.set(glowUrl, densityMap);
  }
  densityMap.set(contentDensity.toFixed(2), params);

  return params;
}
