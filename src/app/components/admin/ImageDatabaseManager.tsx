/**
 * ImageDatabaseManager - Admin interface for managing Atlas image collections.
 *
 * Fully restored with all original features plus recovered enhancements:
 * - Fullscreen Storyboard view
 * - Scout icon in top right
 * - All profiles expanded by default with Collapse All button
 * - Click image to open lightbox
 * - Right-click context menu with all actions
 * - Frame icon (paste clipboard)
 * - Link icon (display all image links)
 * - Bulk operations (select all, bulk delete, bulk tag)
 * - Category filter sidebar
 * - Enhanced keyboard shortcuts
 * - Advanced context menu actions
 */

import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ATLAS_IMAGES,
  ATLAS_TAGS as CANONICAL_TAGS,
  PROFILE_ERA as CANONICAL_ERA,
  PROFILE_ORIGINS as CANONICAL_ORIGINS,
  SCIENTIFIC_NAMES as CANONICAL_SCIENTIFIC,
} from '@/data/atlas-images';
import { logActivity } from '@/utils/activityLog';
import {
  canApplyCloudinaryCrop,
  isCloudinaryUrl,
  requestCloudinaryUpscale,
  uploadFromUrl,
  uploadToCloudinary,
} from '@/utils/cloudinary';
import { copyImageFromUrl } from '@/utils/clipboardImage';
import { AdminProfileStoryboard } from './AdminProfileStoryboard';
import { useAdminSettings } from '@/contexts/AdminSettingsContext';
import { useAdminSave } from '@/contexts/AdminSaveContext';
import { extractImageUrl, isCloudinaryUploadDeliveryUrl, toEntryArray, toUrlArray } from '@/utils/imageUrl';
import { syncImageCatalogToDisk } from '@/utils/imageCatalogDiskSync';
import { extractFirstImageUrlFromClipboardText } from '@/utils/paste-image-urls';
import { useDebounce } from '@/utils/debounce';
import { MATERIAL_PASSPORTS } from '@/data/material-passports';
import { mutateAdminStatus } from '@/utils/adminStatusApi';
import {
  readPassportStatusOverrides,
  subscribePassportStatusOverrides,
  writePassportStatusOverride,
} from '@/utils/passportStatusOverrides';
import { Brain, Crosshair } from 'lucide-react';
import { cn } from '@/database-interface/lib/utils';
import { useAtlasData } from '../../context/atlas-data-context';
import { mergeFiberGalleryWithFallback, type FiberProfile } from '../../data/atlas-data';
import type { GalleryImageEntry } from '../../data/fibers';
import { dataSource } from '../../data/data-provider';
import { atlasNavigation as runtimeAtlasNavigation, type NavNode } from '../../data/admin/atlas-navigation';
import { buildNodeDraftProfiles, flattenNavigationNodes } from '../../data/admin/node-draft-profiles';
import {
  NAVIGATION_PARENT_LABEL,
  partitionByNavigationParent,
  sortProfileIdsByCanonicalOrder,
} from '../../data/profile-sequencing';
import { RECOVERED_ARCHIVED_PROFILE_IDS } from '../../data/recovered-archived-profiles';
import '@/styles/admin.css';

// Extracted modules
import { ImageLightbox, useImageHistory } from './image-database';
import type { ImageEntry, ImageMap, TagMap, RelationMap, LightboxData } from './image-database';
import { UploadQueuePanel, type UploadQueueItem } from './upload-queue-panel';
import {
  buildPreviewImageSrc,
  buildPreviewSrcSet,
  getPreviewPreset,
  getPreviewSizes,
} from "./image-preview-utils";
import { ProfileStatusCircle } from "./ProfileStatusCircle";
import { PreviewFocalEditor } from "./PreviewFocalEditor";
import { SEEDED_TAG_PATHS } from "./image-tag-paths";
import { galleryUrlDedupeKey } from "../../utils/gallery-url-dedupe";
import { clamp01, previewFocalToObjectPosition, type PreviewFocalPoint } from "../../utils/preview-focal";

// ── Constants ────────────────────────────────────────────

const SEARCH_DEBOUNCE_MS = 150;
const ZOOM_DEFAULT = 120;
const INTERNAL_IMAGE_REORDER_MIME = 'application/x-atlas-image-reorder';
const PRIORITY_PREVIEW_COUNT = 4;
/** First N atlas images can store a custom grid preview focal point. */
const PREVIEW_FOCAL_SLOT_COUNT = 3;
const NAV_PARENT_IMAGES_KEY = "atlas:nav-parent-images";

type UploadTaskSource =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string };

interface ProfileUploadTask extends UploadQueueItem {
  profileKey: string;
  source: UploadTaskSource;
  resultUrl?: string;
}

// ── Atlas Order Helpers ──────────────────────────────────

export function isProfileLive(status: string | null | undefined): boolean {
  return status === 'published';
}

export function toDisplayProfileState(status: string | null | undefined): "live" | "archived" {
  return isProfileLive(status) ? "live" : "archived";
}

function getProfileStatusWithFallback(
  profileKey: string,
  getFiberById: (id: string) => { status?: string } | undefined
): string {
  const fromFiber = getFiberById(profileKey)?.status;
  if (fromFiber) return fromFiber;
  const fromOverrides = readPassportStatusOverrides()[profileKey];
  if (fromOverrides) return fromOverrides;
  const fromPassports = MATERIAL_PASSPORTS[profileKey]?.status;
  return fromPassports ?? "archived";
}

function withRecordValue<T>(prev: Record<string, T>, key: string, value: T | undefined): Record<string, T> {
  if (value === undefined) {
    const rest = { ...prev };
    delete rest[key];
    return rest;
  }
  return { ...prev, [key]: value };
}

interface ToggleProfilePublishStatusParams {
  profileKey: string;
  profileId: string;
  currentStatus: string | null | undefined;
  previousOverrideStatus?: string;
  requestVersion?: number;
  isLatestRequestVersion?: (profileKey: string, requestVersion: number) => boolean;
  setStatusOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSavingByKey: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setErrorByKey: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  mutateStatus?: typeof mutateAdminStatus;
  persistStatusOverride?: (profileKey: string, status: string) => void;
}

export async function toggleProfilePublishStatus({
  profileKey,
  profileId,
  currentStatus,
  previousOverrideStatus: _previousOverrideStatus,
  requestVersion,
  isLatestRequestVersion,
  setStatusOverrides,
  setSavingByKey,
  setErrorByKey,
  mutateStatus = mutateAdminStatus,
  persistStatusOverride = writePassportStatusOverride,
}: ToggleProfilePublishStatusParams): Promise<void> {
  const shouldApplyResponse = () => {
    if (requestVersion === undefined || !isLatestRequestVersion) return true;
    return isLatestRequestVersion(profileKey, requestVersion);
  };
  const nextStatus = currentStatus === "published" ? "archived" : "published";

  setStatusOverrides((prev) => ({ ...prev, [profileKey]: nextStatus }));
  setSavingByKey((prev) => ({ ...prev, [profileKey]: true }));
  setErrorByKey((prev) => withRecordValue(prev, profileKey, undefined));
  // Persist immediately so local status is saved before network settles.
  persistStatusOverride(profileKey, nextStatus);

  try {
    await mutateStatus({
      type: 'passport',
      id: profileId,
      status: nextStatus,
    });
  } catch {
    if (!shouldApplyResponse()) return;
    setErrorByKey((prev) => withRecordValue(prev, profileKey, undefined));
  } finally {
    if (shouldApplyResponse()) {
      setSavingByKey((prev) => ({ ...prev, [profileKey]: false }));
    }
  }
}

interface SortKeysOptions {
  keys: string[];
  canonicalOrder: string[];
}

export function sortKeysByCanonicalOrder(options: SortKeysOptions): string[] {
  const { keys, canonicalOrder } = options;
  const canonicalSorted = sortProfileIdsByCanonicalOrder(keys, canonicalOrder);
  const { regular, navigationParents } = partitionByNavigationParent(canonicalSorted);
  return [...regular, ...navigationParents];
}

export function sortFilteredProfileKeys(options: SortKeysOptions): string[] {
  return sortKeysByCanonicalOrder(options);
}

export function getEffectiveProfileZoom(zoom: number, viewMode: 'cards' | 'grid' | 'list'): number {
  if (viewMode !== 'grid') return zoom;
  return Math.max(120, Math.min(zoom, 220));
}

function urlsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function galleryRowToImageEntry(e: GalleryImageEntry): ImageEntry {
  const u = typeof e.url === "string" ? e.url.trim() : "";
  if (!u) return "";
  if (e.previewFocal && Number.isFinite(e.previewFocal.x) && Number.isFinite(e.previewFocal.y)) {
    return { url: u, previewFocal: { x: clamp01(e.previewFocal.x), y: clamp01(e.previewFocal.y) } };
  }
  return u;
}

function coerceImageMapValue(entries: ImageEntry[]): ImageEntry | ImageEntry[] {
  const clean = entries.filter((e) => extractImageUrl(e).trim().length > 0);
  if (clean.length === 0) return [];
  if (clean.length === 1) return clean[0];
  return clean;
}

function gallerySyncSignature(value: ImageEntry | ImageEntry[] | undefined): string {
  if (value === undefined) return "[]";
  const arr = toEntryArray(value);
  return JSON.stringify(
    arr.map((e) => {
      const u = extractImageUrl(e).trim();
      if (typeof e === "string") return { u, f: null as null | { x: number; y: number } };
      const p = (e as { previewFocal?: PreviewFocalPoint }).previewFocal;
      const f =
        p && Number.isFinite(p.x) && Number.isFinite(p.y)
          ? { x: Math.round(clamp01(p.x) * 10000) / 10000, y: Math.round(clamp01(p.y) * 10000) / 10000 }
          : null;
      return { u, f };
    }),
  );
}

function imageMapsEqualForSync(a: ImageMap, b: ImageMap): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (gallerySyncSignature(a[k]) !== gallerySyncSignature(b[k])) return false;
  }
  return true;
}

function imageEntryToGalleryImageEntry(e: ImageEntry): GalleryImageEntry {
  const url = extractImageUrl(e).trim();
  const base: GalleryImageEntry = { url };
  if (typeof e !== "string" && e && typeof e === "object" && "previewFocal" in e) {
    const p = (e as { previewFocal?: PreviewFocalPoint }).previewFocal;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      base.previewFocal = { x: clamp01(p.x), y: clamp01(p.y) };
    }
  }
  return base;
}

function resolveImageEntries(
  source: ImageMap,
  key: string,
  getFiberById: (id: string) => Pick<FiberProfile, "id" | "galleryImages" | "image"> | undefined,
): ImageEntry[] {
  const raw = source[key];
  if (raw !== undefined) {
    const arr = toEntryArray(raw);
    if (!arr.some((e) => extractImageUrl(e).trim().length > 0)) {
      return [];
    }
    return arr;
  }
  const fiber = getFiberById(key);
  if (fiber && Array.isArray(fiber.galleryImages)) {
    const merged = mergeFiberGalleryWithFallback(key, fiber as FiberProfile)
      .map(galleryRowToImageEntry)
      .filter((e) => extractImageUrl(e).trim().length > 0);
    if (merged.length > 0) return merged;
    return getFiberImageUrls(fiber).map((url) => url.trim()).filter((url) => url.length > 0);
  }
  return [];
}

