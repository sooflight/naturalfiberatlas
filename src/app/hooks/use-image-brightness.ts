/**
 * Reactive hooks for image brightness & hue analysis.
 *
 * Core algorithm lives in utils/analyze-image.ts (shared with warmup).
 * This module owns the module-level cache and React state integration.
 */

import { useEffect, useSyncExternalStore } from "react";
import {
  analyzeImageElement,
  DEFAULT_IMAGE_ANALYSIS_FALLBACK,
  type ImageAnalysis,
} from "../utils/analyze-image";
import { precomputeFrostParams } from "../utils/frost-cache";

export type { ImageAnalysis } from "../utils/analyze-image";

const cache = new Map<string, ImageAnalysis>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

const pendingRequests = new Map<string, Promise<ImageAnalysis>>();

/**
 * Populate the cache externally — used by the warmup system (#6).
 */
export function populateCache(
  src: string,
  analysis: ImageAnalysis,
): void {
  if (!cache.has(src)) {
    cache.set(src, analysis);
    notify();
  }
}

/** Check if a URL is already in the analysis cache. */
export function isCached(src: string): boolean {
  return cache.has(src);
}

export function useImageBrightness(src: string | undefined): number | null {
  const analysis = useImageAnalysis(src);
  return analysis ? analysis.brightness : null;
}

export function useImageAnalysis(src: string | undefined): ImageAnalysis | null {
  const getSnapshot = () => (src && cache.has(src) ? cache.get(src)! : null);
  const result = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!src || cache.has(src)) return;

    if (!pendingRequests.has(src)) {
      const promise = new Promise<ImageAnalysis>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;

        img.onload = () => {
          const analysis = analyzeImageElement(img);
          cache.set(src, analysis);
          // Technique #1: populate frost cache on-demand for runtime analysis
          precomputeFrostParams(src, analysis);
          resolve(analysis);
          notify();
        };

        img.onerror = () => {
          cache.set(src, DEFAULT_IMAGE_ANALYSIS_FALLBACK);
          resolve(DEFAULT_IMAGE_ANALYSIS_FALLBACK);
          notify();
        };
      });
      pendingRequests.set(src, promise);
    }
  }, [src]);

  return result;
}
