/**
 * Upstash Redis caching layer for remote API queries
 * Reduces API load and improves response times
 */

import { Redis } from "@upstash/redis";

// Initialize Redis client with environment variables
const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL || "",
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN || "",
});

const CACHE_TTL = 3600; // 1 hour default
const CACHE_PREFIX = "atlas:";
const TTL_JITTER_MAX_RATIO = 0.2;
const STALE_TTL_MULTIPLIER = 4;

function materialKey(slug: string): string {
  return `${CACHE_PREFIX}material:${slug}`;
}

function staleMaterialKey(slug: string): string {
  return `${CACHE_PREFIX}material:stale:${slug}`;
}

function materialsListKey(): string {
  return `${CACHE_PREFIX}materials:list`;
}

function staleMaterialsListKey(): string {
  return `${CACHE_PREFIX}materials:list:stale`;
}

function parseCachedValue<T>(cached: unknown): T | null {
  if (cached == null) return null;
  if (typeof cached === "string") {
    try {
      return JSON.parse(cached) as T;
    } catch {
      return null;
    }
  }
  return cached as T;
}

export function calculateJitteredTtl(
  ttl: number,
  randomFactor: number = Math.random()
): number {
  const jitter = Math.floor(ttl * TTL_JITTER_MAX_RATIO * randomFactor);
  return ttl + jitter;
}

export function calculateStaleTtl(ttl: number): number {
  return ttl * STALE_TTL_MULTIPLIER;
}

/**
 * Check if Redis is configured and available
 */
export function isRedisConfigured(): boolean {
  return !!(
    import.meta.env.VITE_UPSTASH_REDIS_REST_URL &&
    import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN
  );
}

/**
 * Get cached material data
 */
export async function getCachedMaterial(
  slug: string
): Promise<Record<string, unknown> | null> {
  if (!isRedisConfigured()) return null;

  try {
    const key = materialKey(slug);
    const cached = await redis.get(key);
    return parseCachedValue<Record<string, unknown>>(cached);
  } catch (err) {
    console.warn("[Redis] Failed to get cached material:", err);
    return null;
  }
}

/**
 * Get stale cached material data (used for stale-while-revalidate fallback)
 */
export async function getStaleCachedMaterial(
  slug: string
): Promise<Record<string, unknown> | null> {
  if (!isRedisConfigured()) return null;

  try {
    const key = staleMaterialKey(slug);
    const cached = await redis.get(key);
    return parseCachedValue<Record<string, unknown>>(cached);
  } catch (err) {
    console.warn("[Redis] Failed to get stale cached material:", err);
    return null;
  }
}

/**
 * Cache material data
 */
export async function setCachedMaterial(
  slug: string,
  data: Record<string, unknown>,
  ttl: number = CACHE_TTL
): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const key = materialKey(slug);
    const staleKey = staleMaterialKey(slug);
    const jitteredTtl = calculateJitteredTtl(ttl);
    const staleTtl = calculateStaleTtl(ttl);
    const encoded = JSON.stringify(data);

    await Promise.all([
      redis.setex(key, jitteredTtl, encoded),
      redis.setex(staleKey, staleTtl, encoded),
    ]);
  } catch (err) {
    console.warn("[Redis] Failed to cache material:", err);
  }
}

/**
 * Invalidate material cache
 */
export async function invalidateMaterialCache(slug: string): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    await redis.del(materialKey(slug), staleMaterialKey(slug));
  } catch (err) {
    console.warn("[Redis] Failed to invalidate cache:", err);
  }
}

/**
 * Get cached materials list
 */
export async function getCachedMaterialsList(): Promise<
  Array<{ slug: string; label: string }> | null
> {
  if (!isRedisConfigured()) return null;

  try {
    const key = materialsListKey();
    const cached = await redis.get(key);
    return parseCachedValue<Array<{ slug: string; label: string }>>(cached);
  } catch (err) {
    console.warn("[Redis] Failed to get cached materials list:", err);
    return null;
  }
}

/**
 * Get stale cached materials list (used for stale-while-revalidate fallback)
 */
export async function getStaleCachedMaterialsList(): Promise<
  Array<{ slug: string; label: string }> | null
> {
  if (!isRedisConfigured()) return null;

  try {
    const key = staleMaterialsListKey();
    const cached = await redis.get(key);
    return parseCachedValue<Array<{ slug: string; label: string }>>(cached);
  } catch (err) {
    console.warn("[Redis] Failed to get stale cached materials list:", err);
    return null;
  }
}

/**
 * Cache materials list
 */
export async function setCachedMaterialsList(
  materials: Array<{ slug: string; label: string }>,
  ttl: number = CACHE_TTL
): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const key = materialsListKey();
    const staleKey = staleMaterialsListKey();
    const jitteredTtl = calculateJitteredTtl(ttl);
    const staleTtl = calculateStaleTtl(ttl);
    const encoded = JSON.stringify(materials);

    await Promise.all([
      redis.setex(key, jitteredTtl, encoded),
      redis.setex(staleKey, staleTtl, encoded),
    ]);
  } catch (err) {
    console.warn("[Redis] Failed to cache materials list:", err);
  }
}

/**
 * Invalidate all material caches
 */
export async function invalidateAllMaterialCaches(): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}material:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.warn("[Redis] Failed to invalidate all caches:", err);
  }
}

/**
 * Get cache stats
 */
export async function getCacheStats(): Promise<{
  materialsCount: number;
  configured: boolean;
}> {
  if (!isRedisConfigured()) {
    return { materialsCount: 0, configured: false };
  }

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}material:*`);
    return { materialsCount: keys.length, configured: true };
  } catch (err) {
    console.warn("[Redis] Failed to get cache stats:", err);
    return { materialsCount: 0, configured: true };
  }
}