function dedupeImageEntriesPreserveOrder(entries: ImageEntry[]): ImageEntry[] {
  const seen = new Set<string>();
  const out: ImageEntry[] = [];
  for (const e of entries) {
    const u = extractImageUrl(e).trim();
    if (!u) continue;
    const k = galleryUrlDedupeKey(u);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

/**
 * Resolve the gallery row Image Base should show / mutate for `key`.
 * When the sidebar selection matches `key`, use merged fiber+catalog data only if local
 * `atlas-images` is empty or clearly stale; otherwise trust local rows so deletes persist.
 */
export function resolveDisplayImageEntriesForKey(
  source: ImageMap,
  key: string,
  activeNodeId: string | null,
  getFiberById: (id: string) => Pick<FiberProfile, "id" | "galleryImages" | "image"> | undefined,
): ImageEntry[] {
  const raw = source[key];
  if (raw !== undefined && !toEntryArray(raw).some((e) => extractImageUrl(e).trim().length > 0)) {
    return [];
  }
  if (activeNodeId === key && isGalleryBackedFiberProfile(getFiberById(key))) {
    const fiber = getFiberById(key)!;
    const merged = mergeFiberGalleryWithFallback(key, fiber as FiberProfile)
      .map(galleryRowToImageEntry)
      .filter((e) => extractImageUrl(e).trim().length > 0);
    const mergedUrls = merged.map((e) => extractImageUrl(e).trim());
    const localEntries =
      raw !== undefined
        ? toEntryArray(raw).filter((e) => extractImageUrl(e).trim().length > 0)
        : [];
    const localUrls = localEntries.map((e) => extractImageUrl(e).trim());
    if (merged.length === 0) return dedupeImageEntriesPreserveOrder(localEntries);
    if (localUrls.length === 0) return dedupeImageEntriesPreserveOrder(merged);
    if (shouldPreferLocalFiberImageRow(localUrls, mergedUrls)) {
      return dedupeImageEntriesPreserveOrder(localEntries);
    }
    return dedupeImageEntriesPreserveOrder(merged);
  }
  return dedupeImageEntriesPreserveOrder(resolveImageEntries(source, key, getFiberById));
}

function getFiberImageUrls(fiber: { galleryImages?: Array<{ url?: string }>; image?: string }): string[] {
  const fromGallery = (fiber.galleryImages ?? [])
    .map((entry) => (typeof entry?.url === 'string' ? entry.url.trim() : ''))
    .filter((url): url is string => url.length > 0);
  if (fromGallery.length > 0) return fromGallery;

  const fallbackHero = typeof fiber.image === 'string' ? fiber.image.trim() : '';
  return fallbackHero ? [fallbackHero] : [];
}

function buildImageMapFromFibers(
  profiles: Array<{ id: string; galleryImages?: Array<{ url?: string }>; image?: string }>,
  getFiberById?: (id: string) => Pick<FiberProfile, "id" | "galleryImages" | "image"> | undefined,
): ImageMap {
  const next: ImageMap = {};
  for (const fp of profiles) {
    const full = getFiberById?.(fp.id);
    if (
      full &&
      Object.hasOwn(full, "galleryImages") &&
      Array.isArray(full.galleryImages)
    ) {
      const mergedEntries = mergeFiberGalleryWithFallback(fp.id, full as FiberProfile)
        .map(galleryRowToImageEntry)
        .filter((e) => extractImageUrl(e).trim().length > 0);
      const fallbackEntries =
        mergedEntries.length > 0 ? mergedEntries : getFiberImageUrls(full).map((url) => url.trim()).filter((url) => url.length > 0);
      next[fp.id] = coerceImageMapValue(fallbackEntries);
      continue;
    }
    next[fp.id] = getFiberImageUrls(fp);
  }
  return next;
}

/** Catalog fibers (e.g. raffia) may be missing from the nav tree; still expose merged galleries in Imagebase. */
function augmentAtlasImageMapWithCatalogFibers(
  navMap: ImageMap,
  catalogFibers: Array<Pick<FiberProfile, "id" | "galleryImages" | "image">>,
): ImageMap {
  const next: ImageMap = { ...navMap };
  for (const f of catalogFibers) {
    if (Object.prototype.hasOwnProperty.call(next, f.id)) continue;
    if (Object.hasOwn(f, "galleryImages") && Array.isArray(f.galleryImages)) {
      const mergedEntries = mergeFiberGalleryWithFallback(f.id, f as FiberProfile)
        .map(galleryRowToImageEntry)
        .filter((e) => extractImageUrl(e).trim().length > 0);
      const fallbackEntries =
        mergedEntries.length > 0 ? mergedEntries : getFiberImageUrls(f).map((url) => url.trim()).filter((url) => url.length > 0);
      next[f.id] = coerceImageMapValue(fallbackEntries);
    } else {
      next[f.id] = getFiberImageUrls(f);
    }
  }
  return next;
}

function readNavigationParentImagesFromStorage(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(NAV_PARENT_IMAGES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    Object.entries(parsed).forEach(([id, value]) => {
      if (!Array.isArray(value)) return;
      const urls = value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (urls.length > 0) normalized[id] = urls;
    });
    return normalized;
  } catch {
    return {};
  }
}

function writeNavigationParentImagesToStorage(map: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  const normalized: Record<string, string[]> = {};
  Object.entries(map).forEach(([id, urls]) => {
    const clean = urls.map((url) => url.trim()).filter((url) => url.length > 0);
    if (clean.length > 0) normalized[id] = clean;
  });
  localStorage.setItem(NAV_PARENT_IMAGES_KEY, JSON.stringify(normalized));
}

function isGalleryBackedFiberProfile(
  fiber: { id: string } | undefined,
): fiber is Pick<FiberProfile, 'id' | 'galleryImages' | 'image'> {
  return (
    !!fiber &&
    Object.hasOwn(fiber, 'galleryImages') &&
    Array.isArray((fiber as { galleryImages?: unknown }).galleryImages)
  );
}

/**
 * Whether to keep a catalog fiber's `atlas-images` row over recomputed `atlasMap`.
 * Uses `galleryUrlDedupeKey` so `_600x.jpg` vs `.jpg` variants count as the same asset.
 */
function shouldPreferLocalFiberImageRow(previousUrls: string[], canonicalUrls: string[]): boolean {
  if (previousUrls.length === 0) return false;
  const trimmedPrev = previousUrls.map((u) => u.trim()).filter((u) => u.length > 0);
  const canonKeySet = new Set(
    canonicalUrls.map((u) => u.trim()).filter((u) => u.length > 0).map(galleryUrlDedupeKey),
  );
  if (canonKeySet.size === 0) return true;
  const allPrevAreOrphans = trimmedPrev.every((u) => !canonKeySet.has(galleryUrlDedupeKey(u)));
  if (allPrevAreOrphans) return false;
  return true;
}

/** Exported for unit tests — stale `atlas-images` rows must not erase recomputed catalog URLs. */
export function mergeAtlasImagesWithNavigationOverrides(
  atlasMap: ImageMap,
  previousMap: ImageMap,
  editableNavigationNodeIdSet: Set<string>,
  getFiberById: (id: string) => { id: string } | undefined,
): ImageMap {
  const merged: ImageMap = { ...atlasMap };

  Object.keys(previousMap).forEach((id) => {
    if (!isGalleryBackedFiberProfile(getFiberById(id))) return;
    const canonicalUrls = toUrlArray(atlasMap[id]);
    const previousUrls = toUrlArray(previousMap[id]);
    if (previousUrls.length === 0) {
      // Only keep an explicit empty row when the recomputed atlas map is also empty.
      // A stale `[]` in localStorage (e.g. after a profile id rename) must not wipe catalog URLs.
      if (canonicalUrls.length === 0) {
        merged[id] = previousMap[id];
      }
      return;
    }
    if (shouldPreferLocalFiberImageRow(previousUrls, canonicalUrls)) {
      merged[id] = previousMap[id];
    }
  });

  // Nav-only nodes (no catalog fiber): keep explicit admin overrides from previousMap.
  Object.keys(previousMap).forEach((id) => {
    if (!editableNavigationNodeIdSet.has(id)) return;
    if (getFiberById(id)) return;
    const previousUrls = toUrlArray(previousMap[id]);
    if (previousUrls.length === 0) return;
    merged[id] = previousUrls;
  });
  return merged;
}

function isLikelyImageUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) return false;
  if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(normalized)) return true;
  return normalized.includes('cloudinary.com/') || normalized.includes('/image/upload/');
}

function getDroppedImageUrls(dataTransfer: DataTransfer): string[] {
  const urls = new Set<string>();
  const readData = typeof dataTransfer.getData === 'function'
    ? dataTransfer.getData.bind(dataTransfer)
    : () => '';

  const uriList = readData('text/uri-list') || '';
  for (const line of uriList.split('\n')) {
    const candidate = line.trim();
    if (candidate && !candidate.startsWith('#') && isLikelyImageUrl(candidate)) {
      urls.add(candidate);
    }
  }

  const plainText = (readData('text/plain') || '').trim();
  if (plainText && isLikelyImageUrl(plainText)) {
    urls.add(plainText);
  }

  const html = readData('text/html') || '';
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    const src = match[1]?.trim() || '';
    if (src && isLikelyImageUrl(src)) {
      urls.add(src);
    }
  }

  return Array.from(urls);
}

function createUploadTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isInternalImageReorderDrag(dataTransfer: DataTransfer): boolean {
  if (typeof dataTransfer.getData !== 'function') return false;
  return dataTransfer.getData(INTERNAL_IMAGE_REORDER_MIME) === '1';
}

/** Stable across reorder when URLs are unique; disambiguates duplicate URLs in one profile. */
function stableImageGridItemKey(urls: string[], index: number): string {
  const url = urls[index];
  if (!url) return `missing-${index}`;
  if (urls.filter((u) => u === url).length === 1) return url;
  const occurrence = urls.slice(0, index).filter((u) => u === url).length;
  return `${url}#${occurrence}`;
}

function collectDescendantNodeIds(nodes: NavNode[], rootId: string): Set<string> {
  const descendants = new Set<string>();

  const walk = (node: NavNode) => {
    descendants.add(node.id);
    if (!node.children) return;
    node.children.forEach((child) => walk(child));
  };

  const findAndWalk = (items: NavNode[]): boolean => {
    for (const node of items) {
      if (node.id === rootId) {
        walk(node);
        return true;
      }
      if (node.children && findAndWalk(node.children)) {
        return true;
      }
    }
    return false;
  };

  findAndWalk(nodes);
  return descendants;
}

interface CopyContextMenuImageParams {
  imageUrl: string;
  flash: (message: string) => void;
  setContextMenu: (menu: null) => void;
  copyImage?: (imageUrl: string) => Promise<void>;
}

export async function copyContextMenuImageToClipboard({
  imageUrl,
  flash,
  setContextMenu,
  copyImage = copyImageFromUrl,
}: CopyContextMenuImageParams): Promise<void> {
  try {
    await copyImage(imageUrl);
    flash('Copied image');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unsupported browser clipboard';
    flash(`Copy image failed: ${message}`);
  } finally {
    setContextMenu(null);
  }
}

interface ProfileImageLinksExportEntry {
  profileKey: string;
  imageLinks: string[];
  imageCount: number;
}

interface ProfileImageLinksExportPayload {
  exportedAt: string;
  profileCount: number;
  imageLinkCount: number;
  profiles: ProfileImageLinksExportEntry[];
}

export function buildProfileImageLinksExport(
  imageMap: ImageMap,
  exportedAt: string = new Date().toISOString(),
): ProfileImageLinksExportPayload {
  const profiles = Object.keys(imageMap)
    .sort((a, b) => a.localeCompare(b))
    .map((profileKey) => {
      const imageLinks = toUrlArray(imageMap[profileKey]);
      return {
        profileKey,
        imageLinks,
        imageCount: imageLinks.length,
      };
    });

  const imageLinkCount = profiles.reduce((sum, profile) => sum + profile.imageCount, 0);

  return {
    exportedAt,
    profileCount: profiles.length,
    imageLinkCount,
    profiles,
  };
}

// ── Icons ────────────────────────────────────────────────

const I = (d: string, sw = 1.5) => {
  const IconComponent = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
    <svg className={className} style={style} fill="none" stroke="currentColor" strokeWidth={sw} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={d} /></svg>
  );
  return IconComponent;
};

const CopyIcon = I('M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z');
const TrashIcon = I('M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16');
const PencilIcon = I('M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z');
const PlusIcon = I('M12 4v16m8-8H4', 2);
const XIcon = I('M6 18L18 6M6 6l12 12', 2);
const ChevronDown = I('M19 9l-7 7-7-7', 2);
const UndoIcon = I('M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H12M3 10l4-4M3 10l4 4', 2);
const CheckIcon = I('M5 13l4 4L19 7', 2);
const ArrowUpIcon = I('M5 15l7-7 7 7', 2);
const ArrowDownIcon = I('M19 9l-7 7-7-7', 2);
const GridIcon = I('M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z');
const ScoutIcon = I('M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z', 2);
const ZoomInIcon = I('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7', 2);
const ZoomOutIcon = I('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7', 2);
const DownloadIcon = I('M12 3v11m0 0l4-4m-4 4l-4-4M4 20h16', 2);
const ImageIcon = I('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', 2);
const FrameIcon = ({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2" y="4.5" width="20" height="15" rx="4" fill="currentColor" />
  </svg>
);
const Maximize2Icon = I('M4 4h6v6H4V4zm10 10h6v6h-6v-6zM4 14h6v6H4v-6zm10-10h6v6h-6V4z', 2);
const CompressIcon = I('M4 8v-2a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2M20 8v-2a2 2 0 00-2-2h-2M20 16v2a2 2 0 01-2 2h-2', 2);
const ArrowUpDownIcon = I('M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4', 2);
const CropMenuIcon = I('M6 2v4m0 0H2m4 0h10a2 2 0 012 2v10m0 0v4m0-4h4M6 6v10a2 2 0 002 2h10');

const ImageScoutPanel = React.lazy(() => import('./ImageScoutPanel'));

// ── Sub-components ───────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t); }, [onDone]);
  return <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-white text-black text-sm font-medium rounded-full shadow-lg animate-toast">{message}</div>;
}

