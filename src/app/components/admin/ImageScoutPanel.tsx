import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  searchImages,
  searchPinterestImages,
  fetchIIIFManifest,
  buildScoutQuery,
  PROVIDERS,
  getConfiguredProviders,
  type ImageSource,
  type ImageSearchResult,
  type SearchApiKeys,
} from '@/utils/imageSearch';
import { uploadFromUrl, uploadToCloudinary } from '@/utils/cloudinary';
import { requestCloudinaryUpscale } from '@/utils/cloudinary';
import type { CloudinaryConfig } from '@/utils/cloudinary';
import type { AtlasMedia } from '@/types/atlas-media';
import { useAdminSettings } from '@/contexts/AdminSettingsContext';
import ImageContextMenu, { type ContextMenuState } from './ImageContextMenu';
import UpscaleReviewModal from './UpscaleReviewModal';
import { UploadQueuePanel, type UploadQueueItem } from './upload-queue-panel';
import { copyImageFromUrl } from '@/utils/clipboardImage';
import { extractImageUrl, toUrlArray } from '@/utils/imageUrl';
import { useDebouncedCallback } from '@/utils/debounce';

// ── Types ────────────────────────────────────────────────

type ImageEntry = string | AtlasMedia;
type ImageMap = Record<string, ImageEntry | ImageEntry[]>;
export const IMAGE_SCOUT_PANEL_VIEW_NAME = "ImageScoutPanel";
interface ScoutUploadTask extends UploadQueueItem {
  sourceFile: File;
  resultUrl?: string;
}

export interface ImageScoutPanelProps {
  allProfileKeys: string[];
  braveApiKey?: string;
  cloudinaryConfig?: CloudinaryConfig;
  cloudinaryReady?: boolean;
  onAddImages: (profileKey: string, urls: string[], media?: AtlasMedia[]) => void | Promise<void>;
  onClose: () => void;
  onFlash: (msg: string) => void;
  initialQuery?: string;
  initialProfile?: string;

  /** Existing images for the profile metadata panel */
  images?: ImageMap;
  /** Tags for all profiles */
  tags?: Record<string, string[]>;
  /** Era map */
  era?: Record<string, string>;
  /** Origins map */
  origins?: Record<string, string>;
  /** Scientific names map */
  scientific?: Record<string, string>;
  /** Reorder callback */
  onReorderImages?: (key: string, fromIdx: number, toIdx: number) => void;
  /** Remove image callback */
  onRemoveImage?: (key: string, idx: number) => void;

  /** Queue mode (Rapid Scout) */
  queue?: string[];
  onQueueClose?: () => void;
  /** When true, fills parent instead of fixed overlay */
  embedded?: boolean;
}

// ── Constants ────────────────────────────────────────────

const PAGE_SIZE = 20;
const TARGET_COUNT = 3;
const ADVANCE_DELAY_MS = 800;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_TAG_LAYERS = 4;

const PLATE_LABELS = ['Hero', 'Origin', 'Fiber', 'Process', 'Color'];

const SOURCE_COLORS: Record<ImageSource, string> = {
  brave: '#fb542b',
  unsplash: '#ffffff',
  pexels: '#05a081',
  flickr: '#ff0084',
  openverse: '#c233ed',
  europeana: '#0a72cc',
  wikimedia: '#069',
  pinterest: '#e60023',
};

const SOURCE_ABBREV: Record<string, string> = {
  brave: 'B', unsplash: 'U', pexels: 'P', openverse: 'O', europeana: 'E', wikimedia: 'W', pinterest: 'PI',
};

function SourceIcon({ source, active }: { source: ImageSource; active: boolean }) {
  const color = active ? SOURCE_COLORS[source] : '#b3b3b3';
  switch (source) {
    case 'brave':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36z" fill={color} />
        </svg>
      );
    case 'unsplash':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M7.5 6.75V0h9v6.75h-9zm9 3.75H24V24H0V10.5h7.5v6.75h9V10.5z" fill={color} />
        </svg>
      );
    case 'pexels':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M1.5 0A1.5 1.5 0 000 1.5v21A1.5 1.5 0 001.5 24h21a1.5 1.5 0 001.5-1.5v-21A1.5 1.5 0 0022.5 0h-21zm6.75 6.75h5.2715a3.843 3.843 0 01.627 7.6348V17.25H8.25V6.75zm1.5 1.5v7.5h2.8984v-2.8145h.873a2.343 2.343 0 100-4.6855H9.75Z" fill={color} />
        </svg>
      );
    case 'flickr':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M5.334 6.666C2.3884 6.666 0 9.055 0 12c0 2.9456 2.3884 5.334 5.334 5.334 2.9456 0 5.332-2.3884 5.332-5.334 0-2.945-2.3864-5.334-5.332-5.334zm13.332 0c-2.9456 0-5.332 2.389-5.332 5.334 0 2.9456 2.3864 5.334 5.332 5.334C21.6116 17.334 24 14.9456 24 12c0-2.945-2.3884-5.334-5.334-5.334Z" fill={color} />
        </svg>
      );
    case 'openverse':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M4.882 1.018C2.182 1.018 0 3.214 0 5.932c0 2.704 2.182 4.915 4.882 4.915Zm7.118 0c-2.686 0-4.882 2.196-4.882 4.914 0 2.704 2.182 4.915 4.882 4.915zm7.118 0c-2.696 0-4.881 2.2-4.881 4.914 0 2.714 2.185 4.915 4.88 4.915 2.697 0 4.883-2.2 4.883-4.915 0-2.714-2.186-4.914-4.882-4.914zm0 12.093c-2.696 0-4.881 2.2-4.881 4.915 0 2.714 2.185 4.914 4.88 4.914 2.697 0 4.883-2.2 4.883-4.914 0-2.714-2.186-4.915-4.882-4.915ZM12 13.126c-2.686 0-4.882 2.196-4.882 4.9S9.3 22.94 12 22.94zm-7.118.04c-2.7 0-4.882 2.197-4.882 4.9 0 2.719 2.182 4.916 4.882 4.916Z" fill={color} />
        </svg>
      );
    case 'europeana':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M16.5 6.8H8.8v3h6.8v1.7H8.8v3.7h7.7" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'wikimedia':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M9.048 15.203a2.952 2.952 0 1 1 5.904 0 2.952 2.952 0 0 1-5.904 0zm11.749.064v-.388h-.006a8.726 8.726 0 0 0-.639-2.985 8.745 8.745 0 0 0-1.706-2.677l.004-.004-.186-.185-.044-.045-.026-.026-.204-.204-.006.007c-.848-.756-1.775-1.129-2.603-1.461-1.294-.519-2.138-.857-2.534-2.467.443.033.839.174 1.13.481C15.571 6.996 11.321 0 11.321 0s-1.063 3.985-2.362 5.461c-.654.744.22.273 1.453-.161.279 1.19.77 2.119 1.49 2.821.791.771 1.729 1.148 2.556 1.48.672.27 1.265.508 1.767.916l-.593.594-.668-.668-.668 2.463 2.463-.668-.668-.668.6-.599a6.285 6.285 0 0 1 1.614 3.906h-.844v-.944l-2.214 1.27 2.214 1.269v-.944h.844a6.283 6.283 0 0 1-1.614 3.906l-.6-.599.668-.668-2.463-.668.668 2.463.668-.668.6.6a6.263 6.263 0 0 1-3.907 1.618v-.848h.945L12 18.45l-1.27 2.214h.944v.848a6.266 6.266 0 0 1-3.906-1.618l.599-.6.668.668.668-2.463-2.463.668.668.668-.6.599a6.29 6.29 0 0 1-1.615-3.906h.844v.944l2.214-1.269-2.214-1.27v.944h-.843a6.292 6.292 0 0 1 1.615-3.906l.6.599-.668.668 2.463.668-.668-2.463-.668.668-2.359-2.358-.23.229-.044.045-.185.185.004.004a8.749 8.749 0 0 0-2.345 5.662h-.006v.649h.006a8.749 8.749 0 0 0 2.345 5.662l-.004.004.185.185.045.045.045.045.185.185.004-.004a8.73 8.73 0 0 0 2.677 1.707 8.75 8.75 0 0 0 2.985.639V24h.649v-.006a8.75 8.75 0 0 0 2.985-.639 8.717 8.717 0 0 0 2.677-1.707l.004.004.187-.187.044-.043.043-.044.187-.186-.004-.004a8.733 8.733 0 0 0 1.706-2.677 8.726 8.726 0 0 0 .639-2.985h.006v-.259z" fill={color} />
        </svg>
      );
    case 'pinterest':
      return (
        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" fill={color} />
        </svg>
      );
  }
}

const SCOUT_ZOOM_STEPS = [140, 180, 260, 360, 500] as const;
const SCOUT_ZOOM_LABELS = ['XS', 'S', 'M', 'L', 'XL'] as const;
const SCOUT_ZOOM_DEFAULT = 2;

interface ScoutUpscaleReviewState {
  beforeUrl: string;
  afterUrl: string;
  resultIndex: number;
}

// ── Helpers ──────────────────────────────────────────────
// Using unified imageUrl utilities - extractImageUrl and toUrlArray imported from '@/utils/imageUrl'

function countImages(value: ImageEntry | ImageEntry[] | undefined): number {
  if (!value) return 0;
  if (typeof value === 'string') return 1;
  if (Array.isArray(value)) return value.length;
  return 1;
}

function resultToMedia(r: ImageSearchResult): AtlasMedia {
  return {
    url: r.imageUrl,
    thumbUrl: r.thumbnailUrl,
    tileSource: r.tileSource,
    sourceManifest: r.sourceManifest,
    rights: r.rights,
    attribution: r.attribution,
    licenseUrl: r.licenseUrl,
    provider: r.provider,
    title: r.title,
    width: r.width,
    height: r.height,
  };
}

