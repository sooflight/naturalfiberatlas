/**
 * Cloudinary implementation of ImageTransformPipeline.
 *
 * Inserts on-the-fly resize/format parameters into Cloudinary URLs
 * so the CDN returns right-sized images instead of full-resolution originals.
 *
 * Optional: set `VITE_CLOUDINARY_FETCH_REMOTE=true` to serve arbitrary `http(s)`
 * image URLs through Cloudinary **fetch** delivery (same-origin-friendly, avoids
 * hotlink CORS issues in canvas/WebKit). Requires fetch to be allowed on your
 * Cloudinary cloud. Cloud name defaults to `dawxvzlte` or `VITE_CLOUDINARY_CLOUD_NAME`.
 */

import type { ImageTransformPipeline, GlassAtlasPreset } from "./types";

const CLOUDINARY_BASE = "res.cloudinary.com";
const UPLOAD_SEGMENT = "/upload/";
const FETCH_SEGMENT = "/image/fetch/";

const DEFAULT_CLOUD_NAME = "dawxvzlte";

const PRESET_TRANSFORMS: Record<GlassAtlasPreset, string> = {
  grid:         "w_320,h_427,c_fill,f_auto,q_auto",
  glow:         "w_24,h_32,c_fill,f_auto,q_10",
  lqip:         "w_60,h_80,c_fill,f_auto,q_20",
  ambient:      "w_400,h_534,c_fill,f_auto,q_60",
  filmstrip:    "w_220,h_293,c_fill,f_auto,q_auto",
  seeAlso:      "w_80,h_80,c_fill,f_auto,q_auto",
  solo:         "w_320,h_427,c_fill,f_auto,q_auto",
  duo:          "w_320,h_200,c_fill,f_auto,q_auto",
  /* ~320 square: sharp on 2× DPR for ~160px tiles; still tiny vs full originals */
  contactSheet: "w_320,h_320,c_fill,f_auto,q_auto",
  lightbox:     "w_1400,f_auto,q_auto",
  lightboxHi:   "w_2200,f_auto,q_auto",
};

function cloudName(): string {
  const n = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  return typeof n === "string" && n.trim() !== "" ? n.trim() : DEFAULT_CLOUD_NAME;
}

function fetchRemoteEnabled(): boolean {
  return import.meta.env.VITE_CLOUDINARY_FETCH_REMOTE === "true";
}

export class CloudinaryPipeline implements ImageTransformPipeline {
  transform(src: string | undefined, preset: string): string | undefined {
    if (!src) return src;
    if (src.includes(FETCH_SEGMENT)) return src;

    const transforms = PRESET_TRANSFORMS[preset as GlassAtlasPreset];
    if (!transforms) return src;

    if (src.includes(CLOUDINARY_BASE)) {
      const idx = src.indexOf(UPLOAD_SEGMENT);
      if (idx === -1) return src;

      const insertPoint = idx + UPLOAD_SEGMENT.length;
      const before = src.slice(0, insertPoint);
      const after = src.slice(insertPoint);

      if (/^[a-z]_/.test(after)) return src;

      return `${before}${transforms}/${after}`;
    }

    if (
      fetchRemoteEnabled() &&
      /^https?:\/\//i.test(src) &&
      !src.startsWith("data:") &&
      !src.startsWith("blob:")
    ) {
      const encoded = encodeURIComponent(src);
      return `https://res.cloudinary.com/${cloudName()}${FETCH_SEGMENT}${transforms}/${encoded}`;
    }

    return src;
  }
}

/** Singleton instance for convenience */
export const cloudinaryPipeline = new CloudinaryPipeline();