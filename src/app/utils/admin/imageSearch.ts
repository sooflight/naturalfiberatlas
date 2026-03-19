/**
 * Unified multi-source image search.
 * Providers: Brave, Unsplash, Pexels, Flickr, Openverse.
 * All API calls go through Vite dev-server proxies to avoid CORS / key exposure.
 */

import { authenticatedFetch } from "./adminRoutes";

export type ImageSource =
  | "brave"
  | "unsplash"
  | "pexels"
  | "flickr"
  | "openverse"
  | "europeana"
  | "wikimedia"
  | "pinterest";

export interface ImageSearchResult {
  title: string;
  sourceUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  width?: number;
  height?: number;
  source?: string;
  provider: ImageSource;
  tileSource?: string;
  sourceManifest?: string;
  rights?: string;
  attribution?: string;
  licenseUrl?: string;
}

export interface SearchApiKeys {
  brave?: string;
  unsplash?: string;
  pexels?: string;
  flickr?: string;
  openverse?: string;
  europeana?: string;
  wikimedia?: string;
  pinterest?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeSearchResult(
  provider: ImageSource,
  raw: Record<string, unknown>
): ImageSearchResult | null {
  const imageUrl = asString(raw.imageUrl) || asString(raw.thumbnailUrl);
  const thumbnailUrl = asString(raw.thumbnailUrl) || imageUrl;
  if (!imageUrl) return null;

  return {
    provider,
    title: asString(raw.title),
    sourceUrl: asString(raw.sourceUrl),
    thumbnailUrl,
    imageUrl,
    width: asNumber(raw.width),
    height: asNumber(raw.height),
    source: asString(raw.source) || provider,
    tileSource: asString(raw.tileSource) || undefined,
    sourceManifest: asString(raw.sourceManifest) || undefined,
    rights: asString(raw.rights) || undefined,
    attribution: asString(raw.attribution) || undefined,
    licenseUrl: asString(raw.licenseUrl) || undefined,
  };
}

function normalizeProviderResults(
  provider: ImageSource,
  rows: unknown[]
): ImageSearchResult[] {
  const seen = new Set<string>();
  const out: ImageSearchResult[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const normalized = normalizeSearchResult(provider, row as Record<string, unknown>);
    if (!normalized) continue;
    if (seen.has(normalized.imageUrl)) continue;
    seen.add(normalized.imageUrl);
    out.push(normalized);
  }
  return out;
}

export const __imageSearchTestUtils = {
  normalizeSearchResult,
  normalizeProviderResults,
};

const STORAGE_KEY = "atlas-search-api-keys";

export function loadApiKeys(): SearchApiKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        brave: parsed.brave || "",
        unsplash: parsed.unsplash || "",
        pexels: parsed.pexels || "",
        flickr: parsed.flickr || "",
        openverse: parsed.openverse || "_none_",
        europeana: parsed.europeana || "",
        wikimedia: parsed.wikimedia || "_none_",
        pinterest: parsed.pinterest || "",
      };
    }
  } catch { /* ignore */ }
  // Migrate from old brave-only key
  try {
    const old = localStorage.getItem("atlas-brave-config");
    if (old) {
      const parsed = JSON.parse(old);
      if (parsed.apiKey) {
        return {
          brave: parsed.apiKey,
          unsplash: "",
          pexels: "",
          flickr: "",
          openverse: "_none_",
          europeana: "",
          wikimedia: "_none_",
          pinterest: "",
        };
      }
    }
  } catch { /* ignore */ }
  return {
    brave: "",
    unsplash: "",
    pexels: "",
    flickr: "",
    openverse: "_none_",
    europeana: "",
    wikimedia: "_none_",
    pinterest: "",
  };
}

export function saveApiKeys(keys: SearchApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  localStorage.setItem("atlas-brave-config", JSON.stringify({ apiKey: keys.brave }));
}

// Per-provider pacing prevents one noisy source from stalling all others.
const RATE_LIMITS: Record<ImageSource, number> = {
  brave: 1500,
  unsplash: 1200,
  pexels: 500,
  flickr: 500,
  openverse: 1000,
  europeana: 500,
  wikimedia: 500,
  pinterest: 1000,
};
const DEFAULT_INTERVAL_MS = 1100;
const perProviderState = new Map<ImageSource, { lastTime: number; queue: Promise<void> }>();