function rightsLabel(rights?: string): string | null {
  if (!rights) return null;
  const lower = rights.toLowerCase();
  if (lower.includes('publicdomain') || lower.includes('/pdm/') || lower.includes('/zero/')) return 'PD';
  if (lower.includes('/by-nc-sa/')) return 'CC BY-NC-SA';
  if (lower.includes('/by-nc-nd/')) return 'CC BY-NC-ND';
  if (lower.includes('/by-nc/')) return 'CC BY-NC';
  if (lower.includes('/by-sa/')) return 'CC BY-SA';
  if (lower.includes('/by-nd/')) return 'CC BY-ND';
  if (lower.includes('/by/')) return 'CC BY';
  if (lower.includes('creativecommons')) return 'CC';
  if (lower.includes('rightsstatements.org')) {
    if (lower.includes('/noc/')) return 'No ©';
    if (lower.includes('/inc/')) return 'In ©';
  }
  return null;
}

function normalizeCategoryRoot(root: string): string {
  return root === 'parent' ? 'roots' : root;
}

function getCategoryBadge(tags?: string[]): { label: string; color: string } | null {
  if (!tags?.length) return null;
  const root = normalizeCategoryRoot(tags[0].split('/')[0]);
  switch (root) {
    case 'fiber': return { label: 'Fiber', color: '#22c55e' };
    case 'textile': return { label: 'Textile', color: '#3b82f6' };
    case 'dyes': return { label: 'Dye', color: '#a855f7' };
    case 'roots': return { label: 'Roots', color: '#eab308' };
    default: return { label: root, color: '#888' };
  }
}

interface ProfileHierarchyNode {
  children: Map<string, ProfileHierarchyNode>;
  profiles: string[];
}

function createProfileHierarchyNode(): ProfileHierarchyNode {
  return {
    children: new Map<string, ProfileHierarchyNode>(),
    profiles: [],
  };
}

export function getPrimaryTagPathSegments(tags?: string[]): string[] {
  const firstTag = tags?.[0]?.trim();
  if (!firstTag) return ['untagged'];
  const segments = firstTag
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return ['untagged'];
  // Keep picker depth intentional: 3-4 tag layers before profile choice.
  return segments.slice(0, MAX_TAG_LAYERS);
}

export function buildProfileHierarchy(
  allProfileKeys: string[],
  tagsByProfile?: Record<string, string[]>,
): ProfileHierarchyNode {
  const root = createProfileHierarchyNode();
  for (const profileKey of allProfileKeys) {
    const path = getPrimaryTagPathSegments(tagsByProfile?.[profileKey]);
    let node = root;
    for (const segment of path) {
      let child = node.children.get(segment);
      if (!child) {
        child = createProfileHierarchyNode();
        node.children.set(segment, child);
      }
      node = child;
    }
    node.profiles.push(profileKey);
  }
  return root;
}

export function getProfileHierarchyNode(
  root: ProfileHierarchyNode,
  path: string[],
): ProfileHierarchyNode | null {
  let node: ProfileHierarchyNode = root;
  for (const segment of path) {
    const next = node.children.get(segment);
    if (!next) return null;
    node = next;
  }
  return node;
}

function isLikelyImageUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) return false;
  if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(normalized)) return true;
  return normalized.includes("cloudinary.com/") || normalized.includes("/image/upload/");
}

function getDroppedImageUrls(dataTransfer: DataTransfer): string[] {
  const urls = new Set<string>();
  const readData = typeof dataTransfer.getData === "function"
    ? dataTransfer.getData.bind(dataTransfer)
    : () => "";

  const uriList = readData("text/uri-list") || "";
  for (const line of uriList.split("\n")) {
    const candidate = line.trim();
    if (candidate && !candidate.startsWith("#") && isLikelyImageUrl(candidate)) {
      urls.add(candidate);
    }
  }

  const textPlain = readData("text/plain") || "";
  const plainCandidate = textPlain.trim();
  if (plainCandidate && isLikelyImageUrl(plainCandidate)) {
    urls.add(plainCandidate);
  }

  const html = readData("text/html") || "";
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgSrcRegex.exec(html)) !== null) {
    const src = match[1]?.trim() || "";
    if (src && isLikelyImageUrl(src)) {
      urls.add(src);
    }
  }

  return Array.from(urls);
}

function createScoutUploadTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function uploadRemoteImageUrlsToAtlasFolder(
  urls: string[],
  media: AtlasMedia[] | undefined,
  cloudinaryConfig: CloudinaryConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<{ uploaded: string[]; uploadedMedia: AtlasMedia[]; failed: string[] }> {
  const uploaded: string[] = [];
  const uploadedMedia: AtlasMedia[] = [];
  const failed: string[] = [];
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const cloudUrl = await uploadFromUrl(urls[i], cloudinaryConfig, { folder: "atlas" });
      uploaded.push(cloudUrl);
      if (media?.[i]) uploadedMedia.push({ ...media[i], url: cloudUrl });
    } catch {
      failed.push(urls[i]);
    }
    onProgress?.(i + 1, urls.length);
  }
  return { uploaded, uploadedMedia, failed };
}

const HOTLINK_ONLY_TITLE =
  "Stores the original image URL only. Those links often break when the source site changes. Prefer “Upload to CDN” when Cloudinary is configured.";

// ── Main Component ───────────────────────────────────────

