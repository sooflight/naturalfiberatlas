/**
 * Cloudinary implementation of ImageTransformPipeline.
 *
 * Inserts on-the-fly resize/format parameters into Cloudinary URLs
 * so the CDN returns right-sized images instead of full-resolution originals.
 *
 * **Stored `image/fetch/…` URLs:** Many clouds return 401 with
 * `x-cld-error: Images of type fetch are restricted in this account`.
 * By default this pipeline **decodes** those URLs to the underlying `https://` source
 * so the browser loads the origin CDN directly (same behavior as passthrough remotes).
 * Set `VITE_CLOUDINARY_PREFER_FETCH_DELIVERY=true` only if your Cloudinary account
 * allows remote fetch and you want delivery + transforms through `image/fetch/`.
 *
 * Remote `http(s)` URLs can be resized via Cloudinary **fetch** when
 * `VITE_CLOUDINARY_FETCH_REMOTE=true` **and** fetch is allowed on the account.
 * Default is passthrough for bare remote URLs. Cloud name defaults to `dawxvzlte`
 * or `VITE_CLOUDINARY_CLOUD_NAME`.
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
  navThumb:     "w_144,h_108,c_fill,f_auto,q_auto",
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
  return false;
}

/** When true, keep rebuilding `image/fetch/` URLs with transform segments (requires fetch enabled on the Cloudinary account). */
function preferFetchUrlDelivery(): boolean {
  const raw = import.meta.env.VITE_CLOUDINARY_PREFER_FETCH_DELIVERY;
  if (typeof raw === "string" && raw.trim() !== "") {
    const t = raw.trim().toLowerCase();
    return t === "true" || t === "1" || t === "on";
  }
  return false;
}

/**
 * For Cloudinary `image/fetch` delivery URLs, return the decoded original remote URL.
 * Mirrors {@link decodeCloudinaryFetchSourceUrl} in atlas-shared (kept here to avoid import cycles).
 */
function decodeFetchSourceHttpsUrl(url: string): string | null {
  const match = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/fetch\/(.+)$/i.exec(url.trim());
  if (!match) return null;

  const encodedTail = match[1];
  const segments = encodedTail.split("/");
  const encodedHttpIdx = segments.findIndex(
    (segment) => segment.startsWith("http%3A") || segment.startsWith("https%3A"),
  );
  if (encodedHttpIdx === -1) return null;

  const encodedUrl = segments.slice(encodedHttpIdx).join("/");
  try {
    const decoded = decodeURIComponent(encodedUrl);
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch {
    return null;
  }
  return null;
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
  /** Arrow so `pipeline.transform` can be passed as a callback without losing `this`. */
  transform = (src: string | undefined, preset: string): string | undefined => {
    return this.transformImpl(src, preset, false);
  };

  /**
   * @param fromDecodedFetch — inner URL after unwrapping `image/fetch/`; do not wrap again in Cloudinary fetch
   *   (avoids 401 when the account restricts fetch, and avoids useless double-fetch).
   */
  private transformImpl(
    src: string | undefined,
    preset: string,
    fromDecodedFetch: boolean,
  ): string | undefined {
    if (!src) return src;

    const transforms = PRESET_TRANSFORMS[preset as GlassAtlasPreset];
    if (!transforms) return src;

    if (src.includes(FETCH_SEGMENT)) {
      if (preferFetchUrlDelivery()) {
        return rebuildFetchUrlWithTransforms(src, transforms) ?? src;
      }
      const decoded = decodeFetchSourceHttpsUrl(src);
      if (decoded) {
        return this.transformImpl(decoded, preset, true);
      }
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
      !fromDecodedFetch &&
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