async function throttle(provider: ImageSource): Promise<void> {
  const minInterval = RATE_LIMITS[provider] ?? DEFAULT_INTERVAL_MS;
  let state = perProviderState.get(provider);
  if (!state) {
    state = { lastTime: 0, queue: Promise.resolve() };
    perProviderState.set(provider, state);
  }
  state.queue = state.queue.then(async () => {
    const now = Date.now();
    const elapsed = now - state.lastTime;
    if (elapsed < minInterval) {
      await new Promise((r) => setTimeout(r, minInterval - elapsed));
    }
    state.lastTime = Date.now();
  });
  await state.queue;
}

const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 2000;

async function withRetry<T>(
  provider: ImageSource,
  fn: () => Promise<T>,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|too many|rate.limit|503|502/i.test(msg);
      if (!retryable || attempt === MAX_RETRIES) throw err;
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      await throttle(provider);
    }
  }
  throw (lastErr instanceof Error ? lastErr : new Error(String(lastErr)));
}

// ── Brave ────────────────────────────────────────────────

async function searchBrave(
  query: string,
  apiKey: string,
  count: number,
  offset: number
): Promise<ImageSearchResult[]> {
  return withRetry("brave", async () => {
    await throttle("brave");
    const res = await authenticatedFetch("/__admin/brave-image-search", {
      method: "POST",
      body: JSON.stringify({ query, count, offset, apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Brave search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("brave", data.results || []);
  });
}

// ── Unsplash ─────────────────────────────────────────────

async function searchUnsplash(
  query: string,
  apiKey: string,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("unsplash", async () => {
    await throttle("unsplash");
    const res = await authenticatedFetch("/__admin/unsplash-image-search", {
      method: "POST",
      body: JSON.stringify({ query, per_page: count, page, apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Unsplash search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("unsplash", data.results || []);
  });
}

// ── Pexels ───────────────────────────────────────────────

async function searchPexels(
  query: string,
  apiKey: string,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("pexels", async () => {
    await throttle("pexels");
    const res = await authenticatedFetch("/__admin/pexels-image-search", {
      method: "POST",
      body: JSON.stringify({ query, per_page: count, page, apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Pexels search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("pexels", data.results || []);
  });
}

// ── Flickr ───────────────────────────────────────────────

async function searchFlickr(
  query: string,
  apiKey: string,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("flickr", async () => {
    await throttle("flickr");
    const res = await authenticatedFetch("/__admin/flickr-image-search", {
      method: "POST",
      body: JSON.stringify({ query, per_page: count, page, apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Flickr search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("flickr", data.results || []);
  });
}

// ── Openverse ────────────────────────────────────────────

async function searchOpenverse(
  query: string,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("openverse", async () => {
    await throttle("openverse");
    const res = await authenticatedFetch("/__admin/openverse-image-search", {
      method: "POST",
      body: JSON.stringify({ query, page_size: count, page }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Openverse search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("openverse", data.results || []);
  });
}

async function searchEuropeana(
  query: string,
  apiKey: string | undefined,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("europeana", async () => {
    await throttle("europeana");
    const start = Math.max(1, (page - 1) * count + 1);
    const res = await authenticatedFetch("/__admin/europeana-image-search", {
      method: "POST",
      body: JSON.stringify({ query, rows: count, start, apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Europeana search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("europeana", data.results || []);
  });
}

async function searchWikimedia(
  query: string,
  count: number,
  page: number
): Promise<ImageSearchResult[]> {
  return withRetry("wikimedia", async () => {
    await throttle("wikimedia");
    const res = await authenticatedFetch("/__admin/wikimedia-image-search", {
      method: "POST",
      body: JSON.stringify({ query, per_page: count, page }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Wikimedia search failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    return normalizeProviderResults("wikimedia", data.results || []);
  });
}

// ── Pinterest ────────────────────────────────────────────

interface PinterestPin {
  node_id: string;
  url: string;
  auto_alt_text?: string;
  id: string;
  description?: string;
  title?: string;
  images?: {
    orig?: { width: number; height: number; url: string };
    [key: string]: any;
  };
  link?: string;
  domain?: string;
  grid_title?: string;
  seo_alt_text?: string;
}

interface PinterestSearchResponse {
  success: boolean;
  pins: PinterestPin[];
  cursor?: string;
}

async function searchPinterest(
  query: string,
  apiKey: string,
  count: number,
  cursor?: string
): Promise<{ results: ImageSearchResult[]; nextCursor?: string }> {
  return withRetry("pinterest", async () => {
    await throttle("pinterest");
    const res = await authenticatedFetch("/__admin/pinterest-search", {
      method: "POST",
      body: JSON.stringify({ query, apiKey, cursor, trim: true }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Pinterest search failed (HTTP ${res.status})`);
    }
    const data: PinterestSearchResponse = await res.json();
    if (!data.success || !Array.isArray(data.pins)) {
      throw new Error("Invalid Pinterest API response");
    }
    const results = data.pins.map((pin): ImageSearchResult | null => {
      const origImage = pin.images?.orig;
      if (!origImage?.url) return null;
      return {
        provider: "pinterest",
        title: pin.grid_title || pin.description || pin.title || pin.auto_alt_text || "",
        sourceUrl: pin.url || pin.link || "",
        thumbnailUrl: origImage.url,
        imageUrl: origImage.url,
        width: origImage.width,
        height: origImage.height,
        source: pin.domain || "pinterest.com",
        attribution: pin.domain || "Pinterest",
      };
    }).filter((r): r is ImageSearchResult => r !== null);
    return { results, nextCursor: data.cursor };
  });
}

// ── Unified search ───────────────────────────────────────

export async function searchImages(
  query: string,
  provider: ImageSource,
  keys: SearchApiKeys,
  count = 20,
  pageOrCursor: number | string = 1
): Promise<ImageSearchResult[]> {
  switch (provider) {
    case "brave":
      if (!keys.brave) throw new Error("Brave API key not configured");
      return searchBrave(query, keys.brave, count, (pageOrCursor as number - 1) * count);
    case "unsplash":
      if (!keys.unsplash) throw new Error("Unsplash API key not configured");
      return searchUnsplash(query, keys.unsplash, count, pageOrCursor as number);
    case "pexels":
      if (!keys.pexels) throw new Error("Pexels API key not configured");
      return searchPexels(query, keys.pexels, count, pageOrCursor as number);
    case "flickr":
      if (!keys.flickr) throw new Error("Flickr API key not configured");
      return searchFlickr(query, keys.flickr, count, pageOrCursor as number);
    case "openverse":
      return searchOpenverse(query, count, pageOrCursor as number);
    case "europeana":
      return searchEuropeana(query, keys.europeana, count, pageOrCursor as number);
    case "wikimedia":
      return searchWikimedia(query, count, pageOrCursor as number);
    case "pinterest": {
      if (!keys.pinterest) throw new Error("Pinterest API key not configured");
      const { results } = await searchPinterest(query, keys.pinterest, count, typeof pageOrCursor === 'string' ? pageOrCursor : undefined);
      return results;
    }
  }
}

export async function testConnection(
  provider: ImageSource,
  apiKey: string
): Promise<void> {
  const keys: SearchApiKeys = {
    brave: "",
    unsplash: "",
    pexels: "",
    flickr: "",
    openverse: "",
    europeana: "",
    wikimedia: "",
    pinterest: "",
  };
  keys[provider] = apiKey;
  if (provider === "openverse") keys.openverse = "_none_";
  if (provider === "wikimedia") keys.wikimedia = "_none_";
  const results = await searchImages("test", provider, keys, 1, 1);
  if (!Array.isArray(results)) throw new Error("Unexpected response format");
}

// ── Re-export for backward compat ────────────────────────

export type { ImageSearchResult as BraveImageResult };
export type BraveConfig = { apiKey: string };

export async function searchBraveImages(
  query: string,
  apiKey: string,
  count = 20
): Promise<ImageSearchResult[]> {
  return searchBrave(query, apiKey, count, 0);
}

export async function testBraveConnection(apiKey: string): Promise<void> {
  return testConnection("brave", apiKey);
}

export function buildScoutQuery(profileKey: string, tags?: string[]): string {
  const title = profileKey
    .replace(/[-_]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const parent1 = tags?.[0]
    ?.split("/")
    .map((part) => part.trim())
    .find(Boolean)
    ?.replace(/[-_]/g, " ");
  return [title, parent1].filter(Boolean).join(" ");
}

// Provider metadata for the UI
export const PROVIDERS: {
  id: ImageSource;
  label: string;
  color: string;
  configUrl: string;
  keyRequired: boolean;
  pageable?: boolean;
  cursorBased?: boolean;
  description: string;
}[] = [
  { id: "brave", label: "Brave", color: "#fb542b", configUrl: "https://brave.com/search/api/", keyRequired: true, pageable: true, description: "Web image search (2k/mo free)" },
  { id: "unsplash", label: "Unsplash", color: "#ffffff", configUrl: "https://unsplash.com/developers", keyRequired: true, pageable: true, description: "High-quality photography (50/hr)" },
  { id: "pexels", label: "Pexels", color: "#05a081", configUrl: "https://www.pexels.com/api/", keyRequired: true, pageable: true, description: "Stock photography (200/hr)" },
  { id: "flickr", label: "Flickr", color: "#ff0084", configUrl: "https://www.flickr.com/services/api/", keyRequired: true, pageable: true, description: "Huge CC photo archive (3.6k/hr)" },
  { id: "openverse", label: "Openverse", color: "#c233ed", configUrl: "https://api.openverse.org/", keyRequired: false, pageable: true, description: "330M+ CC images, no key needed" },
  { id: "europeana", label: "Europeana", color: "#0a72cc", configUrl: "https://api.europeana.eu/", keyRequired: false, pageable: true, description: "Europeana cultural heritage collections" },
  { id: "wikimedia", label: "Wikimedia", color: "#006699", configUrl: "https://commons.wikimedia.org/w/api.php", keyRequired: false, pageable: true, description: "Wikimedia Commons image archive" },
  { id: "pinterest", label: "Pinterest", color: "#e60023", configUrl: "https://scrapecreators.com/pinterest", keyRequired: true, pageable: true, cursorBased: true, description: "Pinterest image search via ScrapeCreators" },
];

export type ImageSourceOrAll = ImageSource | "all";

export type ProviderPageState = Record<ImageSource, number | string | undefined>;

export function initProviderPageState(initialOrKeys: number | SearchApiKeys = 1): ProviderPageState {
  const initial = typeof initialOrKeys === "number" ? initialOrKeys : 1;
  return {
    brave: initial,
    unsplash: initial,
    pexels: initial,
    flickr: initial,
    openverse: initial,
    europeana: initial,
    wikimedia: initial,
    pinterest: undefined, // Pinterest uses cursor-based pagination
  };
}

export function getConfiguredProviders(keys: SearchApiKeys): ImageSource[] {
  return PROVIDERS.filter((p) => {
    if (!p.keyRequired) return true;
    const key = keys[p.id];
    return typeof key === "string" && key.trim().length > 0;
  }).map((p) => p.id);
}

export interface SearchAllSourcesResult {
  results: ImageSearchResult[];
  providerState: ProviderPageState;
  allExhausted: boolean;
}

export async function searchPinterestImages(
  query: string,
  keys: SearchApiKeys,
  count = 20,
  cursor?: string
): Promise<{ results: ImageSearchResult[]; nextCursor?: string }> {
  if (!keys.pinterest) throw new Error("Pinterest API key not configured");
  return searchPinterest(query, keys.pinterest, count, cursor);
}

export async function searchAllSources(
  query: string,
  keys: SearchApiKeys,
  count = 20,
  state?: Partial<ProviderPageState>
): Promise<SearchAllSourcesResult> {
  const configured = getConfiguredProviders(keys);
  const providerState: ProviderPageState = {
    ...initProviderPageState(1),
    ...(state ?? {}),
  };
  const settled = await Promise.allSettled(
    configured.map(async (provider) => {
      const pageOrCursor = providerState[provider];
      if (provider === "pinterest") {
        if (!keys.pinterest) {
          return { provider, results: [] as ImageSearchResult[], exhausted: true };
        }
        const response = await searchPinterest(
          query,
          keys.pinterest,
          count,
          typeof pageOrCursor === "string" ? pageOrCursor : undefined
        );
        return {
          provider,
          results: response.results,
          nextState: response.nextCursor,
          exhausted: response.results.length === 0 || !response.nextCursor,
        };
      }
      const page = typeof pageOrCursor === "number" ? pageOrCursor : 1;
      const results = await searchImages(query, provider, keys, count, page);
      return {
        provider,
        results,
        nextState: results.length > 0 ? page + 1 : page,
        exhausted: results.length === 0,
      };
    })
  );

  const results = settled.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    return result.value.results;
  });

  const exhaustedByProvider = new Map<ImageSource, boolean>();
  configured.forEach((provider, idx) => {
    const entry = settled[idx];
    if (entry.status === "fulfilled") {
      providerState[provider] = entry.value.nextState;
      exhaustedByProvider.set(provider, entry.value.exhausted);
    } else {
      exhaustedByProvider.set(provider, true);
    }
  });

  const allExhausted =
    configured.length > 0 && configured.every((provider) => exhaustedByProvider.get(provider) === true);

  return { results, providerState, allExhausted };
}

export async function fetchIIIFManifest(url: string): Promise<unknown> {
  const res = await authenticatedFetch("/__admin/iiif-fetch-manifest", {
    method: "POST",
    body: JSON.stringify({ manifestUrl: url }),
  });
  if (!res.ok) throw new Error(`Failed to fetch IIIF manifest (${res.status})`);
  return res.json();
}