function LazyImage({
  src,
  alt,
  className,
  onError,
  srcSet,
  sizes,
  loading = "lazy",
  fetchPriority = "auto",
  decoding = "async",
  objectPosition,
}: {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  srcSet?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "sync" | "async" | "auto";
  objectPosition?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      srcSet={srcSet}
      sizes={sizes}
      loading={loading}
      decoding={decoding}
      {...({ fetchpriority: fetchPriority } as Record<string, string>)}
      onLoad={() => setLoaded(true)}
      onError={onError}
      style={{
        opacity: loaded ? 1 : 0.6,
        transition: "opacity 200ms ease",
        ...(objectPosition ? { objectPosition } : {}),
      }}
    />
  );
}

// ── Links Modal ──────────────────────────────────────────

function LinksModal({ urls, onClose }: { urls: string[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = urls.join('\n');

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-neutral-900 border border-white/[0.08] rounded-xl p-5 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Image Links</h3>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-white"><XIcon className="w-4 h-4" /></button>
        </div>
        <textarea
          value={text}
          readOnly
          className="w-full h-48 bg-black/40 text-neutral-300 text-xs font-mono p-3 rounded-lg border border-white/[0.06] resize-none focus:outline-none"
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-sm transition-colors"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Operations Bar ──────────────────────────────────

interface BulkOperationsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkTag: (tag: string) => void;
  availableTags: string[];
}

function BulkOperationsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  onBulkTag,
  availableTags,
}: BulkOperationsBarProps) {
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
      <span className="text-sm text-blue-400 font-medium">
        {selectedCount} selected
      </span>

      <div className="w-px h-4 bg-blue-500/20" />

      <button
        onClick={onSelectAll}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        Select all ({totalCount})
      </button>

      <button
        onClick={onClearSelection}
        className="text-xs text-neutral-500 hover:text-white transition-colors"
      >
        Clear
      </button>

      <div className="flex-1" />

      {/* Bulk Tag */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowTagDropdown(!showTagDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-lg text-xs transition-colors"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add Tag
        </button>
        {showTagDropdown && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-neutral-900 border border-white/[0.08] rounded-lg shadow-2xl py-1 z-50">
            <div className="max-h-48 overflow-y-auto">
              {availableTags.length === 0 ? (
                <div className="px-3 py-2 text-xs text-neutral-500">No tags available</div>
              ) : (
                availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onBulkTag(tag);
                      setShowTagDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Delete */}
      <button
        onClick={onBulkDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
      >
        <TrashIcon className="w-3.5 h-3.5" /> Delete
      </button>
    </div>
  );
}

// ── Profile Card Component ──────────────────────────────────

interface ProfileCardProps {
  entryKey: string;
  value: ImageEntry | ImageEntry[];
  status?: string | null;
  zoom: number;
  layoutMode?: 'cards' | 'grid' | 'list';
  isExpanded: boolean;
  isSelected: boolean;
  tags: string[];
  allTagPaths: string[];
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onLightbox: (idx: number) => void;
  onRemoveImage: (idx: number) => void;
  onReorderImages: (from: number, to: number) => void;
  onOpenScout: () => void;
  onOpenStoryboard: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onContextMenu: (e: React.MouseEvent, url: string, idx: number) => void;
  onRename: (newKey: string) => void;
  /** Return `true` when an image URL was added from the clipboard (enables success UI). */
  onPasteFromClipboard: () => void | boolean | Promise<boolean | void>;
  onToggleStatus: () => void;
  statusSaving?: boolean;
  statusError?: string | null;
  onPromoteToHero: (idx: number) => void;
  onSendToFront: (idx: number) => void;
  onSendToBack: (idx: number) => void;
  markBroken: (url: string) => void;
  onNavigateToKnowledge?: (profileKey: string) => void;
  // Drag and drop for profile reordering
  profileDraggable?: boolean;
  onProfileDragStart?: () => void;
  onProfileDragEnd?: () => void;
  onProfileDragOver?: (e: React.DragEvent) => void;
  onProfileDrop?: (e: React.DragEvent) => void;
  isProfileDragging?: boolean;
  prioritizePreview?: boolean;
  /** First three images: set grid preview focal (object-position) for the public profile card. */
  onSetPreviewFocal?: (imageIndex: number, focal: PreviewFocalPoint | null) => void;
}

interface TagTreeNode {
  children: Record<string, TagTreeNode>;
  fullPath: string;
  isTerminal: boolean;
}

interface CompactProfileTileProps {
  entryKey: string;
  value: ImageEntry | ImageEntry[];
  status?: string | null;
  layoutMode: 'cards' | 'grid';
  isSelected: boolean;
  onToggleSelect: () => void;
  onLightbox: (idx: number) => void;
  onOpenScout: () => void;
  onOpenStoryboard: () => void;
  onToggleStatus: () => void;
  statusSaving?: boolean;
  statusError?: string | null;
  markBroken: (url: string) => void;
  prioritizePreview?: boolean;
}

function CompactProfileTile({
  entryKey,
  value,
  status,
  layoutMode,
  isSelected,
  onToggleSelect,
  onLightbox,
  onOpenScout,
  onOpenStoryboard,
  onToggleStatus,
  statusSaving = false,
  statusError,
  markBroken,
  prioritizePreview = false,
}: CompactProfileTileProps) {
  const urls = toUrlArray(value);
  const entries = toEntryArray(value);
  const preview = urls[0];
  const previewPreset = getPreviewPreset(layoutMode);
  const previewSrc = preview ? buildPreviewImageSrc(preview, previewPreset) : undefined;
  const previewSrcSet = preview ? buildPreviewSrcSet(preview, previewPreset) : undefined;
  const previewSizes = getPreviewSizes(layoutMode, ZOOM_DEFAULT);
  const isLive = isProfileLive(status);
  const isArchived = status === "archived";
  const isGrid = layoutMode === 'grid';

  return (
    <div
      data-testid="compact-profile-tile"
      className={cn(
        "group relative rounded-xl overflow-hidden border transition-all",
        isSelected
          ? "border-blue-400/50 ring-1 ring-blue-400/35 bg-blue-500/[0.03]"
          : "border-white/[0.08] hover:border-white/[0.2] bg-white/[0.02]"
      )}
    >
      <div className={cn("relative", isGrid ? "aspect-square" : "aspect-[16/10]")}>
        {preview ? (
          <button
            type="button"
            onClick={() => onLightbox(0)}
            className="block w-full h-full"
            title={`Open ${entryKey} preview`}
          >
            <LazyImage
              src={previewSrc || preview}
              srcSet={previewSrcSet}
              sizes={previewSizes}
              loading={prioritizePreview ? "eager" : "lazy"}
              fetchPriority={prioritizePreview ? "high" : "auto"}
              alt={`${entryKey} preview`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              objectPosition={previewFocalToObjectPosition(
                typeof entries[0] === "object" && entries[0] && "previewFocal" in entries[0]
                  ? (entries[0] as { previewFocal?: PreviewFocalPoint }).previewFocal
                  : undefined,
              )}
              onError={() => markBroken(preview)}
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs bg-black/30">
            No image
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <button
            role="checkbox"
            aria-checked={isSelected}
            aria-label={isSelected ? "Deselect profile" : "Select profile"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cn(
              "w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] transition-colors",
              isSelected
                ? "border-blue-300/80 bg-blue-400/20 text-blue-100"
                : "border-white/35 bg-black/25 text-transparent hover:text-white/70"
            )}
          >
            ✓
          </button>
        </div>

        <div className="absolute top-2 right-2">
          <ProfileStatusCircle
            status={status}
            onToggle={onToggleStatus}
            disabled={statusSaving}
            dataTestId="profile-compact-status-circle"
          />
        </div>
      </div>

      <div className={cn("p-3", isGrid ? "space-y-2" : "space-y-2.5")}>
        <div className="min-w-0">
          <h4 className={cn("truncate text-white/95", isGrid ? "text-[11px] font-semibold" : "text-sm font-medium")}>
            {entryKey}
          </h4>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            {urls.length} image{urls.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenScout}
            className="flex-1 h-7 rounded-md border border-white/[0.12] text-[10px] text-neutral-300 hover:text-white hover:bg-white/[0.06]"
          >
            Scout
          </button>
          <button
            type="button"
            onClick={onOpenStoryboard}
            className="flex-1 h-7 rounded-md border border-white/[0.12] text-[10px] text-neutral-300 hover:text-white hover:bg-white/[0.06]"
          >
            Storyboard
          </button>
        </div>

        {statusError ? <p className="text-[10px] text-red-300 truncate">{statusError}</p> : null}
      </div>
    </div>
  );
}

export function ProfileCard({
  entryKey,
  value,
  status,
  zoom,
  layoutMode = 'list',
  isExpanded,
  isSelected,
  tags,
  allTagPaths,
  onToggleExpand,
  onToggleSelect,
  onLightbox,
  onReorderImages,
  onOpenScout,
  onOpenStoryboard,
  onAddTag,
  onRemoveTag,
  onContextMenu,
  onRename,
  onPasteFromClipboard,
  onToggleStatus,
  statusSaving = false,
  statusError,
  markBroken,
  onNavigateToKnowledge,
  profileDraggable,
  onProfileDragStart,
  onProfileDragEnd,
  onProfileDragOver,
  onProfileDrop,
  isProfileDragging,
  prioritizePreview = false,
  onSetPreviewFocal,
}: ProfileCardProps) {
  const urls = toUrlArray(value);
  const entries = toEntryArray(value);
  const [focalModalIndex, setFocalModalIndex] = useState<number | null>(null);
  const isCompactLayout = layoutMode !== 'list';
  const isGridLayout = layoutMode === 'grid';
  const isLive = isProfileLive(status);
  const isArchived = status === "archived";
  const profileStatusErrorId = useMemo(
    () => `profile-status-error-${entryKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    [entryKey]
  );
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(entryKey);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [showTagNavigator, setShowTagNavigator] = useState(false);
  const [activeTagSegments, setActiveTagSegments] = useState<string[]>([]);
  const [tagOverlayRect, setTagOverlayRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);
  const tagNavigatorRef = useRef<HTMLDivElement>(null);
  const tagOverlayRef = useRef<HTMLDivElement>(null);
  const pasteSuccessClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imgCount = urls.length;
  const expandedPreviewPreset = getPreviewPreset("list");
  const expandedPreviewSizes = getPreviewSizes("list", zoom);

  const objectPositionForEntryIndex = (idx: number): string | undefined => {
    const e = entries[idx];
    if (typeof e === "object" && e && "previewFocal" in e) {
      return previewFocalToObjectPosition((e as { previewFocal?: PreviewFocalPoint }).previewFocal);
    }
    return undefined;
  };

  const onDragStart = (idx: number, event: React.DragEvent) => {
    // Keep dragstart from bubbling to the profile card (also draggable for atlas reorder).
    event.stopPropagation();
    if (event.dataTransfer && typeof event.dataTransfer.setData === 'function') {
      event.dataTransfer.setData(INTERNAL_IMAGE_REORDER_MIME, '1');
    }
    React.startTransition(() => {
      setDraggedIdx(idx);
    });
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    React.startTransition(() => {
      if (draggedIdx !== null && draggedIdx !== toIdx) {
        onReorderImages(draggedIdx, toIdx);
      }
      setDraggedIdx(null);
    });
  };

  const selectedTagSet = useMemo(() => new Set(tags), [tags]);
  const tagTree = useMemo<TagTreeNode>(() => {
    const root: TagTreeNode = { children: {}, fullPath: '', isTerminal: false };
    allTagPaths.forEach((tagPath) => {
      const parts = tagPath.split('/').filter(Boolean);
      let node = root;
      let fullPath = '';
      parts.forEach((part) => {
        fullPath = fullPath ? `${fullPath}/${part}` : part;
        if (!node.children[part]) {
          node.children[part] = { children: {}, fullPath, isTerminal: false };
        }
        node = node.children[part];
      });
      node.isTerminal = true;
    });
    return root;
  }, [allTagPaths]);

  const activeTagNode = useMemo(() => {
    let node = tagTree;
    for (const segment of activeTagSegments) {
      const nextNode = node.children[segment];
      if (!nextNode) return tagTree;
      node = nextNode;
    }
    return node;
  }, [activeTagSegments, tagTree]);

  const nextTagOptions = useMemo(
    () => Object.keys(activeTagNode.children).sort((a, b) => a.localeCompare(b)),
    [activeTagNode]
  );

  const activeTagPath = useMemo(() => activeTagSegments.join('/'), [activeTagSegments]);
  const canCompleteSelection = activeTagPath.length > 0 && activeTagNode.isTerminal;
  const isActivePathSelected = activeTagPath.length > 0 && selectedTagSet.has(activeTagPath);
  const nextLayerNumber = activeTagSegments.length + 1;
  const tagSelectionPrompt = nextTagOptions.length > 0
    ? `Select Layer ${nextLayerNumber} node`
    : canCompleteSelection
      ? "Confirm selected node path"
      : "No deeper levels under this node";

  const openTagEditor = useCallback(() => {
    setActiveTagSegments([]);
    setShowTagNavigator(true);
  }, []);

  const handleSelectTagSegment = useCallback(
    (segment: string) => {
      const nextSegments = [...activeTagSegments, segment];
      setActiveTagSegments(nextSegments);
    },
    [activeTagSegments]
  );

  const handleApplyActiveTagPath = useCallback(() => {
    if (!canCompleteSelection || isActivePathSelected) return;
    onAddTag(activeTagPath);
    setShowTagNavigator(false);
    setActiveTagSegments([]);
  }, [activeTagPath, canCompleteSelection, isActivePathSelected, onAddTag]);

  useEffect(() => {
    if (!showTagNavigator) return;
    const updateOverlayPosition = () => {
      if (!tagNavigatorRef.current) return;
      const rect = tagNavigatorRef.current.getBoundingClientRect();
      const maxWidth = Math.min(380, window.innerWidth - 16);
      const minLeft = 8;
      const maxLeft = Math.max(minLeft, window.innerWidth - maxWidth - 8);
      const left = Math.min(Math.max(rect.left, minLeft), maxLeft);
      setTagOverlayRect({
        top: rect.bottom + 8,
        left,
        width: maxWidth,
      });
    };
    updateOverlayPosition();
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedAnchor = tagNavigatorRef.current?.contains(target);
      const clickedOverlay = tagOverlayRef.current?.contains(target);
      if (!clickedAnchor && !clickedOverlay) {
        setShowTagNavigator(false);
      }
    };
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTagNavigator(false);
    };
    window.addEventListener('resize', updateOverlayPosition);
    window.addEventListener('scroll', updateOverlayPosition, true);
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      window.removeEventListener('resize', updateOverlayPosition);
      window.removeEventListener('scroll', updateOverlayPosition, true);
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [showTagNavigator]);

  useEffect(() => {
    return () => {
      if (pasteSuccessClearRef.current) clearTimeout(pasteSuccessClearRef.current);
    };
  }, []);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all ${
        isSelected
          ? 'ring-1 ring-blue-500/50 border border-blue-500/30'
          : 'border border-white/[0.06] hover:border-white/[0.12]'
      } ${isProfileDragging ? 'opacity-50' : ''}`}
      style={{ background: 'rgba(20,20,23,0.6)' }}
      draggable={profileDraggable}
      onDragStart={onProfileDragStart}
      onDragEnd={onProfileDragEnd}
      onDragOver={onProfileDragOver}
      onDrop={onProfileDrop}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
        style={{ background: 'rgba(0,0,0,0.2)' }}
        onClick={isCompactLayout ? undefined : onToggleExpand}
      >
        {!isCompactLayout && onNavigateToKnowledge ? (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigateToKnowledge(entryKey); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-amber-400/90 hover:bg-amber-500/10 transition-colors duration-150 shrink-0"
            title={`Open ${entryKey} knowledge base`}
            aria-label={`Open knowledge base for ${entryKey}`}
          >
            <Brain className="w-4 h-4" />
          </button>
        ) : null}

        <div className="flex-1 flex items-center gap-2 min-w-0">
            {isRenaming ? (
              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 bg-black/40 text-white px-3 py-1.5 rounded-lg text-sm font-mono border border-white/10 focus:border-blue-500/50 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRename(renameValue);
                      setIsRenaming(false);
                    } else if (e.key === 'Escape') {
                      setRenameValue(entryKey);
                      setIsRenaming(false);
                    }
                  }}
                />
                <button
                  onClick={() => { onRename(renameValue); setIsRenaming(false); }}
                  className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setRenameValue(entryKey); setIsRenaming(false); }}
                  className="p-1.5 text-neutral-400 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-white/90 truncate max-w-[200px]">
                  {entryKey}
                </span>
                <span className="text-xs text-neutral-400">
                  ({imgCount})
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-white hover:bg-white/5 rounded transition-all"
                  title="Rename"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

        {/* Top-right action icons */}
            <div className="flex items-center gap-1">
              {/* Scout */}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenScout(); }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
                title="Find more images"
                aria-label="Open Image Scout"
              >
                <ScoutIcon className="w-4 h-4" />
              </button>

              {/* FullscreenView */}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenStoryboard(); }}
                className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
                title="Fullscreen view"
                aria-label="Open fullscreen storyboard"
              >
                <Maximize2Icon className="w-4 h-4" />
              </button>

              {/* Live / Archived status */}
              <ProfileStatusCircle
                status={status}
                onToggle={onToggleStatus}
                disabled={statusSaving}
                ariaDescribedBy={statusError ? profileStatusErrorId : undefined}
                dataTestId="profile-status-circle"
              />
            </div>

            {!isCompactLayout ? (
              <button className={`p-1 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : null}
      </div>

      {statusError ? (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-red-300" id={profileStatusErrorId} role="alert" aria-live="assertive">
            {statusError}
          </p>
        </div>
      ) : null}

      {isCompactLayout ? (
        <div className={cn(isGridLayout ? "p-2.5 space-y-2" : "p-4 space-y-3")}>
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border border-white/[0.06] bg-black/40",
              isGridLayout ? "aspect-square" : "aspect-[4/3] md:aspect-[16/10]"
            )}
          >
            {urls[0] ? (
              <LazyImage
                src={buildPreviewImageSrc(urls[0], expandedPreviewPreset)}
                srcSet={buildPreviewSrcSet(urls[0], expandedPreviewPreset)}
                sizes={expandedPreviewSizes}
                loading={prioritizePreview ? "eager" : "lazy"}
                fetchPriority={prioritizePreview ? "high" : "auto"}
                alt={`${entryKey} preview`}
                className="w-full h-full object-cover"
                objectPosition={objectPositionForEntryIndex(0)}
                onError={() => markBroken(urls[0])}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                No preview
              </div>
            )}
          </div>
          <div className={cn(
            "flex items-center justify-between text-neutral-400",
            isGridLayout ? "text-[10px]" : "text-[11px]"
          )}>
            <span className={cn("truncate", isGridLayout ? "max-w-[65%]" : "max-w-[70%]")}>
              {imgCount} image{imgCount === 1 ? '' : 's'}
            </span>
            <span className={cn(
              "font-medium",
              isLive ? "text-emerald-300" : "text-neutral-500",
              isGridLayout ? "tracking-wide uppercase" : ""
            )}>
              {isLive ? "Live" : "Archived"}
            </span>
          </div>
        </div>
      ) : null}

      {/* Expanded Content */}
      {!isCompactLayout && isExpanded && (
        <div className="p-4 space-y-4">
          {/* Images Grid */}
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))` }}
          >
            {urls.map((url, i) => (
              <div
                key={stableImageGridItemKey(urls, i)}
                draggable
                onDragStart={(e) => onDragStart(i, e)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, i)}
                onClick={() => onLightbox(i)}
                onContextMenu={(e) => onContextMenu(e, url, i)}
                className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black/40 group/image border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer"
              >
                <LazyImage
                  src={buildPreviewImageSrc(url, expandedPreviewPreset)}
                  srcSet={buildPreviewSrcSet(url, expandedPreviewPreset)}
                  sizes={expandedPreviewSizes}
                  alt={`${entryKey} ${i + 1}`}
                  className="w-full h-full object-cover"
                  objectPosition={objectPositionForEntryIndex(i)}
                  onError={() => markBroken(url)}
                />

                {onSetPreviewFocal && i < PREVIEW_FOCAL_SLOT_COUNT ? (
                  <button
                    type="button"
                    title="Set grid preview focal"
                    aria-label={`Set focal point for preview image ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocalModalIndex(i);
                    }}
                    className="absolute bottom-1 left-1 flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-black/55 text-neutral-200 opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 hover:text-white group-hover/image:opacity-100"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                  </button>
                ) : null}

                {/* Index number on hover */}
                <div className="absolute top-1 right-1 p-0.5 opacity-0 group-hover/image:opacity-100 transition-opacity">
                  <span className="text-[9px] font-medium text-white/90">
                    {i + 1}
                  </span>
                </div>

                {draggedIdx === i && (
                  <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500/50 rounded-lg" />
                )}
              </div>
            ))}

          </div>

          {/* Tag pills + taxonomy editor */}
          <div className="relative" ref={tagNavigatorRef}>
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <button
                  type="button"
                  aria-label="Add first tag"
                  onClick={openTagEditor}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-white/[0.14] bg-white/[0.01] px-2 py-1 text-[11px] text-neutral-500 transition-colors hover:border-white/[0.26] hover:bg-white/[0.05] hover:text-neutral-200"
                >
                  <PlusIcon className="h-3 w-3" />
                  <span>Add tag</span>
                </button>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag}
                    role="button"
                    tabIndex={0}
                    aria-label={`Edit tags for ${tag}`}
                    onClick={openTagEditor}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTagEditor();
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.05] bg-white/[0.03] px-2 py-1 text-[11px] text-neutral-300 transition-colors hover:border-white/[0.12] hover:bg-white/[0.07]"
                  >
                    {tag.split('/').map((seg, si, arr) => (
                      <React.Fragment key={si}>
                        {si > 0 && <span className="text-neutral-600">›</span>}
                        <span className={si === arr.length - 1 ? 'text-neutral-100' : 'text-neutral-400'}>{seg}</span>
                      </React.Fragment>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTag(tag);
                      }}
                      className="ml-1 text-neutral-500 transition-colors hover:text-red-400"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {showTagNavigator && tagOverlayRect && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tagOverlayRef}
              className="fixed z-[160] rounded-lg border border-white/[0.08] bg-neutral-950/95 backdrop-blur-md p-2.5 shadow-2xl"
              style={{ top: tagOverlayRect.top, left: tagOverlayRect.left, width: tagOverlayRect.width }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-[0.08em] text-neutral-500">Tag path</span>
                  <span className="block text-[10px] text-neutral-400">{tagSelectionPrompt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagNavigator(false);
                    setActiveTagSegments([]);
                  }}
                  className="rounded p-1 text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close tag editor"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>

              <div className="mb-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTagSegments([])}
                  className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                    activeTagSegments.length === 0
                      ? 'border-blue-400/40 bg-blue-500/20 text-blue-200'
                      : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]'
                  }`}
                >
                  Root
                </button>
                {activeTagSegments.map((segment, index) => (
                  <button
                    key={`${segment}-${index}`}
                    type="button"
                    onClick={() => setActiveTagSegments(activeTagSegments.slice(0, index + 1))}
                    className={`rounded border px-2 py-1 text-[10px] transition-colors ${
                      index === activeTagSegments.length - 1
                        ? 'border-blue-400/40 bg-blue-500/20 text-blue-200'
                        : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    {segment}
                  </button>
                ))}
              </div>

              {tags.length > 0 ? (
                <div className="mb-2">
                  <div className="mb-1 px-1 text-[10px] uppercase tracking-[0.08em] text-neutral-500">Selected</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <button
                        key={`selected-${tag}`}
                        type="button"
                        onClick={() => onRemoveTag(tag)}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-200 transition-colors hover:bg-emerald-500/20"
                      >
                        <XIcon className="h-3 w-3" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="max-h-56 overflow-y-auto pr-1">
                {nextTagOptions.length === 0 ? (
                  <div className="rounded border border-white/[0.08] bg-black/30 px-2 py-2 text-[11px] text-neutral-500">
                    No deeper levels under this node.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {nextTagOptions.map((segment) => (
                      <button
                        key={`${activeTagPath}/${segment}`}
                        type="button"
                        aria-label={`Select ${segment}`}
                        onClick={() => handleSelectTagSegment(segment)}
                        className="w-full rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-left text-[11px] text-neutral-300 transition-colors hover:border-white/[0.14] hover:bg-white/[0.08]"
                      >
                        {segment}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
                <span>{activeTagPath || 'Choose a parent node to begin'}</span>
                <div className="flex items-center gap-2">
                  {canCompleteSelection ? (
                    <span className={isActivePathSelected ? 'text-emerald-300' : 'text-blue-300'}>
                      {isActivePathSelected ? 'Already selected' : 'Leaf selected'}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleApplyActiveTagPath}
                    disabled={!canCompleteSelection || isActivePathSelected}
                    className="rounded border border-blue-400/30 bg-blue-500/15 px-2 py-1 text-[10px] text-blue-200 transition-colors hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.03] disabled:text-neutral-500"
                    aria-label="Add selected tag path"
                  >
                    Add selected path
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
      {focalModalIndex !== null &&
      onSetPreviewFocal &&
      focalModalIndex >= 0 &&
      focalModalIndex < urls.length &&
      focalModalIndex < PREVIEW_FOCAL_SLOT_COUNT &&
      typeof document !== "undefined"
        ? createPortal(
            <PreviewFocalEditor
              imageSrc={
                buildPreviewImageSrc(urls[focalModalIndex], expandedPreviewPreset) ||
                urls[focalModalIndex]
              }
              initialFocal={(() => {
                const rawEntry = entries[focalModalIndex];
                const pf =
                  rawEntry && typeof rawEntry === "object" && "previewFocal" in rawEntry
                    ? (rawEntry as { previewFocal?: PreviewFocalPoint }).previewFocal
                    : undefined;
                if (pf && Number.isFinite(pf.x) && Number.isFinite(pf.y)) {
                  return { x: clamp01(pf.x), y: clamp01(pf.y) };
                }
                return { x: 0.5, y: 0.5 };
              })()}
              onSave={(focal) => {
                onSetPreviewFocal(focalModalIndex, focal);
                setFocalModalIndex(null);
              }}
              onRemoveCustom={() => onSetPreviewFocal(focalModalIndex, null)}
              onClose={() => setFocalModalIndex(null)}
            />,
            document.body,
          )
        : null}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void (async () => {
            const ok = await Promise.resolve(onPasteFromClipboard());
            if (ok === true) {
              if (pasteSuccessClearRef.current) clearTimeout(pasteSuccessClearRef.current);
              setPasteSuccess(true);
              pasteSuccessClearRef.current = setTimeout(() => {
                setPasteSuccess(false);
                pasteSuccessClearRef.current = null;
              }, 1200);
            }
          })();
        }}
        className="absolute bottom-2 right-2 z-20 flex h-11 w-11 origin-center items-center justify-center text-neutral-300 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-110 hover:text-white"
        title="Paste image from clipboard"
        aria-label="Paste image from clipboard"
      >
        <FrameIcon
          className={cn(
            "h-6 w-6 shrink-0 transition-[color,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            pasteSuccess
              ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              : "text-white",
          )}
        />
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

interface ImageDatabaseManagerProps {
  activeNodeId?: string | null;
  focusProfileId?: string | null;
  viewMode?: 'cards' | 'grid' | 'list';
  searchQueryInput?: string;
  onSearchQueryInputChange?: (value: string) => void;
  onNavigateToKnowledge?: (profileKey: string) => void;
}

interface OpenImageScoutEventDetail {
  profileId?: string;
  query?: string;
}

export default function ImageDatabaseManager({
  activeNodeId = null,
  focusProfileId = null,
  viewMode = 'cards',
  searchQueryInput: controlledSearchQueryInput,
  onSearchQueryInputChange,
  onNavigateToKnowledge,
}: ImageDatabaseManagerProps) {
  const { settings } = useAdminSettings();
  const { fibers, getFiberById, updateFiber, version } = useAtlasData();
  useAdminSave();
  const cloudinaryReady = !!settings.cloudinary.cloudName && !!settings.cloudinary.uploadPreset;
  const editableNavigationNodeIds = useMemo(
    () => flattenNavigationNodes(runtimeAtlasNavigation).map((n) => n.id),
    [],
  );
  const editableNavigationNodeIdSet = useMemo(
    () => new Set(editableNavigationNodeIds),
    [editableNavigationNodeIds],
  );
  const navParentImageOverrides = useMemo(
    () => readNavigationParentImagesFromStorage(),
    [],
  );

  // Hidden draft profiles for every node — Admin edits thumbnail images via these
  const imageBaseProfiles = useMemo(
    () =>
      buildNodeDraftProfiles(runtimeAtlasNavigation, fibers, navParentImageOverrides).map(
        (draft) => ({
          id: draft.id,
          name: draft.name,
          category: draft.category,
          image: draft.image,
          galleryImages: draft.galleryImages,
        }),
      ),
    [fibers, navParentImageOverrides],
  );

  // Use extracted history hook
  const initial: ImageMap = useMemo(() => {
    try {
      const s = localStorage.getItem('atlas-images');
      if (!s) return ATLAS_IMAGES;
      const parsed = JSON.parse(s);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return ATLAS_IMAGES;
      return parsed as ImageMap;
    } catch { return ATLAS_IMAGES; }
  }, []);

  const { images, setImages, undo, redo, canUndo, canRedo } = useImageHistory(initial);
  const hasHydratedFiberSyncRef = useRef(false);
  const previousImagesRef = useRef<ImageMap>(images);
  const atlasImageMap = useMemo(() => {
    const fromNav = buildImageMapFromFibers(imageBaseProfiles, getFiberById);
    return augmentAtlasImageMapWithCatalogFibers(fromNav, fibers);
  }, [imageBaseProfiles, getFiberById, version, fibers]);

  /* Persist before paint so a fast tab close is less likely to skip the write. */
  useLayoutEffect(() => {
    try {
      localStorage.setItem('atlas-images', JSON.stringify(images));
    } catch {
      /* quota / private mode */
    }
  }, [images]);

  const diskSyncTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const imagesForDiskSyncRef = useRef(images);
  imagesForDiskSyncRef.current = images;

  const flushImageCatalogDiskSync = useCallback((opts?: { bypassFingerprint?: boolean }) => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return;
    void syncImageCatalogToDisk(imagesForDiskSyncRef.current, {
      bypassFingerprint: opts?.bypassFingerprint === true,
    }).then((r) => {
      if (!r.ok) {
        setImageCatalogDiskSyncError(r.error);
        console.warn('[image-catalog:disk]', r.error);
        return;
      }
      setImageCatalogDiskSyncError(null);
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return;
    if (diskSyncTimerRef.current !== null) {
      window.clearTimeout(diskSyncTimerRef.current);
    }
    diskSyncTimerRef.current = window.setTimeout(() => {
      diskSyncTimerRef.current = null;
      flushImageCatalogDiskSync();
    }, 2000);
    return () => {
      if (diskSyncTimerRef.current !== null) {
        window.clearTimeout(diskSyncTimerRef.current);
        diskSyncTimerRef.current = null;
      }
    };
  }, [images, flushImageCatalogDiskSync]);

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return;
    const onPageHide = () => {
      if (diskSyncTimerRef.current !== null) {
        window.clearTimeout(diskSyncTimerRef.current);
        diskSyncTimerRef.current = null;
      }
      flushImageCatalogDiskSync();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [flushImageCatalogDiskSync]);

  useEffect(() => {
    if (!hasHydratedFiberSyncRef.current) {
      hasHydratedFiberSyncRef.current = true;
      previousImagesRef.current = images;
      return;
    }

    const previousImages = previousImagesRef.current;
    const keys = new Set([...Object.keys(previousImages), ...Object.keys(images)]);
    let pushedGalleryOverride = false;

    keys.forEach((profileKey) => {
      if (gallerySyncSignature(previousImages[profileKey]) === gallerySyncSignature(images[profileKey])) {
        return;
      }

      if (!getFiberById(profileKey)) return;

      const nextEntries = toEntryArray(images[profileKey]);
      const galleryImages = nextEntries.map(imageEntryToGalleryImageEntry).filter((g) => g.url.length > 0);
      const image = galleryImages[0]?.url ?? "";

      updateFiber(profileKey, {
        galleryImages,
        image,
      });
      pushedGalleryOverride = true;
    });

    previousImagesRef.current = images;

    if (
      pushedGalleryOverride &&
      import.meta.env.DEV &&
      import.meta.env.MODE !== "test" &&
      typeof window !== "undefined"
    ) {
      queueMicrotask(() => {
        window.dispatchEvent(new Event("atlas:flush-promoted-sync"));
      });
    }
  }, [getFiberById, images, updateFiber]);

  useEffect(() => {
    setImages((prev) => {
      const mergedAtlasMap = mergeAtlasImagesWithNavigationOverrides(
        atlasImageMap,
        prev,
        editableNavigationNodeIdSet,
        getFiberById,
      );
      if (imageMapsEqualForSync(prev, mergedAtlasMap)) return prev;
      return mergedAtlasMap;
    });
  }, [atlasImageMap, editableNavigationNodeIdSet, getFiberById, setImages]);

  useEffect(() => {
    const overrides: Record<string, string[]> = {};
    Object.keys(images).forEach((profileKey) => {
      if (!editableNavigationNodeIdSet.has(profileKey)) return;
      if (getFiberById(profileKey)) return;
      const urls = toUrlArray(images[profileKey]).map((url) => url.trim()).filter((url) => url.length > 0);
      if (urls.length > 0) overrides[profileKey] = urls;
    });
    writeNavigationParentImagesToStorage(overrides);
  }, [editableNavigationNodeIdSet, getFiberById, images]);

  // Tags state
  const [tags, setTagsState] = useState<TagMap>(() => {
    try {
      const s = localStorage.getItem('atlas-tags');
      if (s) { const p = JSON.parse(s); if (typeof p === 'object' && p && !Array.isArray(p)) return { ...CANONICAL_TAGS, ...p }; }
    } catch { /* ignore */ }
    return CANONICAL_TAGS;
  });
  useEffect(() => { localStorage.setItem('atlas-tags', JSON.stringify(tags)); }, [tags]);

  // Relations state
  const [relations, setRelations] = useState<RelationMap>({});
  useEffect(() => {
    try {
      const s = localStorage.getItem('atlas-relations');
      if (s) { const p = JSON.parse(s); if (typeof p === 'object' && p && !Array.isArray(p)) setRelations(p); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem('atlas-relations', JSON.stringify(relations)); }, [relations]);

  // UI state
  const [internalSearchQueryInput, setInternalSearchQueryInput] = useState('');
  const isSearchControlled = controlledSearchQueryInput !== undefined;
  const searchQueryInput = isSearchControlled ? controlledSearchQueryInput : internalSearchQueryInput;
  const setSearchQueryInput = useCallback(
    (value: string) => {
      if (isSearchControlled) {
        onSearchQueryInputChange?.(value);
        return;
      }
      setInternalSearchQueryInput(value);
    },
    [isSearchControlled, onSearchQueryInputChange]
  );
  const searchQuery = useDebounce(searchQueryInput, SEARCH_DEBOUNCE_MS);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set(Object.keys(initial)));
  const [isCollapseAllActive, setIsCollapseAllActive] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);
  const [imageCatalogDiskSyncError, setImageCatalogDiskSyncError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxData | null>(null);
  const [showScout, setShowScout] = useState<{ profileKey: string; initialQuery?: string } | null>(null);
  const [showStoryboard, setShowStoryboard] = useState<{ entryKey: string; urls: string[] } | null>(null);
  const [showLinks, setShowLinks] = useState<{ entryKey: string; urls: string[] } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; profileKey: string; imageUrl: string; index: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const lightboxStartCropRef = useRef<(() => void) | null>(null);
  const profileItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canonicalProfileOrder = useMemo(() => {
    const allIds = imageBaseProfiles.map((fiber) => fiber.id);
    return dataSource.resolveFiberOrder(allIds);
  }, [imageBaseProfiles]);
  const [draggedProfileKey, setDraggedProfileKey] = useState<string | null>(null);
  const [profileStatusOverrides, setProfileStatusOverrides] = useState<Record<string, string>>({});
  const [profileStatusSaving, setProfileStatusSaving] = useState<Record<string, boolean>>({});
  const [profileStatusErrors, setProfileStatusErrors] = useState<Record<string, string>>({});
  const [profileUploadQueue, setProfileUploadQueue] = useState<ProfileUploadTask[]>([]);
  const profileStatusRequestVersionRef = useRef<Record<string, number>>({});
  const setProfileItemRef = useCallback(
    (profileKey: string) => (node: HTMLDivElement | null) => {
      profileItemRefs.current[profileKey] = node;
    },
    []
  );
  const triggerImageDownload = useCallback((imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank';
    link.rel = 'noopener,noreferrer';
    try {
      const filename = new URL(imageUrl, window.location.origin).pathname.split('/').pop();
      link.download = filename && filename.length > 0 ? filename : 'atlas-image';
    } catch {
      link.download = 'atlas-image';
    }
    link.click();
  }, []);

  // Hydrate and subscribe to passport status overrides for cross-tab sync
  useEffect(() => {
    setProfileStatusOverrides(readPassportStatusOverrides());
    const unsubscribe = subscribePassportStatusOverrides(() => {
      setProfileStatusOverrides(readPassportStatusOverrides());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsidePointerDown = (event: MouseEvent | TouchEvent) => {
      const targetNode = event.target as Node | null;
      if (targetNode && contextMenuRef.current?.contains(targetNode)) return;
      setContextMenu(null);
    };

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [contextMenu]);

  // Derived state
  const allKeys = useMemo(() => Object.keys(images).sort(), [images]);

  const nodeScopedProfileIds = useMemo(() => {
    if (!activeNodeId) return null;
    const ids = collectDescendantNodeIds(runtimeAtlasNavigation, activeNodeId);
    return ids.size > 0 ? ids : null;
  }, [activeNodeId]);

  // Align display with remove/reorder/add: `resolveDisplayImageEntriesForKey` so the active
  // profile does not ignore `atlas-images` edits (merged-only display resurrected duplicates).
  const displayImages = useMemo(() => {
    const keys = new Set<string>(Object.keys(images));
    if (activeNodeId) keys.add(activeNodeId);
    const out: ImageMap = {};
    for (const k of keys) {
      const entries = resolveDisplayImageEntriesForKey(images, k, activeNodeId, getFiberById);
      out[k] = coerceImageMapValue(entries);
    }
    return out;
  }, [images, activeNodeId, getFiberById]);

  // Filtered keys with node scope + search + atlas order
  const filteredKeys = useMemo(() => {
    if (focusProfileId) {
      if (
        displayImages[focusProfileId] ||
        getFiberById(focusProfileId) ||
        editableNavigationNodeIdSet.has(focusProfileId)
      ) {
        return [focusProfileId];
      }
      return [];
    }

    let keys = allKeys;

    // Hide non-live fiber profiles in ImageBase unless they still carry images
    // (Knowledge can surface these, so keep cross-view image visibility aligned).
    // Recovered JSON-library stubs stay archived for the public grid but must remain editable here.
    keys = keys.filter((key) => {
      if (!getFiberById(key)) return true;
      if (RECOVERED_ARCHIVED_PROFILE_IDS.has(key)) return true;
      const effectiveStatus = profileStatusOverrides[key] ?? getProfileStatusWithFallback(key, getFiberById);
      if (isProfileLive(effectiveStatus)) return true;
      return toUrlArray(displayImages[key]).length > 0;
    });

    // Workspace node filter (selected node + all descendants)
    if (nodeScopedProfileIds) {
      keys = keys.filter((k) => nodeScopedProfileIds.has(k));
    }

    // Include sidebar-selected profile when it exists in fibers but is not in the normal set
    // (e.g. archived/draft profiles that are hidden otherwise)
    if (
      activeNodeId &&
      getFiberById(activeNodeId) &&
      !keys.includes(activeNodeId)
    ) {
      keys = [activeNodeId, ...keys.filter((k) => k !== activeNodeId)];
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      keys = keys.filter((k) =>
        k.toLowerCase().includes(q) ||
        toUrlArray(displayImages[k]).some((u) => u.toLowerCase().includes(q))
      );
    }

    keys = sortFilteredProfileKeys({ keys, canonicalOrder: canonicalProfileOrder });

    return keys;
  }, [
    allKeys,
    images,
    displayImages,
    searchQuery,
    nodeScopedProfileIds,
    canonicalProfileOrder,
    activeNodeId,
    focusProfileId,
    getFiberById,
    profileStatusOverrides,
    editableNavigationNodeIdSet,
  ]);

  useEffect(() => {
    if (isCollapseAllActive) return;
    setExpandedKeys(new Set(allKeys));
  }, [allKeys, isCollapseAllActive]);

  // Expand sidebar-selected profile when it's temporarily displayed (archived/draft)
  useEffect(() => {
    if (
      activeNodeId &&
      getFiberById(activeNodeId) &&
      !allKeys.includes(activeNodeId)
    ) {
      setExpandedKeys((prev) => new Set([...prev, activeNodeId]));
    }
  }, [activeNodeId, allKeys, getFiberById]);

  useEffect(() => {
    const handleOpenScout = (event: Event) => {
      const customEvent = event as CustomEvent<OpenImageScoutEventDetail>;
      const requestedProfileId = customEvent.detail?.profileId?.trim() || undefined;
      const requestedQuery = customEvent.detail?.query?.trim() || undefined;
      const fallbackProfileKey = filteredKeys[0] ?? allKeys[0] ?? null;
      const validRequested =
        requestedProfileId &&
        (allKeys.includes(requestedProfileId) || displayImages[requestedProfileId]);
      const targetProfileKey = validRequested ? requestedProfileId : fallbackProfileKey;
      if (!targetProfileKey) return;
      setShowScout({
        profileKey: targetProfileKey,
        initialQuery: requestedQuery,
      });
    };
    window.addEventListener('admin:open-image-scout', handleOpenScout as EventListener);
    return () => window.removeEventListener('admin:open-image-scout', handleOpenScout as EventListener);
  }, [allKeys, filteredKeys, displayImages]);

  const allTagPaths = useMemo(() => {
    const paths = new Set<string>(SEEDED_TAG_PATHS);
    Object.values(tags).forEach((arr) => arr.forEach((t) => paths.add(t)));
    return Array.from(paths).sort();
  }, [tags]);

  const displayRows = useMemo(() => {
    const { regular, navigationParents } = partitionByNavigationParent(filteredKeys);
    const rows: Array<{ type: "profile"; key: string } | { type: "header" }> = regular.map((key) => ({
      type: "profile",
      key,
    }));
    if (navigationParents.length > 0) {
      rows.push({ type: "header" });
      rows.push(...navigationParents.map((key) => ({ type: "profile" as const, key })));
    }
    return rows;
  }, [filteredKeys]);
  const prioritizedProfileKeys = useMemo(() => {
    const profileKeys = displayRows.filter((row): row is { type: "profile"; key: string } => row.type === "profile");
    return new Set(profileKeys.slice(0, PRIORITY_PREVIEW_COUNT).map((row) => row.key));
  }, [displayRows]);

  useEffect(() => {
    if (!activeNodeId) return;
    const targetNode = profileItemRefs.current[activeNodeId];
    if (!targetNode) return;
    targetNode.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeNodeId, displayRows, viewMode]);

  const getEffectiveProfileStatus = useCallback(
    (profileKey: string): string =>
      profileStatusOverrides[profileKey] ?? getProfileStatusWithFallback(profileKey, getFiberById),
    [profileStatusOverrides, getFiberById]
  );

  const handleToggleProfileStatus = useCallback(
    (profileKey: string) => {
      const nextRequestVersion = (profileStatusRequestVersionRef.current[profileKey] ?? 0) + 1;
      profileStatusRequestVersionRef.current[profileKey] = nextRequestVersion;
      void toggleProfilePublishStatus({
        profileKey,
        profileId: profileKey,
        currentStatus: getEffectiveProfileStatus(profileKey),
        previousOverrideStatus: profileStatusOverrides[profileKey],
        requestVersion: nextRequestVersion,
        isLatestRequestVersion: (key, version) => profileStatusRequestVersionRef.current[key] === version,
        setStatusOverrides: setProfileStatusOverrides,
        setSavingByKey: setProfileStatusSaving,
        setErrorByKey: setProfileStatusErrors,
        persistStatusOverride: (key, status) => {
          writePassportStatusOverride(key, status);
          updateFiber(key, { status });
        },
      });
    },
    [getEffectiveProfileStatus, profileStatusOverrides, updateFiber]
  );

  // Actions
  const flash = useCallback((msg: string) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(null), 2000);
  }, []);

  const resolveProfileUrls = useCallback(
    (source: ImageMap, key: string): string[] => {
      return resolveDisplayImageEntriesForKey(source, key, activeNodeId, getFiberById)
        .map((e) => extractImageUrl(e).trim())
        .filter((u) => u.length > 0);
    },
    [getFiberById, activeNodeId],
  );

  const addImage = useCallback(
    (key: string, url: string) => {
      setImages((prev) => {
        const entries = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
        const urls = entries.map((e) => extractImageUrl(e).trim());
        if (urls.includes(url.trim())) return prev;
        const nextEntries = [...entries, url.trim()];
        return { ...prev, [key]: coerceImageMapValue(nextEntries) };
      });
      flash(`Added image to ${key}`);
      logActivity({
        tab: 'images',
        action: 'create',
        entityType: 'image',
        entityId: key,
        summary: `Added image to ${key}`,
        detail: { url },
      });
    },
    [setImages, flash, activeNodeId, getFiberById]
  );

  const removeImage = useCallback(
    (key: string, idx: number) => {
      setImages((prev) => {
        const entries = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
        if (entries.length === 0 || idx < 0 || idx >= entries.length) return prev;
        const updated = entries.length <= 1 ? undefined : entries.filter((_, i) => i !== idx);
        const next = { ...prev };
        if (updated === undefined) {
          next[key] = [];
        } else {
          next[key] = coerceImageMapValue(updated);
        }
        return next;
      });
      flash(`Removed image from ${key}`);
      logActivity({
        tab: 'images',
        action: 'delete',
        entityType: 'image',
        entityId: key,
        summary: `Removed image from ${key}`,
        detail: { index: idx },
      });
    },
    [setImages, flash, getFiberById, activeNodeId]
  );

  const reorderImages = useCallback(
    (key: string, from: number, to: number) => {
      setImages((prev) => {
        const arr = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
        if (
          arr.length === 0 ||
          from < 0 ||
          to < 0 ||
          from >= arr.length ||
          to >= arr.length ||
          from === to
        ) {
          return prev;
        }
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return { ...prev, [key]: coerceImageMapValue(arr) };
      });
    },
    [setImages, getFiberById, activeNodeId]
  );

  const cropImage = useCallback(
    (key: string, idx: number, url: string) => {
      setImages((prev) => {
        const arr = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
        if (arr.length === 0 || idx < 0 || idx >= arr.length) return prev;
        const trimmed = url.trim();
        const updated = arr.map((e, i) => (i === idx ? trimmed : e));
        return { ...prev, [key]: coerceImageMapValue(updated) };
      });
      flash(`Cropped image ${idx + 1} in ${key}`);
    },
    [setImages, flash, getFiberById, activeNodeId]
  );

  const getTags = useCallback((key: string) => tags[key] || [], [tags]);

  const addTag = useCallback(
    (key: string, tag: string) => {
      setTagsState((prev) => ({ ...prev, [key]: [...(prev[key] || []), tag] }));
      flash(`Added tag "${tag}" to ${key}`);
    },
    [flash]
  );

  const removeTag = useCallback(
    (key: string, tag: string) => {
      setTagsState((prev) => ({ ...prev, [key]: (prev[key] || []).filter((t) => t !== tag) }));
      flash(`Removed tag "${tag}" from ${key}`);
    },
    [flash]
  );

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setIsCollapseAllActive(true);
    setExpandedKeys(new Set());
    flash('All profiles collapsed');
  }, [flash]);

  const expandAll = useCallback(() => {
    setIsCollapseAllActive(false);
    setExpandedKeys(new Set(allKeys));
    flash('All profiles expanded');
  }, [allKeys, flash]);

  // Bulk operations
  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(filteredKeys));
    flash(`Selected ${filteredKeys.length} profiles`);
  }, [filteredKeys, flash]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const bulkDelete = useCallback(() => {
    if (selectedKeys.size === 0) return;
    setImages((prev) => {
      const next = { ...prev };
      selectedKeys.forEach((key) => delete next[key]);
      return next;
    });
    flash(`Deleted ${selectedKeys.size} profiles`);
    logActivity({
      tab: 'images',
      action: 'delete',
      entityType: 'node',
      entityId: 'bulk',
      summary: `Bulk deleted ${selectedKeys.size} profiles`,
      detail: { keys: Array.from(selectedKeys) },
    });
    setSelectedKeys(new Set());
  }, [selectedKeys, setImages, flash]);

  const bulkTag = useCallback(
    (tag: string) => {
      if (selectedKeys.size === 0) return;
      selectedKeys.forEach((key) => {
        if (!tags[key]?.includes(tag)) {
          addTag(key, tag);
        }
      });
      flash(`Added "${tag}" to ${selectedKeys.size} profiles`);
      setSelectedKeys(new Set());
    },
    [selectedKeys, tags, addTag, flash]
  );

  const markBroken = useCallback((url: string) => {
    logActivity({
      tab: 'images',
      action: 'update',
      entityType: 'image',
      entityId: 'system',
      summary: 'Marked broken image',
      detail: { url },
    });
  }, []);

  // Profile drag-and-drop reordering (syncs with Atlas order)
  const handleProfileDragStart = useCallback((key: string) => {
    React.startTransition(() => {
      setDraggedProfileKey(key);
    });
  }, []);

  const handleProfileDragEnd = useCallback(() => {
    React.startTransition(() => {
      setDraggedProfileKey(null);
    });
  }, []);

  const handleProfileDrop = useCallback((targetKey: string) => {
    if (!draggedProfileKey || draggedProfileKey === targetKey) {
      React.startTransition(() => {
        setDraggedProfileKey(null);
      });
      return;
    }

    const canonicalOrder = dataSource.resolveFiberOrder(canonicalProfileOrder);
    const fromIndex = canonicalOrder.indexOf(draggedProfileKey);
    const toIndex = canonicalOrder.indexOf(targetKey);
    if (fromIndex === -1 || toIndex === -1) {
      React.startTransition(() => {
        setDraggedProfileKey(null);
      });
      return;
    }

    const next = [...canonicalOrder];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    React.startTransition(() => {
      dataSource.setFiberOrder(next);
      setDraggedProfileKey(null);
    });
  }, [draggedProfileKey, canonicalProfileOrder]);

  const patchProfileUploadTask = useCallback((taskId: string, patch: Partial<ProfileUploadTask>) => {
    setProfileUploadQueue((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }, []);

  const runProfileUploadTask = useCallback(async (task: ProfileUploadTask) => {
    patchProfileUploadTask(task.id, { status: 'uploading', error: undefined });
    try {
      const cloudUrl = task.source.kind === 'file'
        ? await uploadToCloudinary(task.source.file, settings.cloudinary, { folder: 'atlas' })
        : await uploadFromUrl(task.source.url, settings.cloudinary, { folder: 'atlas' });

      const alreadyExists = toUrlArray(images[task.profileKey]).includes(cloudUrl);
      if (alreadyExists) {
        patchProfileUploadTask(task.id, { status: 'skipped', error: 'Duplicate image' });
        return null;
      }

      patchProfileUploadTask(task.id, { status: 'done', resultUrl: cloudUrl });
      return cloudUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      patchProfileUploadTask(task.id, { status: 'failed', error: message });
      return null;
    }
  }, [images, patchProfileUploadTask, settings.cloudinary]);

  const handleProfileImageDrop = useCallback(async (profileKey: string, dataTransfer: DataTransfer): Promise<boolean> => {
    if (isInternalImageReorderDrag(dataTransfer)) return false;
    const droppedFiles = Array.from(dataTransfer.files || []).filter((file) => file.type.startsWith('image/'));
    const droppedUrls = getDroppedImageUrls(dataTransfer);
    if (droppedFiles.length === 0 && droppedUrls.length === 0) return false;

    if (!cloudinaryReady) {
      flash('Cloudinary not configured');
      return true;
    }

    const seenUrls = new Set<string>();
    const pendingTasks: ProfileUploadTask[] = [];
    for (const file of droppedFiles) {
      pendingTasks.push({
        id: createUploadTaskId(),
        label: file.name || 'Dropped image file',
        profileKey,
        source: { kind: 'file', file },
        status: 'queued',
      });
    }
    for (const url of droppedUrls) {
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      pendingTasks.push({
        id: createUploadTaskId(),
        label: url,
        profileKey,
        source: { kind: 'url', url },
        status: 'queued',
      });
    }

    setProfileUploadQueue((prev) => [...pendingTasks, ...prev]);
    const uploaded: string[] = [];
    let failed = 0;
    for (const task of pendingTasks) {
      const cloudUrl = await runProfileUploadTask(task);
      if (cloudUrl) uploaded.push(cloudUrl);
      else failed += 1;
    }

    if (uploaded.length > 0) {
      setImages((prev) => {
        const existing = resolveProfileUrls(prev, profileKey);
        const deduped = uploaded.filter((url) => !existing.includes(url));
        if (deduped.length === 0) return prev;
        const entries = [...resolveDisplayImageEntriesForKey(prev, profileKey, activeNodeId, getFiberById), ...deduped];
        return { ...prev, [profileKey]: coerceImageMapValue(entries) };
      });
    }

    if (uploaded.length > 0 && failed === 0) {
      flash(`Added ${uploaded.length} image${uploaded.length === 1 ? '' : 's'} to ${profileKey}`);
    } else if (uploaded.length > 0) {
      flash(`Added ${uploaded.length} image${uploaded.length === 1 ? '' : 's'} to ${profileKey} (${failed} failed)`);
    } else {
      flash('Image upload failed');
    }

    return true;
  }, [cloudinaryReady, flash, runProfileUploadTask, setImages, getFiberById, resolveProfileUrls, activeNodeId]);

  const retryProfileUploadTask = useCallback(async (taskId: string) => {
    const task = profileUploadQueue.find((entry) => entry.id === taskId);
    if (!task || task.status !== 'failed') return;
    const cloudUrl = await runProfileUploadTask(task);
    if (!cloudUrl) return;
    setImages((prev) => {
      const existing = resolveProfileUrls(prev, task.profileKey);
      if (existing.includes(cloudUrl)) return prev;
      const entries = [...resolveDisplayImageEntriesForKey(prev, task.profileKey, activeNodeId, getFiberById), cloudUrl];
      return { ...prev, [task.profileKey]: coerceImageMapValue(entries) };
    });
  }, [profileUploadQueue, runProfileUploadTask, setImages, getFiberById, resolveProfileUrls, activeNodeId]);

  const dismissProfileUploadTask = useCallback((taskId: string) => {
    setProfileUploadQueue((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const clearFinishedProfileUploadTasks = useCallback(() => {
    setProfileUploadQueue((prev) => prev.filter((task) => task.status === 'queued' || task.status === 'uploading'));
  }, []);

  const renameKey = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey || !newKey.trim() || images[newKey]) return;
      setImages((prev) => {
        const next: ImageMap = {};
        Object.entries(prev).forEach(([k, v]) => {
          if (k === oldKey) next[newKey] = v;
          else next[k] = v;
        });
        return next;
      });
      flash(`Renamed ${oldKey} → ${newKey}`);
      logActivity({
        tab: 'images',
        action: 'update',
        entityType: 'node',
        entityId: newKey,
        summary: `Renamed profile from ${oldKey}`,
        detail: { from: oldKey, to: newKey },
      });
    },
    [images, setImages, flash]
  );

  const pasteFromClipboard = useCallback(async (key: string): Promise<boolean> => {
    try {
      const text = await navigator.clipboard.readText();
      const url = extractFirstImageUrlFromClipboardText(text);
      if (!url) {
        flash('Clipboard does not contain a valid URL');
        return false;
      }
      const trimmed = url.trim();
      if (cloudinaryReady && !isCloudinaryUploadDeliveryUrl(trimmed)) {
        const task: ProfileUploadTask = {
          id: createUploadTaskId(),
          label: trimmed,
          profileKey: key,
          source: { kind: 'url', url: trimmed },
          status: 'queued',
        };
        setProfileUploadQueue((prev) => [task, ...prev]);
        const cloudUrl = await runProfileUploadTask(task);
        if (!cloudUrl) {
          flash('Clipboard URL upload failed — check Cloudinary settings or try again');
          return false;
        }
        setImages((prev) => {
          const existing = resolveProfileUrls(prev, key);
          if (existing.includes(cloudUrl)) return prev;
          const entries = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById), cloudUrl];
          return { ...prev, [key]: coerceImageMapValue(entries) };
        });
        flash(`Added image to ${key}`);
        logActivity({
          tab: 'images',
          action: 'create',
          entityType: 'image',
          entityId: key,
          summary: `Pasted & uploaded image to ${key}`,
          detail: { url: cloudUrl },
        });
        return true;
      }
      addImage(key, trimmed);
      return true;
    } catch (err: any) {
      flash('Failed to read clipboard: ' + err.message);
      return false;
    }
  }, [
    activeNodeId,
    addImage,
    cloudinaryReady,
    flash,
    getFiberById,
    resolveProfileUrls,
    runProfileUploadTask,
    setImages,
  ]);

  const promoteToHero = useCallback((key: string, idx: number) => {
    setImages((prev) => {
      const arr = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
      if (arr.length === 0 || idx <= 0 || idx >= arr.length) return prev;
      const [hero] = arr.splice(idx, 1);
      arr.unshift(hero);
      return { ...prev, [key]: coerceImageMapValue(arr) };
    });
    flash('Image promoted to hero position');
  }, [setImages, flash, getFiberById, activeNodeId]);

  const sendToFront = useCallback((key: string, idx: number) => {
    setImages((prev) => {
      const arr = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
      if (arr.length === 0 || idx <= 0 || idx >= arr.length) return prev;
      const [img] = arr.splice(idx, 1);
      arr.unshift(img);
      return { ...prev, [key]: coerceImageMapValue(arr) };
    });
  }, [setImages, getFiberById, activeNodeId]);

  const sendToBack = useCallback((key: string, idx: number) => {
    setImages((prev) => {
      const arr = [...resolveDisplayImageEntriesForKey(prev, key, activeNodeId, getFiberById)];
      if (arr.length === 0 || idx < 0 || idx >= arr.length - 1) return prev;
      const [img] = arr.splice(idx, 1);
      arr.push(img);
      return { ...prev, [key]: coerceImageMapValue(arr) };
    });
  }, [setImages, getFiberById, activeNodeId]);

  const setPreviewFocal = useCallback(
    (profileKey: string, imageIndex: number, focal: PreviewFocalPoint | null) => {
      setImages((prev) => {
        const arr = [...resolveDisplayImageEntriesForKey(prev, profileKey, activeNodeId, getFiberById)];
        if (
          imageIndex < 0 ||
          imageIndex >= arr.length ||
          imageIndex >= PREVIEW_FOCAL_SLOT_COUNT
        ) {
          return prev;
        }
        const url = extractImageUrl(arr[imageIndex]).trim();
        const next = [...arr];
        next[imageIndex] = focal
          ? { url, previewFocal: { x: clamp01(focal.x), y: clamp01(focal.y) } }
          : url;
        return { ...prev, [profileKey]: coerceImageMapValue(next) };
      });
    },
    [getFiberById, setImages, activeNodeId],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        flash('Undo');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        flash('Redo');
      }

      // Select All
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      }

      // Escape to clear selection and close modals
      if (e.key === 'Escape') {
        if (lightbox) {
          setLightbox(null);
        } else if (showScout) {
          setShowScout(null);
        } else if (showStoryboard) {
          setShowStoryboard(null);
        } else if (contextMenu) {
          setContextMenu(null);
        } else if (selectedKeys.size > 0) {
          clearSelection();
        }
      }

      // Zoom with +/-
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(400, z + 20));
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(100, z - 20));
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, flash, selectAll, clearSelection, lightbox, showScout, showStoryboard, contextMenu, selectedKeys.size]);

  return (
    <div className="h-full flex flex-col bg-neutral-950 text-neutral-200 overflow-hidden">
      {import.meta.env.DEV && import.meta.env.MODE !== 'test' && imageCatalogDiskSyncError ? (
        <div
          className="flex-none flex flex-wrap items-center gap-2 px-4 py-2 border-b border-red-500/35 bg-red-950/85 text-sm text-red-100"
          role="alert"
        >
          <span className="flex-1 min-w-[12rem]">
            Could not save image catalog to disk: {imageCatalogDiskSyncError}
          </span>
          <button
            type="button"
            className="shrink-0 px-2.5 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-50 text-xs font-medium border border-red-400/30"
            onClick={() => flushImageCatalogDiskSync({ bypassFingerprint: true })}
          >
            Retry save
          </button>
        </div>
      ) : null}
      {/* Header Toolbar */}
      <div
        className="flex-none flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}
      >
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => { undo(); flash('Undo'); }}
            disabled={!canUndo}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Undo (⌘Z)"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => { redo(); flash('Redo'); }}
            disabled={!canRedo}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent scale-x-[-1]"
            title="Redo (⌘⇧Z)"
          >
            <UndoIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/[0.08]" />

        {!isSearchControlled ? (
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              value={searchQueryInput}
              onChange={(e) => setSearchQueryInput(e.target.value)}
              placeholder="Search profiles..."
              className="w-full bg-white/[0.03] text-white pl-9 pr-4 py-2 rounded-lg text-sm border border-white/[0.06] focus:border-blue-500/50 focus:bg-white/[0.05] focus:outline-none transition-all placeholder:text-neutral-600"
            />
            <ScoutIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQueryInput && (
              <button
                onClick={() => setSearchQueryInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-500 hover:text-white rounded"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : null}

        {/* Stats */}
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="text-white font-medium">{filteredKeys.length}</span>
          <span>/</span>
          <span>{allKeys.length}</span>
          <span className="text-neutral-600">profiles</span>
        </div>

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Collapse/Expand All */}
        <div className="flex items-center gap-1">
          <button
            onClick={collapseAll}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            title="Collapse All"
          >
            <CompressIcon className="w-4 h-4" />
          </button>
          <button
            onClick={expandAll}
            className="p-2 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            title="Expand All"
          >
            <GridIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(100, z - 20))}
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOutIcon className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={100}
            max={400}
            step={20}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-20 zoom-slider"
            title={`Thumbnail size: ${zoom}px`}
          />
          <button
            onClick={() => setZoom((z) => Math.min(400, z + 20))}
            className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/[0.05] rounded transition-colors"
            title="Zoom In (+)"
          >
            <ZoomInIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Operations Bar */}
      <BulkOperationsBar
        selectedCount={selectedKeys.size}
        totalCount={filteredKeys.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={bulkDelete}
        onBulkTag={bulkTag}
        availableTags={allTagPaths}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Profile List */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-4 scout-results-scroll",
            viewMode === 'list' && "space-y-3",
            viewMode === 'cards' && "grid gap-4 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3",
            viewMode === 'grid' && "grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
          )}
          data-testid="image-db-content"
          data-view-mode={viewMode}
        >
          {filteredKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-neutral-500 col-span-full">
              <ImageIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No profiles found</p>
              {searchQuery && <p className="text-xs mt-1 opacity-60">Try a different search</p>}
            </div>
          ) : (
            displayRows.map((row) => {
              if (row.type === "header") {
                return (
                  <div
                    key="navigation-parent-header"
                    className={cn(
                      "col-span-full rounded-md border border-white/[0.08] bg-amber-400/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/90"
                    )}
                  >
                    {NAVIGATION_PARENT_LABEL}
                  </div>
                );
              }

              const key = row.key;
              const prioritizePreview = prioritizedProfileKeys.has(key);
              if (viewMode !== 'list') {
                return (
                  <div
                    key={key}
                    ref={setProfileItemRef(key)}
                    data-profile-key={key}
                    data-testid={`image-db-profile-${key}`}
                  >
                    <CompactProfileTile
                      entryKey={key}
                      value={displayImages[key]}
                      status={getEffectiveProfileStatus(key)}
                      layoutMode={viewMode}
                      isSelected={selectedKeys.has(key)}
                      onToggleSelect={() => toggleSelect(key)}
                      onLightbox={(idx) => setLightbox({ urls: toUrlArray(displayImages[key]), index: idx, label: key, entryKey: key })}
                      onOpenScout={() => setShowScout({ profileKey: key })}
                      onOpenStoryboard={() => setShowStoryboard({ entryKey: key, urls: toUrlArray(displayImages[key]) })}
                      onToggleStatus={() => handleToggleProfileStatus(key)}
                      statusSaving={profileStatusSaving[key] === true}
                      statusError={profileStatusErrors[key]}
                      markBroken={markBroken}
                      prioritizePreview={prioritizePreview}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  ref={setProfileItemRef(key)}
                  data-profile-key={key}
                  data-testid={`image-db-profile-${key}`}
                >
                  <ProfileCard
                    entryKey={key}
                    value={displayImages[key]}
                    status={getEffectiveProfileStatus(key)}
                    zoom={getEffectiveProfileZoom(zoom, viewMode)}
                    layoutMode={viewMode}
                    isExpanded={expandedKeys.has(key)}
                    isSelected={selectedKeys.has(key)}
                    tags={getTags(key)}
                    allTagPaths={allTagPaths}
                    onToggleExpand={() => toggleExpand(key)}
                    onToggleSelect={() => toggleSelect(key)}
                    onLightbox={(idx) => setLightbox({ urls: toUrlArray(displayImages[key]), index: idx, label: key, entryKey: key })}
                    onRemoveImage={(idx) => removeImage(key, idx)}
                    onReorderImages={(from, to) => reorderImages(key, from, to)}
                    onOpenScout={() => setShowScout({ profileKey: key })}
                    onOpenStoryboard={() => setShowStoryboard({ entryKey: key, urls: toUrlArray(displayImages[key]) })}
                    onAddTag={(tag) => addTag(key, tag)}
                    onRemoveTag={(tag) => removeTag(key, tag)}
                    onContextMenu={(e, url, idx) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, profileKey: key, imageUrl: url, index: idx });
                    }}
                    onRename={(newKey) => renameKey(key, newKey)}
                    onPasteFromClipboard={() => pasteFromClipboard(key)}
                    onToggleStatus={() => handleToggleProfileStatus(key)}
                    statusSaving={profileStatusSaving[key] === true}
                    statusError={profileStatusErrors[key]}
                    onPromoteToHero={(idx) => promoteToHero(key, idx)}
                    onSendToFront={(idx) => sendToFront(key, idx)}
                    onSendToBack={(idx) => sendToBack(key, idx)}
                    markBroken={markBroken}
                    onNavigateToKnowledge={onNavigateToKnowledge}
                    profileDraggable={true}
                    onProfileDragStart={() => handleProfileDragStart(key)}
                    onProfileDragEnd={handleProfileDragEnd}
                    onProfileDragOver={(e) => { e.preventDefault(); }}
                    onProfileDrop={async (e) => {
                      e.preventDefault();
                      const handledImageDrop = await handleProfileImageDrop(key, e.dataTransfer);
                      if (handledImageDrop) {
                        setDraggedProfileKey(null);
                        return;
                      }
                      handleProfileDrop(key);
                    }}
                    isProfileDragging={draggedProfileKey === key}
                    prioritizePreview={prioritizePreview}
                    onSetPreviewFocal={(idx, focal) => setPreviewFocal(key, idx, focal)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Toast */}
      {flashMsg && <Toast message={flashMsg} onDone={() => setFlashMsg(null)} />}
      <UploadQueuePanel
        title="Profile Uploads"
        items={profileUploadQueue}
        onRetry={(taskId) => {
          void retryProfileUploadTask(taskId);
        }}
        onDismiss={dismissProfileUploadTask}
        onClearFinished={clearFinishedProfileUploadTasks}
      />

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          startIndex={lightbox.index}
          label={lightbox.label}
          entryKey={lightbox.entryKey}
          startCropRef={lightboxStartCropRef}
          onCropFeedback={flash}
          onCropImage={(key, idx, url) => cropImage(key, idx, url)}
          onContextMenuImage={(event, imageUrl, index) => {
            event.preventDefault();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              profileKey: lightbox.entryKey,
              imageUrl,
              index,
            });
          }}
          onDownloadImage={(imageUrl) => {
            triggerImageDownload(imageUrl);
          }}
          onClose={() => setLightbox(null)}
          era={CANONICAL_ERA}
          origin={CANONICAL_ORIGINS}
          scientific={CANONICAL_SCIENTIFIC}
        />
      )}

      {/* Storyboard */}
      {showStoryboard && (
        <AdminProfileStoryboard
          nodeId={showStoryboard.entryKey}
          nodeLabel={showStoryboard.entryKey}
          initialImages={showStoryboard.urls}
          onClose={() => setShowStoryboard(null)}
        />
      )}

      {/* Links Modal */}
      {showLinks && (
        <LinksModal
          urls={showLinks.urls}
          onClose={() => setShowLinks(null)}
        />
      )}

      {/* Scout Panel */}
      {showScout && (
        <React.Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
              <div className="text-white">Loading...</div>
            </div>
          }
        >
          <ImageScoutPanel
            allProfileKeys={
              activeNodeId && !allKeys.includes(activeNodeId) && getFiberById(activeNodeId)
                ? [...allKeys, activeNodeId]
                : allKeys
            }
            cloudinaryConfig={settings.cloudinary}
            cloudinaryReady={cloudinaryReady}
            onAddImages={(profileKey, urls) => {
              urls.forEach((url) => addImage(profileKey, url));
            }}
            onClose={() => setShowScout(null)}
            onFlash={flash}
            initialQuery={showScout.initialQuery}
            initialProfile={showScout.profileKey}
            images={displayImages}
            tags={tags}
            era={CANONICAL_ERA}
            origins={CANONICAL_ORIGINS}
            scientific={CANONICAL_SCIENTIFIC}
            onRemoveImage={removeImage}
          />
        </React.Suspense>
      )}

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-neutral-900/95 border border-white/[0.08] rounded-lg shadow-2xl py-1 min-w-[180px] backdrop-blur-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={async () => {
              await copyContextMenuImageToClipboard({
                imageUrl: contextMenu.imageUrl,
                flash,
                setContextMenu,
              });
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-neutral-500" /> Copy Image
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.imageUrl);
              flash('Copied URL');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <CopyIcon className="w-4 h-4 text-neutral-500" /> Copy URL
          </button>

          <button
            onClick={() => {
              triggerImageDownload(contextMenu.imageUrl);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <DownloadIcon className="w-4 h-4 text-neutral-500" /> Download Image
          </button>

          {lightbox &&
            isCloudinaryUrl(contextMenu.imageUrl) &&
            canApplyCloudinaryCrop(contextMenu.imageUrl) && (
              <button
                type="button"
                aria-label="Crop in fullscreen"
                onClick={() => {
                  setContextMenu(null);
                  lightboxStartCropRef.current?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
              >
                <CropMenuIcon className="w-4 h-4 text-neutral-500" /> Crop…
              </button>
            )}

          <button
            onClick={() => {
              removeImage(contextMenu.profileKey, contextMenu.index);
              flash('Image removed');
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
          >
            <TrashIcon className="w-4 h-4" /> Remove
          </button>

          <div className="my-1 border-t border-white/[0.06]" />

          <button
            onClick={() => {
              sendToFront(contextMenu.profileKey, contextMenu.index);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <ArrowUpIcon className="w-4 h-4 text-neutral-500" /> Send to Front
          </button>

          <button
            onClick={() => {
              sendToBack(contextMenu.profileKey, contextMenu.index);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <ArrowDownIcon className="w-4 h-4 text-neutral-500" /> Send to Back
          </button>

          <div className="my-1 border-t border-white/[0.06]" />

          <button
            onClick={async () => {
              if (!cloudinaryReady) {
                flash('Cloudinary not configured');
                setContextMenu(null);
                return;
              }
              try {
                await requestCloudinaryUpscale({
                  imageUrl: contextMenu.imageUrl,
                  cloudName: settings.cloudinary.cloudName,
                  scale: '2x',
                });
                flash('Upscale requested');
              } catch (err: any) {
                flash(`Upscale failed: ${err.message}`);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <ArrowUpDownIcon className="w-4 h-4 text-neutral-500" /> Upscale
          </button>

          <button
            onClick={() => {
              setLightbox({
                urls: toUrlArray(displayImages[contextMenu.profileKey]),
                index: contextMenu.index,
                label: contextMenu.profileKey,
                entryKey: contextMenu.profileKey,
              });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/[0.08] flex items-center gap-2 transition-colors"
          >
            <ZoomInIcon className="w-4 h-4 text-neutral-500" /> View in Lightbox
          </button>
        </div>
      )}

    </div>
  );
}
