/**
 * Passthrough (identity) implementation of ImageTransformPipeline.
 *
 * Returns URLs unchanged — useful as a default fallback or when
 * images are already pre-sized at the source.
 */

import type { ImageTransformPipeline } from "./types";

export class PassthroughPipeline implements ImageTransformPipeline {
  transform(src: string | undefined, _preset: string): string | undefined {
    return src;
  }
}

/** Singleton instance for convenience */
export const passthroughPipeline = new PassthroughPipeline();
