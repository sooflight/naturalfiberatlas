/**
 * ImageTransformPipeline — generic interface for on-the-fly image transforms.
 *
 * Components call `pipeline.transform(src, preset)` instead of a
 * host-specific helper like `cloudinaryUrl()`. This lets the visual system
 * work with any CDN / image host by swapping the pipeline implementation.
 */

/**
 * Preset names used by the glass-atlas component system.
 * Implementations should map these to host-specific transform parameters.
 */
export type GlassAtlasPreset =
  | "grid"         // Profile card thumbnail (3:4, ~320×427)
  | "glow"         // Edge-bleed glow — tiny blurred variant (~24×32)
  /** Small 3:4 fetch for canvas hue/brightness — higher quality than `glow`, same use as analysis input */
  | "hueProbe"
  | "lqip"         // Low-quality image placeholder (~60×80, q_20)
  | "ambient"      // GlassCard ambient underlayer (~400×534)
  | "filmstrip"    // Film-strip thumbnails (~220×293)
  /** Top nav portal / path / children thumbs — 4:3 to match CSS `aspect-ratio: 4/3` (~144×108, ~2× DPR vs 72px strip) */
  | "navThumb"
  | "seeAlso"      // Small square thumbnails in SeeAlso plate (~80×80)
  | "solo"         // Solo gallery plate image (~320×427)
  | "duo"          // Duo gallery plate image (~320×200)
  | "contactSheet" // Contact sheet grid (~320×320, covers 2× DPR for ~160px tiles)
  | "lightbox"     // Default lightbox hero (~1400w)
  | "lightboxHi";  // Large displays / browser fullscreen (~2200w)

/**
 * The core abstraction. One method, string in / string out.
 *
 * The `preset` parameter is typed as `string` (not `GlassAtlasPreset`)
 * so third-party implementations aren't forced to mirror the exact
 * vocabulary — they can define their own presets or ignore unknown ones.
 */
export interface ImageTransformPipeline {
  transform(src: string | undefined, preset: string): string | undefined;
}