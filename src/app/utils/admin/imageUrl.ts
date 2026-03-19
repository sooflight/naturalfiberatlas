/**
 * Unified image URL handling utilities.
 * Consolidates 5+ implementations across the codebase into a single source of truth.
 * 
 * @module imageUrl
 */

import type { ImageEntry, AtlasMedia } from '@/types/atlas-media';

// ── URL Extraction ─────────────────────────────────────────

/**
 * Extract the display URL from either a bare string or AtlasMedia object.
 * This is the canonical implementation - use this instead of mediaUrl() or entryUrl().
 */
export function extractImageUrl(entry: ImageEntry): string {
  if (!entry) return '';
  return typeof entry === 'string' ? entry : entry.url;
}

/**
 * Extract the thumbnail URL, falling back to the main URL if no thumb is specified.
 */
export function extractThumbUrl(entry: ImageEntry): string {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.thumbUrl || entry.url;
}

// ── Array Normalization ────────────────────────────────────

/**
 * Normalize an image map entry to a flat array of display URLs.
 * Handles: undefined, single string, single AtlasMedia, arrays of either.
 * 
 * @deprecated Use toUrlArray() instead (alias for backward compatibility)
 */
export function normalizeToArray(value: ImageEntry | ImageEntry[] | undefined): string[] {
  return toUrlArray(value);
}

/**
 * Normalize an image map entry to a flat array of display URLs.
 * This is the canonical implementation - use this instead of all other variants.
 */
export function toUrlArray(value: ImageEntry | ImageEntry[] | undefined): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.map(extractImageUrl);
  return [extractImageUrl(value)];
}

/**
 * Normalize an image map entry to a flat array of ImageEntry objects.
 * Preserves the original type (string or AtlasMedia) in the result.
 */
export function toEntryArray(value: ImageEntry | ImageEntry[] | undefined): ImageEntry[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value;
  return [value];
}

// ── URL Normalization & Cleaning ───────────────────────────

/**
 * Normalize a URL by removing hash fragments and trailing slashes.
 * Used for deduplication comparisons.
 */
export function normalizeImageUrl(url: string): string {
  try {
    const trimmed = url.trim();
    if (!trimmed) return '';
    const u = new URL(trimmed);
    u.hash = '';
    let path = u.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    // Fallback for invalid URLs
    return url.trim().replace(/\/+$/, '');
  }
}

/**
 * Check if a URL is valid (parsable).
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}

// ── Provider-Specific Transformations ──────────────────────

/**
 * Upgrade an Unsplash URL to a higher resolution.
 * Only transforms if the URL contains 'unsplash.com'.
 */
export function upgradeUnsplashResolution(url: string, width: number): string {
  if (!url?.includes('unsplash.com')) return url;
  return url
    .replace(/w=[0-9]+/, `w=${width}`)
    .replace(/q=[0-9]+/, 'q=80');
}

/**
 * Strip Cloudinary crop/transform parameters from a URL.
 * Returns the base upload URL without transformation segments.
 */
export function stripCloudinaryTransform(url: string): string {
  if (!url?.includes('cloudinary')) return url;
  return url.replace(/\/c_crop,[^/]+\//, '/');
}

/**
 * Check if a URL is a Cloudinary URL.
 */
export function isCloudinaryUrl(url: string): boolean {
  return /https?:\/\/res\.cloudinary\.com\//.test(url);
}

/**
 * Build a Cloudinary URL from a public ID and options.
 */
export function buildCloudinaryUrl(
  publicId: string,
  options?: { width?: number; height?: number; crop?: string; quality?: number }
): string {
  // This is a placeholder - actual implementation depends on your Cloudinary setup
  const { width, height, crop, quality } = options || {};
  let transform = '';
  if (width || height) {
    const w = width ? `,w_${width}` : '';
    const h = height ? `,h_${height}` : '';
    const c = crop ? `,c_${crop}` : ',c_limit';
    transform = `/c_crop${c}${w}${h}`;
  }
  if (quality) {
    transform += `/q_${quality}`;
  }
  return `https://res.cloudinary.com/image/upload${transform}/${publicId}`;
}

// ── Backward Compatibility Aliases ───────────────────────────

/** @deprecated Use extractImageUrl() instead */
export const mediaUrl = extractImageUrl;

/** @deprecated Use extractThumbUrl() instead */
export const mediaThumbUrl = extractThumbUrl;

/** @deprecated Use toEntryArray() instead */
export const toMediaArray = toEntryArray;
