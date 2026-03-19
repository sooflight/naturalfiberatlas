/**
 * Enriched image metadata for IIIF and other provenance-aware sources.
 * Backward-compatible: bare URL strings are still valid in ImageMap.
 */
export interface AtlasMedia {
  url: string;
  thumbUrl?: string;
  /** IIIF Image API base URL for deep-zoom tile sources */
  tileSource?: string;
  /** IIIF Presentation API manifest URL */
  sourceManifest?: string;
  rights?: string;
  attribution?: string;
  licenseUrl?: string;
  provider?: string;
  title?: string;
  width?: number;
  height?: number;
  upscaled?: boolean;
  originalDimensions?: { width: number; height: number };
}

export type ImageEntry = string | AtlasMedia;
export type ImageMap = Record<string, ImageEntry | ImageEntry[]>;

/** 
 * Extract the display URL from either a bare string or AtlasMedia object.
 * @deprecated Use extractImageUrl() from '@/utils/imageUrl' instead.
 */
export function mediaUrl(entry: ImageEntry): string {
  return typeof entry === "string" ? entry : entry.url;
}

/** 
 * Extract the thumbnail URL (falls back to main url).
 * @deprecated Use extractThumbUrl() from '@/utils/imageUrl' instead.
 */
export function mediaThumbUrl(entry: ImageEntry): string {
  if (typeof entry === "string") return entry;
  return entry.thumbUrl || entry.url;
}

/** 
 * Normalize an image map entry to a flat array of display URLs (backward-compat).
 * @deprecated Use toUrlArray() from '@/utils/imageUrl' instead.
 */
export function toUrlArray(value: ImageEntry | ImageEntry[] | undefined): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.map(mediaUrl);
  return [mediaUrl(value)];
}

/** 
 * Normalize an image map entry to a flat array of ImageEntry.
 * @deprecated Use toEntryArray() from '@/utils/imageUrl' instead.
 */
export function toEntryArray(value: ImageEntry | ImageEntry[] | undefined): ImageEntry[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value;
  return [value];
}

// ── Rich content types ──

export interface VideoEntry {
  url: string;
  provider?: "youtube" | "vimeo" | "cloudinary" | "direct";
  caption?: string;
  duration?: number;
  thumbUrl?: string;
}

export interface EmbedEntry {
  html: string;
  source?: string;
  caption?: string;
  url?: string;
}

export interface LinkEntry {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  tags?: string[];
}
