/**
 * Image Analysis Warmup — Optimization #6 (pre-computed image brightness).
 *
 * Proactively analyses all fiber hero images during browser idle time,
 * populating the module-level cache in `use-image-brightness.ts` BEFORE
 * any detail card mounts.
 *
 * Without warmup:
 *   1. User selects a fiber -> 10 detail cards mount
 *   2. Each GlassCard calls useImageBrightness -> triggers Image load + canvas draw
 *   3. 10 HTTP requests for 24x32 glow images + 10 canvas draws
 *   4. Each resolves asynchronously -> re-render to update frost params
 *
 * With warmup:
 *   1. On app mount, idle callback starts analysing all 119 glow images
 *   2. By the time user selects a fiber (~2-5s browsing), most/all are cached
 *   3. useImageBrightness finds value in cache -> returns synchronously
 *   4. No Image loads, no canvas draws, no re-renders during detail mode
 *
 * The warmup processes images in batches of 4 (parallel), with idle-callback
 * scheduling between batches to avoid blocking the main thread.
 */

import type { ImageTransformPipeline } from "../pipelines/types";
import { analyzeImageUrl } from "./analyze-image";
import { populateCache, isCached } from "../hooks/use-image-brightness";
import { precomputeFrostParams } from "./frost-cache";
import { scheduleIdle } from "./schedule-idle";

/** How many images to analyse in parallel per idle callback */
const DEFAULT_BATCH_SIZE = 4;

/** How many ambient images to pre-decode in parallel per idle callback */
const DEFAULT_DECODE_BATCH_SIZE = 3;

/**
 * Module-level set of ambient URLs whose decode has been initiated.
 * Prevents duplicate decode work across multiple warmup calls.
 */
const decodedUrls = new Set<string>();

export interface WarmupPolicy {
  skip: boolean;
  startDelayMs: number;
  analysisBatchSize: number;
  decodeBatchSize: number;
}

export function getWarmupPolicy(): WarmupPolicy {
  if (typeof navigator === "undefined") {
    return {
      skip: false,
      startDelayMs: 2500,
      analysisBatchSize: DEFAULT_BATCH_SIZE,
      decodeBatchSize: DEFAULT_DECODE_BATCH_SIZE,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType ?? "";
  const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;

  if (connection?.saveData || /(^2g$|slow-2g)/.test(effectiveType)) {
    return { skip: true, startDelayMs: 0, analysisBatchSize: 0, decodeBatchSize: 0 };
  }

  if (effectiveType === "3g" || lowCpu || lowMemory) {
    return {
      skip: false,
      startDelayMs: 4200,
      analysisBatchSize: 2,
      decodeBatchSize: 1,
    };
  }

  return {
    skip: false,
    startDelayMs: 2500,
    analysisBatchSize: DEFAULT_BATCH_SIZE,
    decodeBatchSize: DEFAULT_DECODE_BATCH_SIZE,
  };
}

/**
 * Schedule analysis of all fiber images during idle time.
 *
 * @param imageUrls — raw image URLs for all fiber hero images
 * @param pipeline — the image transform pipeline to use for generating glow-preset URLs
 */
export function warmUpImageAnalysis(imageUrls: string[], pipeline: ImageTransformPipeline): void {
  const policy = getWarmupPolicy();
  if (policy.skip) return;

  // Generate glow-preset URLs (24x32 — same as useImageBrightness uses)
  // Skip any URLs already in the cache (e.g. from prior analysis)
  const glowUrls = imageUrls
    .map((url) => pipeline.transform(url, "glow"))
    .filter((url): url is string => !!url && !isCached(url));

  let index = 0;

  function processBatch() {
    if (index >= glowUrls.length) return;

    const batch = glowUrls.slice(index, index + policy.analysisBatchSize);
    index += policy.analysisBatchSize;

    // Process batch in parallel
    Promise.all(
      batch.map((url) =>
        analyzeImageUrl(url).then((analysis) => {
          populateCache(url, analysis);
          // Technique #1: Pre-compute frost params for all density values
          precomputeFrostParams(url, analysis);
        }),
      ),
    ).then(() => {
      if (index < glowUrls.length) {
        scheduleIdle(processBatch, { timeout: 5000, fallbackMs: 100 });
      }
    });
  }

  // Start the first batch during idle time
  scheduleIdle(processBatch, { timeout: 3000, fallbackMs: 1000 });

  // Technique #3: Pre-decode ambient-preset images during idle time.
  // This primes the browser's image decoder cache so that when detail
  // cards mount and GlassCard renders ambient images, the decode is
  // already done — no decode jank during the opacity animation.
  preDecodeAmbientImages(imageUrls, pipeline, policy.decodeBatchSize);
}

/**
 * Technique #3: Ambient Image Pre-Decode
 *
 * Schedules decode of ambient-preset images (400×534) via Image.decode().
 * Once decoded, the browser caches the decoded bitmap — subsequent
 * <img> renders of the same URL skip the decode step entirely.
 *
 * Processes in small batches via idle callbacks to avoid blocking.
 */
function preDecodeAmbientImages(
  imageUrls: string[],
  pipeline: ImageTransformPipeline,
  decodeBatchSize: number,
): void {
  const ambientUrls = imageUrls
    .map((url) => pipeline.transform(url, "ambient"))
    .filter((url): url is string => !!url && !decodedUrls.has(url));

  if (ambientUrls.length === 0) return;

  let idx = 0;

  function decodeBatch() {
    if (idx >= ambientUrls.length) return;

    const batch = ambientUrls.slice(idx, idx + decodeBatchSize);
    idx += decodeBatchSize;

    Promise.allSettled(
      batch.map((url) => {
        if (decodedUrls.has(url)) return Promise.resolve();
        decodedUrls.add(url);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;

        // img.decode() returns a promise that resolves when the image
        // is fully decoded and ready for rasterization — no jank when
        // the browser later composites it into a layer.
        if (typeof img.decode === "function") {
          return img.decode().catch(() => {
            /* decode failure is non-fatal — image will decode on-demand */
          });
        }

        // Fallback for browsers without decode(): just let the load happen
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }),
    ).then(() => {
      if (idx < ambientUrls.length) {
        scheduleIdle(decodeBatch, { timeout: 8000, fallbackMs: 200 });
      }
    });
  }

  // Start ambient decode after analysis warmup has had a head start
  scheduleIdle(decodeBatch, { timeout: 5000, fallbackMs: 2000 });
}

const preloadedContactSheet = new Set<string>();

/**
 * Prime the HTTP cache for contact-sheet–sized gallery URLs when a fiber is selected,
 * so ProgressiveImage often hits a warm cache on first paint.
 */
export function preloadContactSheetTargets(
  rawUrls: string[],
  pipeline: ImageTransformPipeline,
  options?: { max?: number },
): void {
  const max = options?.max ?? 40;
  let count = 0;
  for (const raw of rawUrls) {
    if (count >= max) break;
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const target = pipeline.transform(trimmed, "contactSheet");
    if (!target || preloadedContactSheet.has(target)) continue;
    preloadedContactSheet.add(target);
    count += 1;
    const img = new Image();
    img.src = target;
  }
}