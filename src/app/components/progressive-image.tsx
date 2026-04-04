/**
 * ProgressiveImage — two-tier LQIP blur-up image component.
 *
 * Renders a tiny low-quality placeholder (60x80, q_20 via the "lqip" preset)
 * immediately, with a CSS blur + slight scale-up. When the full-quality target
 * image finishes loading, it fades in on top and the blur dissolves.
 *
 * Uses the ImageTransformPipeline context to generate both URLs, so it works
 * with any CDN backend (Cloudinary, passthrough, etc.).
 *
 * Drop-in replacement for <ImageWithFallback> / <img> with an added `preset`
 * prop for the target quality tier.
 */

import { useState, useEffect, useRef, memo } from "react";
import { useImagePipeline } from "../context/image-pipeline";

interface ProgressiveImageProps {
  /** Raw (un-transformed) image URL */
  src: string | undefined;
  /** Target quality preset (grid, ambient, solo, lightbox, etc.) */
  preset: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  loading?: "lazy" | "eager";
  draggable?: boolean;
  /**
   * Skip LQIP and render the target directly.
   * Useful for images that are already tiny (e.g. glow preset).
   */
  skipLqip?: boolean;
  /**
   * Override object-fit on the images.
   * Default is "cover" (via CSS). Set to "contain" for lightbox usage.
   */
  objectFit?: "cover" | "contain";
}

/**
 * Module-level set of target URLs that have been fully loaded at least once.
 * Persists across mounts so re-rendered cards don't re-blur.
 */
const loadedUrls = new Set<string>();

/** How long (ms) to keep the LQIP mounted after the target loads,
 *  ensuring the 0.45s opacity transition covers the placeholder. */
const LQIP_LINGER_MS = 500;

export const ProgressiveImage = memo(function ProgressiveImage({
  src,
  preset,
  alt,
  className = "",
  style,
  loading = "lazy",
  draggable,
  skipLqip = false,
  objectFit,
}: ProgressiveImageProps) {
  const pipeline = useImagePipeline();

  const lqipSrc = pipeline.transform(src, "lqip");
  const targetSrc = pipeline.transform(src, preset);

  // Check if this target was already loaded in a previous mount
  const alreadyCached = !!(targetSrc && loadedUrls.has(targetSrc));
  const [targetLoaded, setTargetLoaded] = useState(alreadyCached);
  /** Delayed flag — stays true for LQIP_LINGER_MS after targetLoaded,
   *  preventing the LQIP from unmounting before the target's opacity
   *  transition completes. */
  const [lqipDismissed, setLqipDismissed] = useState(alreadyCached);
  const imgRef = useRef<HTMLImageElement>(null);

  // Skip LQIP entirely if the image is already cached or skipLqip is set
  const showLqip = !skipLqip && !alreadyCached && !lqipDismissed && !!lqipSrc;

  // Delayed LQIP dismiss — keep placeholder visible during target fade-in
  useEffect(() => {
    if (!targetLoaded || lqipDismissed) return;
    const timer = setTimeout(() => setLqipDismissed(true), LQIP_LINGER_MS);
    return () => clearTimeout(timer);
  }, [targetLoaded, lqipDismissed]);

  useEffect(() => {
    if (!targetSrc || alreadyCached) return;

    // Reset loaded state when target changes
    setTargetLoaded(false);
    setLqipDismissed(false);

    const img = new Image();
    img.src = targetSrc;

    if (img.complete && img.naturalWidth > 0) {
      // Already in browser cache (e.g. preloaded, or revisiting)
      loadedUrls.add(targetSrc);
      setTargetLoaded(true);
      return;
    }

    let cancelled = false;

    img.onload = () => {
      if (!cancelled) {
        loadedUrls.add(targetSrc);
        setTargetLoaded(true);
      }
    };

    img.onerror = () => {
      // On error, show whatever we have (LQIP or nothing)
      if (!cancelled) setTargetLoaded(true);
    };

    return () => {
      cancelled = true;
    };
  }, [targetSrc, alreadyCached]);

  if (!src) return null;

  const decorative = !alt.trim();

  return (
    <div
      className={`progressive-image-wrapper ${className}`}
      style={{ ...style, position: "relative", overflow: "hidden" }}
    >
      {/* LQIP placeholder — always rendered first, hidden after target loads */}
      {showLqip && (
        <img
          src={lqipSrc}
          alt=""
          aria-hidden
          className="progressive-image-lqip"
          draggable={false}
          style={objectFit ? { objectFit } : undefined}
        />
      )}

      {/* Target image — fades in over the placeholder */}
      <img
        ref={imgRef}
        src={targetLoaded ? targetSrc : undefined}
        alt={decorative ? "" : alt}
        aria-hidden={decorative ? true : undefined}
        className={`progressive-image-target ${targetLoaded ? "is-loaded" : ""}`}
        loading={loading}
        draggable={draggable}
        style={objectFit ? { objectFit } : undefined}
      />
    </div>
  );
});