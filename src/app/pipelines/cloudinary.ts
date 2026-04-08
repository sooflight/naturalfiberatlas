/**
 * Cloudinary implementation of ImageTransformPipeline.
 *
 * Inserts on-the-fly resize/format parameters into Cloudinary URLs
 * so the CDN returns right-sized images instead of full-resolution originals.
 *
 * Remote `http(s)` URLs (Pinimg, shop CDNs, etc.) are resized via Cloudinary **fetch**
 * in **production** builds by default so grid/lightbox presets always receive
 * right-sized bytes. In development, fetch is off unless you set
 * `VITE_CLOUDINARY_FETCH_REMOTE=true` (matches prod) or rely on production mode.
 * Set `VITE_CLOUDINARY_FETCH_REMOTE=false` to force passthrough (e.g. debugging).
 * Requires remote fetch to be allowed on your Cloudinary cloud. Cloud name defaults
 * to `dawxvzlte` or `VITE_CLOUDINARY_CLOUD_NAME`.
 */

import type { ImageTransformPipeline, GlassAtlasPreset } from "./types";

const CLOUDINARY_BASE = "res.cloudinary.com";
const UPLOAD_SEGMENT = "/upload/";
const FETCH_SEGMENT = "/image/fetch/";

const DEFAULT_CLOUD_NAME = "dawxvzlte";

const PRESET_TRANSFORMS: Record<GlassAtlasPreset, string> = {
  grid:         "w_320,h_427,c_fill,f_auto,q_auto",
  glow:         "w_24,h_32,c_fill,f_auto,q_10",
  hueProbe:     "w_80,h_107,c_fill,f_auto,q_auto",
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
  const raw = import.meta.env.VITE_CLOUDINARY_FETCH_REMOTE;
  if (typeof raw === "string" && raw.trim() !== "") {
    const t = raw.trim().toLowerCase();
    if (t === "false" || t === "0" || t === "off") return false;
    if (t === "true" || t === "1" || t === "on") return true;
  }
  return import.meta.env.PROD;
}

/**
 * Re-apply delivery transforms to a stored `image/fetch/` URL (canonical data may omit
 * transforms). Drops any prior comma-separated transform segment(s) before the
 * percent-encoded remote URL.
 */
function rebuildFetchUrlWithTransforms(src: string, transforms: string): string | null {
  const m = /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/fetch\/(.*)$/i.exec(src.trim());
  if (!m) return null;
  const cn = m[1];
  const rest = m[2];
  const segments = rest.split("/");
  const encIdx = segments.findIndex(
    (s) => s.startsWith("http%3A") || s.startsWith("https%3A"),
  );
  if (encIdx === -1) return null;
  const remoteEncoded = segments.slice(encIdx).join("/");
  return `https://res.cloudinary.com/${cn}${FETCH_SEGMENT}${transforms}/${remoteEncoded}`;
}

export class CloudinaryPipeline implements ImageTransformPipeline {
  transform(src: string | undefined, preset: string): string | undefined {
    if (!src) return src;

    const transforms = PRESET_TRANSFORMS[preset as GlassAtlasPreset];
    if (!transforms) return src;

    if (src.includes(FETCH_SEGMENT)) {
      return rebuildFetchUrlWithTransforms(src, transforms) ?? src;
    }

    if (src.includes(CLOUDINARY_BASE)) {
      const idx = src.indexOf(UPLOAD_SEGMENT);
      if (idx === -1) return src;

      const insertPoint = idx + UPLOAD_SEGMENT.length;
      const before = src.slice(0, insertPoint);
      const after = src.slice(insertPoint);

      if (after.startsWith(`${transforms}/`)) return src;

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