export default function ImageScoutPanel({
  allProfileKeys,
  braveApiKey,
  cloudinaryConfig: cloudinaryConfigProp,
  cloudinaryReady: cloudinaryReadyProp,
  onAddImages,
  onClose,
  onFlash,
  initialQuery,
  initialProfile,
  images: imagesProp,
  tags: tagsProp,
  era: eraProp,
  origins: originsProp,
  scientific: scientificProp,
  onReorderImages,
  onRemoveImage,
  queue,
  onQueueClose,
  embedded,
}: ImageScoutPanelProps) {
  const { settings, goToSettings } = useAdminSettings();

  // ── API keys / Cloudinary ──
  const apiKeys: SearchApiKeys = useMemo(() => {
    const keys = { ...settings.imageSearch };
    if (braveApiKey && !keys.brave) keys.brave = braveApiKey;
    return keys;
  }, [settings.imageSearch, braveApiKey]);

  const cloudinaryConfig: CloudinaryConfig = cloudinaryConfigProp || settings.cloudinary;
  const cloudinaryReady = cloudinaryReadyProp ?? !!(settings.cloudinary.cloudName && settings.cloudinary.uploadPreset);

  // ── Queue mode state ──
  const isQueueMode = !!queue?.length;
  const [fullQueue] = useState(() => queue ? [...queue] : []);
  const [queueCatFilter, setQueueCatFilter] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [totalAdded, setTotalAdded] = useState(0);
  const justAddedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (leftPanelTimer.current) clearTimeout(leftPanelTimer.current);
    };
  }, []);

  const filteredQueue = useMemo(() => {
    if (!queueCatFilter) return fullQueue;
    return fullQueue.filter(k => {
      const t = tagsProp?.[k];
      if (!t?.length) return queueCatFilter === 'other';
      return normalizeCategoryRoot(t[0].split('/')[0]) === queueCatFilter;
    });
  }, [fullQueue, queueCatFilter, tagsProp]);

  const queueCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k of fullQueue) {
      const t = tagsProp?.[k];
      const cat = t?.length ? normalizeCategoryRoot(t[0].split('/')[0]) : 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [fullQueue, tagsProp]);

  const [queueIndex, setQueueIndex] = useState(0);

  const queueProfile = isQueueMode ? (filteredQueue[queueIndex] ?? null) : null;
  const queueDone = isQueueMode && queueIndex >= filteredQueue.length;

  const currentProfileKey = isQueueMode ? queueProfile : (initialProfile || null);

  const progressFraction = filteredQueue.length > 0
    ? Math.min((queueIndex + 1) / filteredQueue.length, 1)
    : 1;

  const queueAdvance = useCallback(() => {
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setQueueIndex(i => i + 1);
  }, []);

  const queueSkip = useCallback(() => {
    if (queueProfile) setSkipped(prev => new Set(prev).add(queueProfile));
    queueAdvance();
  }, [queueProfile, queueAdvance]);

  const queueGoBack = useCallback(() => {
    setQueueIndex(i => Math.max(0, i - 1));
  }, []);

  const queueItemStatus = useCallback((key: string): 'active' | 'done' | 'skipped' | 'pending' => {
    if (key === queueProfile && !queueDone) return 'active';
    if (completed.has(key)) return 'done';
    if (skipped.has(key)) return 'skipped';
    return 'pending';
  }, [queueProfile, queueDone, completed, skipped]);

  useEffect(() => {
    if (!queueStripRef.current || !isQueueMode) return;
    const activeEl = queueStripRef.current.querySelector('[data-queue-active="true"]');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [queueIndex, isQueueMode]);

  useEffect(() => { setQueueIndex(0); }, [queueCatFilter]);

  // ── Search state ──
  const profileTags = currentProfileKey ? tagsProp?.[currentProfileKey] : undefined;
  const smartQuery = useMemo(() => {
    if (initialQuery) return initialQuery;
    if (currentProfileKey) return buildScoutQuery(currentProfileKey, profileTags);
    return '';
  }, [initialQuery, currentProfileKey, profileTags]);

  const [query, setQuery] = useState(smartQuery);
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<ImageSearchResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadQueue, setUploadQueue] = useState<ScoutUploadTask[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [cascadeFrom, setCascadeFrom] = useState<number>(0);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [upscaleReview, setUpscaleReview] = useState<ScoutUpscaleReviewState | null>(null);
  const [scoutZoom, setScoutZoom] = useState(SCOUT_ZOOM_DEFAULT);

  const [activeSource, setActiveSource] = useState<ImageSource>(() => {
    if (settings.imageSearch.brave || braveApiKey) return 'brave';
    const configured = getConfiguredProviders(settings.imageSearch);
    if (configured.length >= 2) return configured[0];
    if (settings.imageSearch.unsplash) return 'unsplash';
    if (settings.imageSearch.pexels) return 'pexels';
    return 'openverse';
  });

  // Profile picker (for non-targeted mode)
  const [targetProfile, setTargetProfile] = useState<string | null>(currentProfileKey);
  const [profileSearch, setProfileSearch] = useState('');
  const [profileNodePath, setProfileNodePath] = useState<string[]>([]);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [pendingAction, setPendingAction] = useState<'direct' | 'upload' | null>(null);
  const profilePickerRef = useRef<HTMLDivElement>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const leftPanelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progressive disclosure - advanced controls
  const [showAdvanced, setShowAdvanced] = useState(false);

  // IIIF (moved into advanced section)
  const [manifestUrl, setManifestUrl] = useState('');
  const [manifestLoading, setManifestLoading] = useState(false);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro-2", hypothesisId: "H7", location: "ImageScoutPanel.tsx:mount", message: "admin-package scout panel mounted", data: { embedded: !!embedded }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
  }, [embedded]);
  const [fileDragOver, setFileDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentPage = useRef(1);
  const pinterestCursor = useRef<string | undefined>(undefined);
  const loadMoreLock = useRef(false);

  // Drag-reorder state for existing images
  const dragIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [draggingExistingIdx, setDraggingExistingIdx] = useState<number | null>(null);

  // Sync query and targetProfile when queue index changes
  useEffect(() => {
    if (isQueueMode && queueProfile) {
      const newTags = tagsProp?.[queueProfile];
      const newQuery = buildScoutQuery(queueProfile, newTags);
      setQuery(newQuery);
      setTargetProfile(queueProfile);
      setResults([]);
      setHasSearched(false);
      setExhausted(false);
      setStaged([]);
      setCascadeFrom(0);
      setLeftPanelOpen(false);
      currentPage.current = 1;
      loadMoreLock.current = false;
    }
  }, [isQueueMode, queueProfile, tagsProp]);

  // Sync targetProfile to currentProfileKey in free mode (component may be reused across mode switches)
  useEffect(() => {
    if (!isQueueMode && currentProfileKey) {
      setTargetProfile(currentProfileKey);
    }
  }, [isQueueMode, currentProfileKey]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!showProfilePicker) return;
    const handler = (e: MouseEvent) => {
      if (profilePickerRef.current && !profilePickerRef.current.contains(e.target as Node)) {
        setShowProfilePicker(false);
        setPendingAction(null);
        setProfileNodePath([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfilePicker]);

  const profileHierarchy = useMemo(
    () => buildProfileHierarchy(allProfileKeys, tagsProp),
    [allProfileKeys, tagsProp],
  );
  const activeProfileHierarchyNode = useMemo(
    () => getProfileHierarchyNode(profileHierarchy, profileNodePath) ?? profileHierarchy,
    [profileHierarchy, profileNodePath],
  );
  const filteredHierarchyOptions = useMemo(() => {
    const q = profileSearch.toLowerCase().trim();
    const options = Array.from(activeProfileHierarchyNode.children.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [activeProfileHierarchyNode, profileSearch]);
  const filteredHierarchyProfiles = useMemo(() => {
    if (activeProfileHierarchyNode.children.size > 0) return [];
    const q = profileSearch.toLowerCase().trim();
    const profiles = [...activeProfileHierarchyNode.profiles].sort((a, b) => a.localeCompare(b));
    if (!q) return profiles;
    return profiles.filter((profile) => profile.toLowerCase().includes(q));
  }, [activeProfileHierarchyNode, profileSearch]);
  const pickerCanSelectNextNode =
    filteredHierarchyOptions.length > 0 && profileNodePath.length < MAX_TAG_LAYERS;
  const nextLayerNumber = Math.min(profileNodePath.length + 1, MAX_TAG_LAYERS);
  const pickerPrompt = pickerCanSelectNextNode
    ? `Select Layer ${nextLayerNumber} node`
    : "Select profile";

  const availableSources = useMemo(() => {
    return PROVIDERS.filter(p => !p.keyRequired || !!apiKeys[p.id]);
  }, [apiKeys]);

  // ── Search logic ──
  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setExhausted(false);
    setCascadeFrom(0);
    currentPage.current = 1;
    pinterestCursor.current = undefined;
    loadMoreLock.current = false;
    try {
      let batch: ImageSearchResult[];
      if (activeSource === 'pinterest') {
        const res = await searchPinterestImages(q, apiKeys, PAGE_SIZE, undefined);
        batch = res.results;
        pinterestCursor.current = res.nextCursor;
        if (!res.nextCursor || batch.length < PAGE_SIZE) setExhausted(true);
      } else {
        batch = await searchImages(q, activeSource, apiKeys, PAGE_SIZE, 1);
        const provInfo = PROVIDERS.find(p => p.id === activeSource);
        if (!provInfo?.pageable || batch.length < PAGE_SIZE) setExhausted(true);
      }
      setResults(batch);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, activeSource, apiKeys]);

  // Auto-search on mount / queue change
  const autoSearchedRef = useRef(false);
  const doSearchRef = useRef(doSearch);
  doSearchRef.current = doSearch;
  useEffect(() => {
    if ((smartQuery || (isQueueMode && queueProfile)) && !autoSearchedRef.current) {
      autoSearchedRef.current = true;
      doSearchRef.current();
    }
  }, []);

  // Auto-search when queue profile changes
  useEffect(() => {
    if (isQueueMode && queueProfile && hasSearched === false && query.trim()) {
      doSearchRef.current();
    }
  }, [isQueueMode, queueProfile, query]);

  // Auto-search when source tab changes (if already searched once and query exists)
  const prevSourceRef = useRef(activeSource);
  useEffect(() => {
    if (activeSource !== prevSourceRef.current) {
      prevSourceRef.current = activeSource;
      if (hasSearched && query.trim()) {
        doSearchRef.current();
      }
    }
  }, [activeSource, hasSearched, query]);

  // Debounced search when query changes from manual typing
  const queryChangeSourceRef = useRef<'manual' | 'auto'>('auto');
  const debouncedSearch = useDebouncedCallback(() => {
    if (query.trim() && hasSearched && queryChangeSourceRef.current === 'manual') {
      doSearchRef.current();
    }
  }, SEARCH_DEBOUNCE_MS);

  // Trigger debounced search on manual query changes
  useEffect(() => {
    if (queryChangeSourceRef.current === 'manual') {
      debouncedSearch();
    }
    queryChangeSourceRef.current = 'auto'; // Reset after each change
  }, [query, debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (exhausted || loadingMore || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      let batch: ImageSearchResult[];
      let nowExhausted = false;
      if (activeSource === 'pinterest') {
        const res = await searchPinterestImages(query.trim(), apiKeys, PAGE_SIZE, pinterestCursor.current);
        batch = res.results;
        pinterestCursor.current = res.nextCursor;
        nowExhausted = !res.nextCursor || batch.length === 0;
      } else {
        const nextPage = currentPage.current + 1;
        batch = await searchImages(query.trim(), activeSource, apiKeys, PAGE_SIZE, nextPage);
        const provInfo = PROVIDERS.find(p => p.id === activeSource);
        if (!provInfo?.pageable || batch.length < PAGE_SIZE) nowExhausted = true;
        if (batch.length > 0) currentPage.current = nextPage;
      }
      if (batch.length === 0) {
        setExhausted(true);
      } else {
        const prevLen = results.length;
        const existingUrls = new Set(results.map(r => r.imageUrl));
        const newResults = batch.filter(r => !existingUrls.has(r.imageUrl));
        if (newResults.length === 0) setExhausted(true);
        else {
          setCascadeFrom(prevLen);
          setResults(prev => [...prev, ...newResults]);
          if (nowExhausted) setExhausted(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
      loadMoreLock.current = false;
    }
  }, [exhausted, loadingMore, query, activeSource, apiKeys, results]);

  // IntersectionObserver for infinite scroll — callback ref ensures it reconnects
  // every time the sentinel DOM element mounts/unmounts
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const exhaustedRef = useRef(exhausted);
  exhaustedRef.current = exhausted;
  const sentinelObserver = useRef<IntersectionObserver | null>(null);

  const sentinelCallback = useCallback((node: HTMLDivElement | null) => {
    if (sentinelObserver.current) {
      sentinelObserver.current.disconnect();
      sentinelObserver.current = null;
    }
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !exhaustedRef.current && !loadMoreLock.current) {
          loadMoreRef.current();
        }
      },
      { root: scrollRef.current, rootMargin: '0px 0px 400px 0px', threshold: 0 },
    );
    observer.observe(node);
    sentinelObserver.current = observer;
  }, []);

  const stagedUrls = useMemo(() => new Set(staged.map(r => r.imageUrl)), [staged]);

  const toggleSelect = useCallback((idx: number) => {
    const item = results[idx];
    if (!item) return;
    setStaged(prev => {
      const exists = prev.some(r => r.imageUrl === item.imageUrl);
      if (exists) return prev.filter(r => r.imageUrl !== item.imageUrl);
      return [...prev, item];
    });
  }, [results]);

  const unstageByUrl = useCallback((url: string) => {
    setStaged(prev => prev.filter(r => r.imageUrl !== url));
  }, []);

  const handleCtxCopyImage = useCallback(async () => {
    if (!ctxMenu?.imageUrl) return;
    try {
      await copyImageFromUrl(ctxMenu.imageUrl);
      onFlash('Image copied');
    } catch (err: any) {
      onFlash('Copy image failed: ' + (err?.message || 'unsupported browser clipboard'));
    }
  }, [ctxMenu, onFlash]);

  const handleCtxReplaceUrl = useCallback(async () => {
    if (ctxMenu?.sourceIndex == null) return;
    try {
      const raw = await navigator.clipboard.readText();
      const nextUrl = (raw || '').trim();
      if (!/^https?:\/\//i.test(nextUrl)) {
        onFlash('Clipboard does not contain a valid http/https URL');
        return;
      }
      setResults(prev => prev.map((item, idx) => idx === ctxMenu.sourceIndex ? {
        ...item,
        imageUrl: nextUrl,
        thumbnailUrl: nextUrl,
      } : item));
      onFlash('Result URL replaced');
    } catch (err: any) {
      onFlash('Replace URL failed: ' + (err?.message || 'clipboard unavailable'));
    }
  }, [ctxMenu, onFlash]);

  const handleCtxUpscale = useCallback(async () => {
    if (!ctxMenu?.imageUrl || ctxMenu.sourceIndex == null) return;
    if (!cloudinaryReady || !cloudinaryConfig.cloudName) {
      onFlash('Configure Cloudinary in settings first');
      return;
    }
    onFlash('Upscaling...');
    try {
      const secureUrl = await requestCloudinaryUpscale({
        imageUrl: ctxMenu.imageUrl,
        cloudName: cloudinaryConfig.cloudName,
        scale: '2x',
      });
      setUpscaleReview({
        beforeUrl: ctxMenu.imageUrl,
        afterUrl: secureUrl,
        resultIndex: ctxMenu.sourceIndex,
      });
    } catch (err: any) {
      onFlash('Upscale failed: ' + (err?.message || 'unknown error'));
    }
  }, [cloudinaryReady, cloudinaryConfig.cloudName, ctxMenu, onFlash]);

  const selectedUrls = () => staged.map(r => r.imageUrl);
  const selectedMedia = (): AtlasMedia[] => staged.map(resultToMedia);

  const patchUploadTask = useCallback((taskId: string, patch: Partial<ScoutUploadTask>) => {
    setUploadQueue((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }, []);

  const runScoutUploadTask = useCallback(async (task: ScoutUploadTask) => {
    patchUploadTask(task.id, { status: 'uploading', error: undefined });
    try {
      const cloudUrl = await uploadToCloudinary(task.sourceFile, cloudinaryConfig, { folder: 'atlas' });
      if (stagedUrls.has(cloudUrl)) {
        patchUploadTask(task.id, { status: 'skipped', error: 'Duplicate image' });
        return null;
      }
      patchUploadTask(task.id, { status: 'done', resultUrl: cloudUrl });
      return cloudUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      patchUploadTask(task.id, { status: 'failed', error: message });
      return null;
    }
  }, [cloudinaryConfig, patchUploadTask, stagedUrls]);

  const handleUploadDroppedFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    if (!cloudinaryReady) {
      onFlash('Configure Cloudinary in settings first');
      return;
    }

    const tasks: ScoutUploadTask[] = files.map((file) => ({
      id: createScoutUploadTaskId(),
      label: file.name || 'Dropped image file',
      sourceFile: file,
      status: 'queued',
      targetKey: targetProfile ?? currentProfileKey ?? undefined,
    }));
    setUploadQueue((prev) => [...tasks, ...prev]);

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    const uploadedResults: ImageSearchResult[] = [];
    let failedCount = 0;

    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      const cloudUrl = await runScoutUploadTask(task);
      if (cloudUrl) {
        uploadedResults.push({
          title: task.sourceFile.name,
          sourceUrl: cloudUrl,
          thumbnailUrl: cloudUrl,
          imageUrl: cloudUrl,
          provider: 'openverse',
          source: 'upload',
          attribution: 'Local upload',
        });
      } else {
        failedCount += 1;
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    if (uploadedResults.length > 0) {
      setStaged(prev => {
        const existing = new Set(prev.map(item => item.imageUrl));
        const next = [...prev];
        for (const item of uploadedResults) {
          if (!existing.has(item.imageUrl)) {
            next.push(item);
            existing.add(item.imageUrl);
          }
        }
        return next;
      });
    }

    if (uploadedResults.length > 0 && failedCount === 0) {
      onFlash(`Uploaded ${uploadedResults.length} file${uploadedResults.length > 1 ? 's' : ''} and staged`);
    } else if (uploadedResults.length > 0) {
      onFlash(`Uploaded ${uploadedResults.length}/${files.length} (${failedCount} failed)`);
    } else {
      onFlash('File upload failed');
    }

    setUploading(false);
    setUploadProgress({ done: 0, total: 0 });
  }, [cloudinaryReady, currentProfileKey, onFlash, runScoutUploadTask, targetProfile]);

  const retryUploadTask = useCallback(async (taskId: string) => {
    const task = uploadQueue.find((entry) => entry.id === taskId);
    if (!task || task.status !== 'failed') return;
    const cloudUrl = await runScoutUploadTask(task);
    if (!cloudUrl) return;
    setStaged((prev) => {
      if (prev.some((item) => item.imageUrl === cloudUrl)) return prev;
      return [
        ...prev,
        {
          title: task.sourceFile.name,
          sourceUrl: cloudUrl,
          thumbnailUrl: cloudUrl,
          imageUrl: cloudUrl,
          provider: 'openverse',
          source: 'upload',
          attribution: 'Local upload',
        },
      ];
    });
  }, [runScoutUploadTask, uploadQueue]);

  const dismissUploadTask = useCallback((taskId: string) => {
    setUploadQueue((prev) => prev.filter((task) => task.id !== taskId));
  }, []);

  const clearFinishedUploadTasks = useCallback(() => {
    setUploadQueue((prev) => prev.filter((task) => task.status === 'queued' || task.status === 'uploading'));
  }, []);

  const handleStageDroppedUrls = useCallback((urls: string[]) => {
    if (urls.length === 0) return;

    const entries: ImageSearchResult[] = urls.map((url) => {
      const fileName = (() => {
        try {
          const pathname = new URL(url).pathname;
          const last = pathname.split('/').pop();
          return last && last.length > 0 ? decodeURIComponent(last) : "Dropped image";
        } catch {
          return "Dropped image";
        }
      })();
      return {
        title: fileName,
        sourceUrl: url,
        thumbnailUrl: url,
        imageUrl: url,
        provider: 'openverse',
        source: 'drop',
        attribution: 'Dropped URL',
      };
    });

    setStaged((prev) => {
      const existing = new Set(prev.map((item) => item.imageUrl));
      const next = [...prev];
      for (const item of entries) {
        if (!existing.has(item.imageUrl)) {
          next.push(item);
          existing.add(item.imageUrl);
        }
      }
      return next;
    });
    onFlash(`Staged ${entries.length} dropped image URL${entries.length > 1 ? "s" : ""}`);
  }, [onFlash]);

  // ── Add actions ──
  const doAddDirect = useCallback(async (profile: string) => {
    const urls = selectedUrls();
    const media = selectedMedia();
    if (!urls.length) return;
    await onAddImages(profile, urls, media);
    onFlash(`Added ${urls.length} image${urls.length > 1 ? 's' : ''} to ${profile}`);
    if (isQueueMode) {
      setCompleted(prev => new Set(prev).add(profile));
      setTotalAdded(prev => prev + urls.length);
      justAddedRef.current = true;
      setStaged([]);
      advanceTimerRef.current = setTimeout(() => {
        justAddedRef.current = false;
        queueAdvance();
      }, ADVANCE_DELAY_MS);
    } else {
      onClose();
    }
  }, [onAddImages, onFlash, onClose, isQueueMode, queueAdvance]);

  const addImagesToProfileWithDurability = useCallback(
    async (profile: string, urls: string[], media?: AtlasMedia[]) => {
      if (urls.length === 0) return { added: 0, failed: 0, usedHotlink: false };
      if (!cloudinaryReady) {
        await onAddImages(profile, urls, media);
        return { added: urls.length, failed: 0, usedHotlink: true };
      }
      setUploading(true);
      setUploadProgress({ done: 0, total: urls.length });
      const { uploaded, uploadedMedia, failed } = await uploadRemoteImageUrlsToAtlasFolder(
        urls,
        media,
        cloudinaryConfig,
        (done, total) => setUploadProgress({ done, total }),
      );
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
      if (uploaded.length > 0) {
        await onAddImages(
          profile,
          uploaded,
          uploadedMedia.length > 0 ? uploadedMedia : undefined,
        );
      }
      return { added: uploaded.length, failed: failed.length, usedHotlink: false };
    },
    [cloudinaryReady, cloudinaryConfig, onAddImages],
  );

  const doUploadAndAdd = useCallback(async (profile: string) => {
    if (!cloudinaryReady) {
      onFlash("Configure Cloudinary in settings first");
      return;
    }
    const urls = selectedUrls();
    const media = selectedMedia();
    if (!urls.length) return;
    const { added, failed } = await addImagesToProfileWithDurability(profile, urls, media);
    const msg =
      failed > 0
        ? `Uploaded ${added}/${urls.length} (${failed} failed)`
        : `Uploaded & added ${added} image${added > 1 ? "s" : ""} to ${profile}`;
    onFlash(msg);
    if (added > 0) {
      if (isQueueMode) {
        setCompleted((prev) => new Set(prev).add(profile));
        setTotalAdded((prev) => prev + added);
        justAddedRef.current = true;
        setStaged([]);
        advanceTimerRef.current = setTimeout(() => {
          justAddedRef.current = false;
          queueAdvance();
        }, ADVANCE_DELAY_MS);
      } else {
        onClose();
      }
    }
  }, [
    addImagesToProfileWithDurability,
    cloudinaryReady,
    onFlash,
    onClose,
    isQueueMode,
    queueAdvance,
  ]);

  const confirmProfile = useCallback(
    async (profile: string) => {
      setTargetProfile(profile);
      setShowProfilePicker(false);
      setProfileSearch("");
      setProfileNodePath([]);
      const action = pendingAction;
      setPendingAction(null);
      if (action === "direct") await doAddDirect(profile);
      else if (action === "upload") await doUploadAndAdd(profile);
    },
    [pendingAction, doAddDirect, doUploadAndAdd],
  );

  const handleAdd = (action: 'direct' | 'upload') => {
    if (staged.length === 0) return;
    if (targetProfile) {
      if (action === 'direct') doAddDirect(targetProfile);
      else doUploadAndAdd(targetProfile);
    } else {
      setPendingAction(action);
      setShowProfilePicker(true);
      setProfileNodePath([]);
      setProfileSearch('');
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); doSearch(); }
    if (e.key === 'Escape') handleClose();
  };

  const handleClose = () => {
    if (isQueueMode) {
      if (justAddedRef.current) { justAddedRef.current = false; return; }
      onQueueClose?.();
    }
    onClose();
  };

  const onModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showProfilePicker) { setShowProfilePicker(false); setPendingAction(null); }
      else if (leftPanelOpen) setLeftPanelOpen(false);
      else if (lightboxIdx !== null) setLightboxIdx(null);
      else handleClose();
    }
  };

  const handleFetchManifest = useCallback(async () => {
    const url = manifestUrl.trim();
    if (!url) return;
    setManifestLoading(true);
    setError(null);
    setExhausted(true);
    setCascadeFrom(0);
    try {
      const data = await fetchIIIFManifest(url);
      const manifest = data as { results?: Array<Record<string, unknown>>; label?: string };
      const mapped: ImageSearchResult[] = (manifest.results || []).map((r) => ({
        title: (r.title as string) || manifest.label || '',
        sourceUrl: url,
        thumbnailUrl: (r.thumbnailUrl as string) || (r.imageUrl as string) || '',
        imageUrl: (r.imageUrl as string) || (r.thumbnailUrl as string) || '',
        width: r.width as number | undefined,
        height: r.height as number | undefined,
        source: (r.attribution as string) || 'IIIF',
        provider: 'europeana' as ImageSource,
        rights: r.rights as string | undefined,
        attribution: r.attribution as string | undefined,
        sourceManifest: r.sourceManifest as string | undefined,
        tileSource: r.tileSource as string | undefined,
      }));
      setResults(mapped);
      setHasSearched(true);
      if (mapped.length === 0) onFlash('Manifest parsed but no images found');
      else onFlash(`Found ${mapped.length} image${mapped.length > 1 ? 's' : ''} in manifest`);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setManifestLoading(false);
    }
  }, [manifestUrl, onFlash]);

  const selCount = staged.length;

  // ── Profile metadata ──
  const profileImgCount = currentProfileKey ? countImages(imagesProp?.[currentProfileKey]) : 0;
  const profileImgUrls = currentProfileKey ? toUrlArray(imagesProp?.[currentProfileKey]) : [];
  const profileTagList = currentProfileKey ? tagsProp?.[currentProfileKey] : undefined;
  const profileEra = currentProfileKey ? eraProp?.[currentProfileKey] : undefined;
  const profileOrigin = currentProfileKey ? originsProp?.[currentProfileKey] : undefined;
  const profileScientific = currentProfileKey ? scientificProp?.[currentProfileKey] : undefined;
  const categoryBadge = getCategoryBadge(profileTagList);
  const displayName = (key: string) => key.replace(/-/g, ' ');

  // ── Queue done screen ──
  if (queueDone) {
    return (
      <div className={embedded ? "bg-black flex items-center justify-center" : "fixed inset-0 z-[96] bg-black flex items-center justify-center"} style={embedded ? { height: '100%' } : { zIndex: 96 }} onKeyDown={e => { if (e.key === 'Escape') { onQueueClose?.(); onClose(); } }}>
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-10 max-w-md w-full mx-4 text-center animate-fade-in">
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-semibold text-white mb-2">Rapid Scout Complete</h2>
          <p className="text-neutral-400 mb-6">
            Reviewed {filteredQueue.length} profile{filteredQueue.length !== 1 ? 's' : ''}
          </p>
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{completed.size}</div>
              <div className="text-neutral-500">filled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-400">{skipped.size}</div>
              <div className="text-neutral-500">skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{totalAdded}</div>
              <div className="text-neutral-500">images added</div>
            </div>
          </div>
          <button onClick={() => { onQueueClose?.(); onClose(); }} className="px-6 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div
      className={embedded ? "bg-black flex flex-col" : "fixed inset-0 z-[96] bg-black flex flex-col"}
      style={embedded ? { height: '100%' } : { zIndex: 96 }}
      onKeyDown={onModalKeyDown}
    >
      {/* ── Visual Queue Bar (Rapid Scout mode) ── */}
      {isQueueMode && (
        <div className="shrink-0 bg-neutral-950 border-b border-neutral-800">
          {/* Progress bar */}
          <div className="h-0.5 bg-neutral-800">
            <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${progressFraction * 100}%` }} />
          </div>

          {/* Controls row: exit, counter, filter pills, prev/skip */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <button onClick={() => { onQueueClose?.(); onClose(); }} className="p-1 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-neutral-800" title="Exit Rapid Scout">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <span className="text-[11px] text-neutral-500 tabular-nums whitespace-nowrap">{queueIndex + 1}/{filteredQueue.length}</span>
            <div className="w-px h-4 bg-neutral-800" />

            {/* Category filter pills */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setQueueCatFilter(null)}
                className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full transition-all ${
                  !queueCatFilter ? 'bg-white/15 text-white' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
              >All ({fullQueue.length})</button>
              {Object.entries(queueCategoryCounts).sort(([,a],[,b]) => b - a).map(([cat, count]) => {
                const badge = getCategoryBadge([cat]) ?? { label: cat, color: '#888' };
                return (
                  <button
                    key={cat}
                    onClick={() => setQueueCatFilter(prev => prev === cat ? null : cat)}
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full transition-all ${
                      queueCatFilter === cat ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    style={queueCatFilter === cat ? { background: `${badge.color}30`, color: badge.color } : undefined}
                  >{badge.label} ({count})</button>
                );
              })}
            </div>

            <div className="flex-1" />
            <button onClick={queueGoBack} disabled={queueIndex === 0} className="px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-neutral-400 hover:text-white hover:bg-neutral-800">Prev</button>
            <button onClick={queueSkip} className="px-2.5 py-0.5 text-[11px] font-medium rounded-lg transition-colors text-blue-400 hover:bg-blue-500/10">Skip</button>
          </div>

          {/* Visual thumbnail strip */}
          <div
            ref={queueStripRef}
            className="flex items-end gap-1 px-3 pb-2 overflow-x-auto scout-results-scroll"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}
          >
            {filteredQueue.map((key, idx) => {
              const status = queueItemStatus(key);
              const isActive = status === 'active';
              const thumb = toUrlArray(imagesProp?.[key])?.[0];
              const imgCount = countImages(imagesProp?.[key]);
              const badge = getCategoryBadge(tagsProp?.[key]) ?? { label: '?', color: '#555' };
              return (
                <button
                  key={key}
                  data-queue-active={isActive ? 'true' : undefined}
                  onClick={() => setQueueIndex(idx)}
                  title={displayName(key)}
                  className="shrink-0 flex flex-col items-center gap-0.5 transition-all group"
                  style={{ opacity: status === 'skipped' ? 0.35 : status === 'done' ? 0.6 : 1, width: isActive ? 72 : 56 }}
                >
                  <div
                    className="w-full rounded-md overflow-hidden relative transition-all"
                    style={{
                      aspectRatio: '4/3',
                      border: isActive ? '2px solid #3b82f6' : status === 'done' ? '2px solid #22c55e' : '1px solid #333',
                      boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.3)' : 'none',
                    }}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={key}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-600 text-[10px]">?</div>
                    )}
                    {status === 'done' && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    <span
                      className="absolute top-0.5 right-0.5 text-[8px] font-bold tabular-nums rounded px-0.5 leading-tight"
                      style={{
                        background: imgCount === 0 ? '#ef4444' : imgCount < TARGET_COUNT ? '#3b82f6' : '#22c55e',
                        color: '#000',
                      }}
                    >{imgCount}</span>
                    <span
                      className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 rounded-full"
                      style={{ background: badge.color }}
                    />
                  </div>
                  <span
                    className="text-[8px] leading-tight truncate w-full text-center capitalize"
                    style={{ color: isActive ? '#fff' : '#777' }}
                  >{displayName(key)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main content: full-width search + results ── */}
      <div className="flex-1 min-h-0 flex relative">
        {/* ── Left panel overlay: glass panel on hover ── */}
        {currentProfileKey && leftPanelOpen && (
          <div
            className="scout-glass-panel scout-results-scroll"
            onMouseEnter={() => {
              if (leftPanelTimer.current) {
                clearTimeout(leftPanelTimer.current);
                leftPanelTimer.current = null;
              }
            }}
            onMouseLeave={() => {
              leftPanelTimer.current = setTimeout(() => setLeftPanelOpen(false), 300);
            }}
          >
            {/* Profile identity */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-sm font-semibold text-white capitalize truncate">{displayName(currentProfileKey)}</h2>
                {categoryBadge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${categoryBadge.color}20`, color: categoryBadge.color }}>
                    {categoryBadge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
                <span className={`tabular-nums ${profileImgCount < TARGET_COUNT ? 'text-blue-400' : 'text-green-400'}`}>
                  {profileImgCount} image{profileImgCount !== 1 ? 's' : ''}
                </span>
                {profileEra && <><span className="text-neutral-600">·</span><span className="italic">{profileEra}</span></>}
                {profileOrigin && <><span className="text-neutral-600">·</span><span>{profileOrigin}</span></>}
              </div>
              {profileScientific && (
                <div className="text-[10px] text-neutral-500 italic mb-2">{profileScientific}</div>
              )}
              {profileTagList && profileTagList.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profileTagList.map(t => (
                    <span key={t} className="inline-flex items-center gap-0.5 rounded-md bg-white/5 text-neutral-400 font-mono" style={{ padding: '1px 5px', fontSize: 9 }}>
                      {t.split('/').map((seg, si, a) => (
                        <React.Fragment key={si}>
                          {si > 0 && <span className="text-neutral-600 mx-0.5">›</span>}
                          <span className={si === a.length - 1 ? 'text-neutral-300' : ''}>{seg}</span>
                        </React.Fragment>
                      ))}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Existing images gallery */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 scout-results-scroll">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
                Current Images ({profileImgCount})
              </div>
              {profileImgUrls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-neutral-600 text-xs gap-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                  <span>No images yet</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {profileImgUrls.map((url, idx) => (
                    <div
                      key={`${idx}-${url}`}
                      draggable={!!onReorderImages}
                      onDragStart={e => {
                        dragIdx.current = idx;
                        setDraggingExistingIdx(idx);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        dragIdx.current = null;
                        setDragOverIdx(null);
                        setDraggingExistingIdx(null);
                      }}
                      onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={e => {
                        e.preventDefault();
                        setDragOverIdx(null);
                        setDraggingExistingIdx(null);
                        if (dragIdx.current !== null && dragIdx.current !== idx && onReorderImages && currentProfileKey) {
                          onReorderImages(currentProfileKey, dragIdx.current, idx);
                        }
                        dragIdx.current = null;
                      }}
                      className={`group relative flex items-center gap-2 p-1.5 rounded-lg transition-all ${
                        dragOverIdx === idx ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'hover:bg-white/5'
                      } ${draggingExistingIdx === idx ? 'opacity-40' : ''} ${onReorderImages ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <div className="shrink-0 w-16 h-12 rounded-md overflow-hidden bg-neutral-900">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-blue-400 tabular-nums w-4">{idx + 1}</span>
                          <span className="text-[10px] text-neutral-500">{PLATE_LABELS[idx] ?? `#${idx + 1}`}</span>
                        </div>
                        <div className="text-[9px] text-neutral-700 truncate mt-0.5 font-mono">{url.split('/').pop()}</div>
                      </div>
                      {onRemoveImage && (
                        <button
                          onClick={e => { e.stopPropagation(); onRemoveImage(currentProfileKey!, idx); }}
                          className="shrink-0 p-1 rounded text-neutral-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staging area (collected across searches) */}
            {selCount > 0 && (
              <div className="shrink-0 border-t border-white/[0.06] px-3 py-3">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">
                  Selected ({selCount})
                </div>
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {staged.map((item, i) => (
                    <button
                      key={item.imageUrl}
                      className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 hover:border-blue-400/40 transition-colors group/thumb"
                      title={item.title}
                      onClick={() => {
                        const ridx = results.findIndex(r => r.imageUrl === item.imageUrl);
                        if (ridx >= 0) setLightboxIdx(ridx);
                      }}
                    >
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[7px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span
                        className="absolute top-0 left-0 w-full h-full bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center"
                        onClick={e => { e.stopPropagation(); unstageByUrl(item.imageUrl); }}
                      >
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStaged([])}
                    className="flex-1 py-1.5 text-[10px] font-medium text-neutral-500 hover:text-white border border-white/10 hover:border-neutral-500 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                  {cloudinaryReady ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAdd("upload")}
                        disabled={uploading}
                        className="flex-[1.35] py-1.5 text-[10px] font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-40"
                        title="Copy images into your Cloudinary folder (recommended)"
                      >
                        {uploading ? `${uploadProgress.done}/${uploadProgress.total}` : "Upload to CDN"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdd("direct")}
                        disabled={uploading}
                        className="flex-1 py-1.5 text-[10px] font-medium text-amber-200/90 bg-white/[0.06] hover:bg-white/[0.1] border border-amber-500/25 rounded-lg transition-colors disabled:opacity-40"
                        title={HOTLINK_ONLY_TITLE}
                      >
                        Hotlink only
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdd("direct")}
                      disabled={uploading}
                      className="flex-1 py-1.5 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40"
                      title={HOTLINK_ONLY_TITLE}
                    >
                      Add (hotlink)
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Full-width search + results grid ── */}
        <div className="flex-1 min-w-0 flex flex-col bg-black">
          {/* Search header */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-neutral-800/60 bg-neutral-950/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="scout-icon-badge" style={{ width: 24, height: 24, borderRadius: 6 }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <h2 className="text-xs font-semibold text-white tracking-tight">
                {isQueueMode ? 'Rapid Scout' : 'Image Scout'}
              </h2>
              {currentProfileKey && (
                <button
                  className="scout-profile-trigger"
                  onClick={() => setLeftPanelOpen(p => !p)}
                  title="Toggle profile details"
                >
                  {profileImgUrls[0] && (
                    <img src={profileImgUrls[0]} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                  )}
                  <span className="truncate capitalize">{displayName(currentProfileKey)}</span>
                  <span className={`tabular-nums ${profileImgCount < TARGET_COUNT ? 'text-blue-400' : 'text-green-400/70'}`}>{profileImgCount}</span>
                  <svg className={`w-2.5 h-2.5 text-neutral-600 shrink-0 transition-transform ${leftPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
              {!currentProfileKey && targetProfile && (
                <button onClick={() => setTargetProfile(null)} className="px-2 py-0.5 rounded-md bg-blue-500/15 text-[10px] text-blue-400 font-mono hover:bg-blue-500/25 transition-colors flex items-center gap-1">
                  {targetProfile}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {/* Close button (non-queue mode) */}
              {!isQueueMode && (
                <button onClick={handleClose} className="ml-auto p-1 text-neutral-500 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>

            {/* Source pills */}
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {PROVIDERS.map(p => {
                const isAvail = !p.keyRequired || !!apiKeys[p.id];
                const isActive = activeSource === p.id;
                return (
                  <button key={p.id} onClick={() => isAvail && setActiveSource(p.id)} disabled={!isAvail} className="transition-all duration-150"
                    style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: isActive ? 600 : 400,
                      border: isActive ? `1px solid ${p.color}40` : '1px solid rgba(255,255,255,0.08)',
                      background: isActive ? `${p.color}15` : 'transparent',
                      color: isActive ? p.color : isAvail ? '#888' : '#444',
                      cursor: isAvail ? 'pointer' : 'not-allowed', opacity: isAvail ? 1 : 0.4 }}
                    title={isAvail ? `Search ${p.label}` : `Add ${p.label} key in settings`}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isActive ? `${p.color}25` : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${isActive ? `${p.color}60` : 'rgba(255,255,255,0.15)'}`,
                        }}
                      >
                        <SourceIcon source={p.id} active={isActive} />
                      </span>
                      <span>{p.label}</span>
                    </span>
                    {!p.keyRequired && <span style={{ fontSize: 7, marginLeft: 2, opacity: 0.6 }}>free</span>}
                  </button>
                );
              })}
              <button onClick={() => { handleClose(); goToSettings?.(); }}
                className="ml-0.5 p-1 rounded text-neutral-600 hover:text-white hover:bg-white/5 transition-colors" title="Configure API keys">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Search input row with progressive disclosure toggle */}
            <div className="flex gap-2">
              <input ref={inputRef} value={query} onChange={e => { queryChangeSourceRef.current = 'manual'; setQuery(e.target.value); }} onKeyDown={onInputKeyDown}
                placeholder="Search for images…" className="flex-1 input-base text-sm" style={{ padding: '6px 12px' }} />
              <button onClick={doSearch} disabled={loading || !query.trim()} className="btn-primary text-xs px-3 disabled:opacity-40">
                {loading ? 'Searching…' : 'Search'}
              </button>
              {/* Advanced toggle icon - replaces IIIF toggle */}
              <button onClick={() => setShowAdvanced(v => !v)} className={`p-1.5 rounded-lg border transition-colors ${showAdvanced ? 'border-blue-500/40 bg-blue-500/10 text-blue-400' : 'border-neutral-800 text-neutral-600 hover:text-neutral-400 hover:border-neutral-700'}`} title="Advanced tools (IIIF, profile details)">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>
            </div>

            <div
              data-testid="scout-file-dropzone"
              onDragOver={e => {
                e.preventDefault();
                setFileDragOver(true);
              }}
              onDragLeave={() => setFileDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setFileDragOver(false);
                const droppedUrls = getDroppedImageUrls(e.dataTransfer);
                if (droppedUrls.length > 0) {
                  handleStageDroppedUrls(droppedUrls);
                  return;
                }
                const files = Array.from(e.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
                if (files.length > 0) {
                  void handleUploadDroppedFiles(files);
                  return;
                }
              }}
              className={`mt-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                fileDragOver ? 'border-blue-500/50 bg-blue-500/10' : 'border-neutral-800 bg-neutral-900/50'
              }`}
            >
              <div className="text-[10px] text-neutral-400">
                Drop files or image URLs
              </div>
            </div>

            {/* Advanced tools panel (collapsed by default) */}
            {showAdvanced && (
              <div className="mt-3 p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 animate-fade-in">
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold mb-2">Advanced Tools</div>
                {/* IIIF Manifest fetcher */}
                <div className="flex gap-2 mb-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-neutral-800/50 text-neutral-400 shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <span className="text-[10px] font-medium">IIIF</span>
                  </div>
                  <input value={manifestUrl} onChange={e => setManifestUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchManifest(); } }}
                    placeholder="Paste manifest URL…" className="flex-1 input-base text-xs text-neutral-400 placeholder-neutral-600" style={{ fontFamily: 'monospace', padding: '5px 10px' }} />
                  <button onClick={handleFetchManifest} disabled={manifestLoading || !manifestUrl.trim()}
                    className="px-3 py-1 text-[10px] font-medium border rounded-lg transition-colors disabled:opacity-40"
                    style={{ borderColor: '#0a72cc40', color: '#0a72cc', background: manifestLoading ? '#0a72cc15' : 'transparent' }}>
                    {manifestLoading ? 'Fetching…' : 'Fetch'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status bar: Zoom + compact state cues */}
          {hasSearched && (
            <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-b border-neutral-800/40 bg-neutral-950/60">
              {/* Zoom controls */}
              <div className="flex items-center gap-2">
                <svg className="w-3 h-3 text-neutral-600 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9m11.25-5.25v4.5m0-4.5h-4.5m4.5 0L15 9m-11.25 11.25v-4.5m0 4.5h4.5m-4.5 0L9 15m11.25 5.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                </svg>
                <input type="range" min={0} max={SCOUT_ZOOM_STEPS.length - 1} step={1} value={scoutZoom}
                  onChange={e => setScoutZoom(Number(e.target.value))}
                  className="scout-zoom-slider" style={{ width: 100 }} />
                <span className="text-[9px] text-neutral-600 font-medium tabular-nums w-5">{SCOUT_ZOOM_LABELS[scoutZoom]}</span>
              </div>

              {/* Status separator */}
              <div className="w-px h-3 bg-neutral-800" />

              {/* Compact state cues */}
              <div className="flex items-center gap-2 text-[10px]">
                {loading && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching
                  </span>
                )}
                {!loading && results.length > 0 && (
                  <span className="text-neutral-500 tabular-nums">{results.length} result{results.length !== 1 ? 's' : ''}{!exhausted && '+'}</span>
                )}
                {!loading && hasSearched && results.length === 0 && !error && (
                  <span className="text-neutral-600">No results</span>
                )}
                {selCount > 0 && (
                  <>
                    <span className="text-neutral-700">·</span>
                    <span className="text-blue-400 tabular-nums">{selCount} selected</span>
                    <span className="text-neutral-700">·</span>
                    <span className="text-green-400/80 text-[9px]">Ready to add</span>
                  </>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Power-user tip (only when empty state) */}
              {!hasSearched && !loading && availableSources.length > 0 && (
                <span className="text-[9px] text-neutral-700 italic">Tip: Start broad, narrow by provider</span>
              )}
            </div>
          )}

          {/* Scrollable results grid */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 scout-results-scroll">
            {error && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-20 text-neutral-500 text-sm">
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching {PROVIDERS.find(p => p.id === activeSource)?.label}…
              </div>
            )}

            {!loading && !hasSearched && (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-600 text-sm gap-2">
                <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" strokeWidth={1.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                <span>Search for images to scout</span>
                <span className="text-[10px] text-neutral-700">
                  {availableSources.length === 0
                    ? 'Configure at least one API key to get started'
                    : `${availableSources.length} source${availableSources.length > 1 ? 's' : ''} configured — type a query and press Enter`}
                </span>
                {availableSources.length === 0 && (
                  <button onClick={() => { handleClose(); goToSettings?.(); }} className="mt-2 px-4 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors">
                    Configure in Settings →
                  </button>
                )}
              </div>
            )}

            {!loading && hasSearched && results.length === 0 && !error && (
              <div className="text-center py-20 text-neutral-600 text-sm">No images found. Try a different query.</div>
            )}

            {!loading && results.length > 0 && (
              <>
                <div className="scout-grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${SCOUT_ZOOM_STEPS[scoutZoom]}px, 1fr))` }}>
                  {results.map((r, idx) => {
                    const isStaged = stagedUrls.has(r.imageUrl);
                    const stageOrder = isStaged ? staged.findIndex(s => s.imageUrl === r.imageUrl) + 1 : 0;
                    const shouldCascade = idx >= cascadeFrom && cascadeFrom > 0;
                    return (
                      <div
                        key={`${idx}-${r.imageUrl}`}
                        className="scout-card-v2 group"
                        style={shouldCascade ? { animation: `scout-cascade 0.4s ease-out ${(idx - cascadeFrom) * 0.04}s both` } : undefined}
                      >
                        {/* Image frame */}
                        <div className={`scout-card-v2-frame ${isStaged ? 'scout-card-v2-selected' : ''}`}
                          onContextMenu={e => {
                            e.preventDefault();
                            setCtxMenu({
                              x: e.clientX,
                              y: e.clientY,
                              imageUrl: r.imageUrl,
                              thumbnailUrl: r.thumbnailUrl,
                              sourceIndex: idx,
                              sourceCount: results.length,
                            });
                          }}>
                          <img src={r.thumbnailUrl} alt={r.title} loading="lazy" className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          {isStaged && <span className="scout-badge">{stageOrder}</span>}
                          {rightsLabel(r.rights) && (
                            <span className="absolute bottom-1.5 left-1.5 px-1 py-0.5 rounded text-[7px] font-medium z-[5] pointer-events-none"
                              style={{ background: 'rgba(0,0,0,0.75)', color: '#8bd' }} title={r.rights}>
                              {rightsLabel(r.rights)}
                            </span>
                          )}
                          {/* Left zone: fullscreen */}
                          <button className="scout-zone scout-zone-left" title="View full size"
                            onClick={() => setLightboxIdx(idx)}>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          {/* Right zone: select/stage */}
                          <button className="scout-zone scout-zone-right" title={isStaged ? 'Deselect' : 'Select'}
                            disabled={uploading} onClick={() => toggleSelect(idx)}>
                            {isStaged ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {/* Caption & metadata below frame */}
                        <div className="scout-card-v2-meta">
                          <span className="scout-card-v2-title">{r.title}</span>
                          <div className="scout-card-v2-sub">
                            {r.attribution && <span className="text-blue-400/50 truncate">{r.attribution}</span>}
                            {!r.attribution && r.source && <a href={r.source} target="_blank" rel="noopener noreferrer" className="text-neutral-600 hover:text-neutral-400 truncate transition-colors" onClick={e => e.stopPropagation()}>{(() => { try { return new URL(r.source!).hostname.replace('www.', ''); } catch { return r.source; } })()}</a>}
                            {r.width && r.height && <span className="text-neutral-700 font-mono shrink-0">{r.width}&times;{r.height}</span>}
                            <span className="shrink-0" style={{ color: SOURCE_COLORS[r.provider] || '#888', fontSize: 8, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              {SOURCE_ABBREV[r.provider] || r.provider?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!exhausted && (
                  <div ref={sentinelCallback} className="flex justify-center py-6">
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-neutral-500 text-xs">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading…
                      </div>
                    ) : (
                      <button onClick={loadMore} className="scout-load-more-btn">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        Load More
                      </button>
                    )}
                  </div>
                )}

                {exhausted && (
                  <div className="text-center py-6 text-neutral-700 text-[10px]">All results loaded</div>
                )}
              </>
            )}
          </div>

          {/* Unified Action Rail - single bottom bar for all selection states */}
          {selCount > 0 && (
            <div className="scout-action-bar shrink-0 relative" style={{ borderRadius: 0 }}>
              {/* Left: Selected thumbnails and count */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs text-white font-medium whitespace-nowrap tabular-nums">{selCount} selected</span>
                <div className="flex gap-1.5 overflow-x-auto scout-thumb-strip">
                  {staged.map((item, i) => (
                    <button key={item.imageUrl} className="scout-thumb-mini" title={`#${i + 1}: ${item.title}`} onClick={() => {
                      const ridx = results.findIndex(r => r.imageUrl === item.imageUrl);
                      if (ridx >= 0) setLightboxIdx(ridx);
                    }}>
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover rounded" />
                      <span className="scout-thumb-badge">{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Center: Profile target indicator (when needed) */}
              <div className="flex items-center gap-2 shrink-0">
                {!currentProfileKey && (
                  targetProfile ? (
                    <button onClick={() => {
                      setTargetProfile(null);
                      setProfileNodePath([]);
                      setProfileSearch('');
                    }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 text-xs text-blue-400 font-mono hover:bg-blue-500/25 transition-colors">
                      → {targetProfile}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-500">Select profile →</span>
                  )
                )}
              </div>

              {/* Right: Standardized action buttons */}
              <div className="flex gap-2 shrink-0 items-center">
                <button onClick={() => setStaged([])} disabled={uploading}
                  className="px-2 py-1 text-[10px] font-medium text-neutral-500 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg transition-colors disabled:opacity-40">
                  Clear
                </button>
                {cloudinaryReady ? (
                  <>
                    <button type="button" onClick={() => handleAdd("upload")} disabled={uploading}
                      className="px-3 py-1 text-[10px] font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-40"
                      title="Copy images into your Cloudinary folder (recommended)">
                      {uploading ? `${uploadProgress.done}/${uploadProgress.total}` : "Upload to CDN"}
                    </button>
                    <button type="button" onClick={() => handleAdd("direct")} disabled={uploading}
                      className="px-2.5 py-1 text-[10px] font-medium text-amber-200/90 bg-white/[0.06] border border-amber-500/25 hover:bg-white/[0.1] rounded-lg transition-colors disabled:opacity-40"
                      title={HOTLINK_ONLY_TITLE}>
                      Hotlink only
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => handleAdd("direct")} disabled={uploading}
                    className="px-3 py-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-40"
                    title={HOTLINK_ONLY_TITLE}>
                    Add (hotlink)
                  </button>
                )}
              </div>

              {/* Profile picker dropdown (absolute positioned) */}
              {showProfilePicker && !currentProfileKey && (
                <div ref={profilePickerRef} className="absolute bottom-full right-0 mb-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col animate-fade-in" style={{ maxHeight: 320, zIndex: 10 }}>
                  <div className="shrink-0 p-2 border-b border-neutral-800">
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      {Array.from({ length: MAX_TAG_LAYERS }, (_, index) => {
                        const selected = profileNodePath[index];
                        return (
                          <button
                            key={`layer-${index + 1}`}
                            type="button"
                            onClick={() => {
                              if (profileNodePath.length > index) {
                                setProfileNodePath(profileNodePath.slice(0, index));
                                setProfileSearch('');
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded border text-[9px] transition-colors ${
                              selected
                                ? "border-blue-400/30 bg-blue-500/10 text-blue-300"
                                : "border-neutral-700 text-neutral-500"
                            }`}
                            title={`Layer ${index + 1}`}
                          >
                            {selected ? `L${index + 1}: ${selected}` : `L${index + 1}`}
                          </button>
                        );
                      })}
                      <span className="ml-auto text-[9px] text-neutral-600">Profile</span>
                    </div>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
                      <div className="min-w-0 flex flex-col">
                        <span className="text-neutral-400">{pickerPrompt}</span>
                        <span className="text-neutral-600 truncate">
                          {profileNodePath.length > 0 ? profileNodePath.join(" \u203a ") : "Path: (root)"}
                        </span>
                      </div>
                      {profileNodePath.length > 0 && (
                        <button
                          type="button"
                          className="text-neutral-400 hover:text-white transition-colors"
                          onClick={() => {
                            setProfileNodePath((prev) => prev.slice(0, -1));
                            setProfileSearch('');
                          }}
                        >
                          Back
                        </button>
                      )}
                    </div>
                    <input autoFocus value={profileSearch} onChange={e => setProfileSearch(e.target.value)} placeholder={pickerCanSelectNextNode ? `Search layer ${nextLayerNumber} nodes…` : "Search profiles…"}
                      className="w-full px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/20"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          if (pickerCanSelectNextNode) {
                            e.preventDefault();
                            setProfileNodePath((prev) => [...prev, filteredHierarchyOptions[0]]);
                            setProfileSearch('');
                            return;
                          }
                          if (filteredHierarchyProfiles.length > 0) {
                            e.preventDefault();
                            void confirmProfile(filteredHierarchyProfiles[0]);
                          }
                        }
                        if (e.key === 'Escape') {
                          setShowProfilePicker(false);
                          setPendingAction(null);
                          setProfileNodePath([]);
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto py-1 scout-results-scroll">
                    {pickerCanSelectNextNode ? (
                      filteredHierarchyOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setProfileNodePath((prev) => [...prev, option]);
                            setProfileSearch('');
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 transition-colors truncate flex items-center justify-between gap-2"
                        >
                          <span>{option}</span>
                          <span className="text-neutral-600">\u203a</span>
                        </button>
                      ))
                    ) : filteredHierarchyProfiles.length > 0 ? (
                      filteredHierarchyProfiles.map((profile) => (
                        <button key={profile} onClick={() => { void confirmProfile(profile); }} className="w-full text-left px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-white/5 transition-colors truncate">{profile}</button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-neutral-600 text-xs">
                        {activeProfileHierarchyNode.children.size > 0 ? "No matching nodes" : "No profiles found"}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <UploadQueuePanel
        title="Scout Uploads"
        items={uploadQueue}
        onRetry={(taskId) => {
          void retryUploadTask(taskId);
        }}
        onDismiss={dismissUploadTask}
        onClearFinished={clearFinishedUploadTasks}
      />

      {/* Lightbox */}
      {lightboxIdx !== null && results[lightboxIdx] && (
        <ScoutLightbox
          results={results}
          startIndex={lightboxIdx}
          stagedUrls={stagedUrls}
          onToggleSelect={toggleSelect}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      {ctxMenu && (
        <ImageContextMenu
          menu={ctxMenu}
          allProfiles={allProfileKeys}
          onSend={async (profile) => {
            const match = results.find(r => r.imageUrl === ctxMenu.imageUrl);
            const media = match ? [resultToMedia(match)] : undefined;
            const { added, failed, usedHotlink } = await addImagesToProfileWithDurability(profile, [ctxMenu.imageUrl], media);
            if (added > 0) {
              onFlash(
                failed > 0
                  ? `Sent to ${profile} (${failed} failed)`
                  : usedHotlink
                    ? `Sent image to ${profile} (hotlink — may break later)`
                    : `Sent image to ${profile}`,
              );
            } else {
              onFlash("Could not add image (upload failed)");
            }
          }}
          onCopyToProfile={async (profile) => {
            const match = results.find(r => r.imageUrl === ctxMenu.imageUrl);
            const media = match ? [resultToMedia(match)] : undefined;
            const { added, failed, usedHotlink } = await addImagesToProfileWithDurability(profile, [ctxMenu.imageUrl], media);
            if (added > 0) {
              onFlash(
                failed > 0
                  ? `Copied to ${profile} (${failed} failed)`
                  : usedHotlink
                    ? `Copied image to ${profile} (hotlink — may break later)`
                    : `Copied image to ${profile}`,
              );
            } else {
              onFlash("Could not add image (upload failed)");
            }
          }}
          onCopyImage={handleCtxCopyImage}
          onUpscale={handleCtxUpscale}
          onReplaceUrl={handleCtxReplaceUrl}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {upscaleReview && (
        <UpscaleReviewModal
          beforeUrl={upscaleReview.beforeUrl}
          afterUrl={upscaleReview.afterUrl}
          onReject={() => {
            setUpscaleReview(null);
            onFlash('Upscale rejected');
          }}
          onConfirm={() => {
            setResults(prev => prev.map((item, idx) => idx === upscaleReview.resultIndex ? {
              ...item,
              imageUrl: upscaleReview.afterUrl,
              thumbnailUrl: upscaleReview.afterUrl,
            } : item));
            setUpscaleReview(null);
            onFlash('Upscaled result applied');
          }}
        />
      )}
    </div>
  );
}

// ── Scout Lightbox ───────────────────────────────────────

function ScoutLightbox({
  results, startIndex, stagedUrls, onToggleSelect, onClose,
}: {
  results: ImageSearchResult[];
  startIndex: number;
  stagedUrls: Set<string>;
  onToggleSelect: (idx: number) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [imgLoaded, setImgLoaded] = useState(false);
  const r = results[idx];

  useEffect(() => { setImgLoaded(false); }, [idx]);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(results.length - 1, i + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === ' ') { e.preventDefault(); onToggleSelect(idx); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, onClose, onToggleSelect]);

  const isSelected = r ? stagedUrls.has(r.imageUrl) : false;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95" style={{ zIndex: 200 }} onClick={onClose}>
      <div className="shrink-0 flex items-center justify-between px-5 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-neutral-400 tabular-nums">{idx + 1} / {results.length}</span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{ background: `${SOURCE_COLORS[r.provider]}20`, color: SOURCE_COLORS[r.provider] }}>
            {r.provider}
          </span>
          <span className="text-xs text-neutral-500 truncate max-w-md">{r.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleSelect(idx); }}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              isSelected ? 'bg-blue-500 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
            }`}>
            {isSelected ? 'Selected' : 'Select'}
          </button>
          <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {idx > 0 && (
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-black/80 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
        )}
        <div className="flex items-center justify-center p-8" style={{ maxWidth: '90%', maxHeight: '100%' }}>
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="animate-spin w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
          <img src={r.imageUrl} alt={r.title} className="max-w-full max-h-[calc(100dvh-8rem)] object-contain rounded-lg"
            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s' }}
            onLoad={() => setImgLoaded(true)}
            onError={(e) => { (e.target as HTMLImageElement).src = r.thumbnailUrl; setImgLoaded(true); }}
          />
        </div>
        {idx < results.length - 1 && (
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/60 hover:text-white hover:bg-black/80 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-between px-5 py-2 text-xs text-neutral-600" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {r.attribution && <span className="text-blue-400/60">{r.attribution}</span>}
          {!r.attribution && r.source && <span>{r.source}</span>}
          {rightsLabel(r.rights) && <span className="text-cyan-400/60">{rightsLabel(r.rights)}</span>}
          {r.width && r.height && <span className="font-mono">{r.width}&times;{r.height}</span>}
          {r.tileSource && <span className="text-green-400/50" title="IIIF deep zoom available">IIIF</span>}
        </div>
        <div className="flex items-center gap-3 text-neutral-700">
          <span>← → navigate</span>
          <span>Space to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
