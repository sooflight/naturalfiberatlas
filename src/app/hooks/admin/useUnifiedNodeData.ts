/**
 * Unified Node Data Hook
 *
 * This hook provides a unified interface for fetching node data,
 * automatically choosing between:
 * 1. Remote API
 * 2. Legacy KV store (existing edge function)
 * 3. JSON files (fallback)
 */

import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/utils/api/info";
import type { NodeData } from "./useNodeData";
import {
  getCachedMaterial,
  getStaleCachedMaterial,
  setCachedMaterial,
  getCachedMaterialsList,
  getStaleCachedMaterialsList,
  setCachedMaterialsList,
} from "@/lib/cache/upstash";
import {
  trackDataSource,
  trackCacheHit,
  trackCacheMiss,
} from "@/utils/dataSourceTelemetry";
import { retryWithBackoff } from "@/utils/retry";

interface UnifiedNodeDataResult {
  node: NodeData | null;
  loading: boolean;
  error: Error | null;
  source: "api" | "kv" | "json" | null;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function shouldRetryReadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  const statusMatch = error.message.match(/status:(\d{3})/);
  if (!statusMatch) {
    // Network/unknown failures are generally transient.
    return true;
  }

  return RETRYABLE_STATUSES.has(Number(statusMatch[1]));
}

/**
 * Fetch node data from remote API (with caching)
 */
async function fetchFromApi(slug: string): Promise<NodeData | null> {
  const startTime = performance.now();

  // Try cache first
  const cached = await getCachedMaterial(slug);
  if (cached) {
    const duration = Math.round(performance.now() - startTime);
    trackCacheHit(slug, duration);
    return transformApiToNodeData(cached);
  }
  trackCacheMiss(slug);

  // Serve stale cache immediately and refresh in background.
  const staleCached = await getStaleCachedMaterial(slug);
  if (staleCached) {
    const duration = Math.round(performance.now() - startTime);
    trackDataSource("cache", "fallback", {
      slug,
      duration,
      success: true,
    });

    void retryWithBackoff(
      async () => {
        const response = await fetch(
          getApiUrl(`material/${encodeURIComponent(slug)}`),
          { headers: { "Content-Type": "application/json" } }
        );

        if (!response.ok) {
          throw new Error(`API read failed status:${response.status}`);
        }

        const data = await response.json();
        await setCachedMaterial(slug, data);
        return true;
      },
      {
        retries: 2,
        baseDelayMs: 120,
        maxDelayMs: 1000,
        shouldRetry: shouldRetryReadError,
      }
    ).catch((err) => {
      console.warn(`[useUnifiedNodeData] Background refresh failed for ${slug}:`, err);
    });

    return transformApiToNodeData(staleCached);
  }

  // Fetch from API
  try {
    const data = await retryWithBackoff(
      async () => {
        const response = await fetch(
          getApiUrl(`material/${encodeURIComponent(slug)}`),
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(`API read failed status:${response.status}`);
        }

        return response.json();
      },
      {
        retries: 2,
        baseDelayMs: 120,
        maxDelayMs: 1000,
        shouldRetry: shouldRetryReadError,
      }
    );

    // Cache the result
    await setCachedMaterial(slug, data);

    // Track successful API read
    const duration = Math.round(performance.now() - startTime);
    trackDataSource("api", "read", { slug, duration, success: true });

    return transformApiToNodeData(data);
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    trackDataSource("api", "read", {
      slug,
      duration,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Transform API response to NodeData format
 * This ensures compatibility with existing components
 */
function transformApiToNodeData(apiData: any): NodeData {
  const { profile, media, passport, suppliers } = apiData;
  const derivedCategory =
    typeof profile?.category === "string" && profile.category.length > 0
      ? profile.category
      : typeof profile?.type === "string" && profile.type.length > 0
        ? profile.type
        : "material";

  return {
    id: profile.profile_id,
    type: "material",
    category: derivedCategory,
    portal: profile.profile_id,
    name: profile.label,
    scientificName: profile.scientific_name || undefined,
    summary: profile.description || "",

    // Images from profile_media
    properties: {
      images: media?.map((m: any) => ({
        url: m.url,
        thumb: m.thumb_url,
        provider: m.provider,
        title: m.title,
        width: m.width,
        height: m.height,
      })),
    },

    // Passport data
    environmental: passport?.payload_jsonb?.sustainability || {},
    processing: passport?.payload_jsonb?.process
      ? Object.entries(passport.payload_jsonb.process).map(
          ([key, val]: [string, any]) => `${key}: ${val.value || val}`
        )
      : [],
    applications: passport?.payload_jsonb?.endUse || {},
    dyeCompatibility: passport?.payload_jsonb?.dyeing || {},

    // Suppliers
    crossReferences: {
      suppliers: suppliers?.map((s: any) => s.supplier_id) || [],
    },

    // Metadata
    variety: passport?.status || "draft",
    source: "api",
  };
}

/**
 * Fetch node data from legacy KV store
 */
async function fetchFromKV(slug: string): Promise<NodeData | null> {
  // Import dynamically to avoid circular dependencies
  const { getNodeData } = await import("./useNodeData");
  return getNodeData(slug);
}

/**
 * Fetch node data from JSON files (fallback)
 */
async function fetchFromJSON(slug: string): Promise<NodeData | null> {
  const startTime = performance.now();

  try {
    const [{ MATERIAL_PASSPORTS }, { ATLAS_IMAGES }] = await Promise.all([
      import("@/data/material-passports"),
      import("@/data/atlas-images"),
    ]);

    const passport = MATERIAL_PASSPORTS[slug];
    const images = ATLAS_IMAGES[slug];

    if (!passport && !images) {
      return null;
    }

    const duration = Math.round(performance.now() - startTime);
    trackDataSource("json", "read", { slug, duration, success: true });

    return {
      id: slug,
      type: "material",
      category: "fiber",
      portal: slug,
      name: slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      scientificName: undefined,
      summary: "",

      properties: {
        images: Array.isArray(images)
          ? images.map((img: string | { url: string }) =>
              typeof img === "string" ? img : img.url
            )
          : [],
      },

      environmental: passport?.sustainability || {},
      processing: passport?.process
        ? Object.entries(passport.process).map(
            ([key, val]: [string, any]) => `${key}: ${val.value || val}`
          )
        : [],
      applications: passport?.endUse || {},
      dyeCompatibility: passport?.dyeing || {},

      crossReferences: { suppliers: [] },
      variety: passport?.status || "draft",
      source: "json",
    };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    trackDataSource("json", "read", {
      slug,
      duration,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
    console.error("[useUnifiedNodeData] JSON fallback failed:", err);
    return null;
  }
}

/**
 * Unified hook for fetching node data
 * Automatically selects the best available data source
 */
export function useUnifiedNodeData(slug: string | undefined): UnifiedNodeDataResult {
  const [result, setResult] = useState<UnifiedNodeDataResult>({
    node: null,
    loading: !!slug,
    error: null,
    source: null,
  });

  const fetchData = useCallback(async () => {
    if (!slug) {
      setResult({ node: null, loading: false, error: null, source: null });
      return;
    }

    setResult((prev) => ({ ...prev, loading: true, error: null }));

    // Priority 1: Remote API
    try {
      const apiData = await fetchFromApi(slug);
      if (apiData) {
        setResult({
          node: apiData,
          loading: false,
          error: null,
          source: "api",
        });
        return;
      }
    } catch (err) {
      console.warn(`[useUnifiedNodeData] API read failed for ${slug}:`, err);
      trackDataSource("api", "fallback", { slug, success: true });
      // Continue to fallback
    }

    // Priority 2: Legacy KV store
    try {
      const kvData = await fetchFromKV(slug);
      if (kvData) {
        setResult({
          node: kvData,
          loading: false,
          error: null,
          source: "kv",
        });
        return;
      }
    } catch (err) {
      console.warn(`[useUnifiedNodeData] KV failed for ${slug}:`, err);
      // Continue to fallback
    }

    // Priority 3: JSON files (fallback)
    try {
      const jsonData = await fetchFromJSON(slug);
      if (jsonData) {
        setResult({
          node: jsonData,
          loading: false,
          error: null,
          source: "json",
        });
        return;
      }
    } catch (err) {
      console.error(`[useUnifiedNodeData] JSON fallback failed for ${slug}:`, err);
      setResult({
        node: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
        source: null,
      });
      return;
    }

    // Nothing found
    setResult({
      node: null,
      loading: false,
      error: new Error(`Material "${slug}" not found in any data source`),
      source: null,
    });
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return result;
}

/**
 * Hook to list all materials from the best available source
 */
export function useUnifiedMaterialsList(): {
  materials: Array<{ slug: string; label: string; category?: string }>;
  loading: boolean;
  error: Error | null;
  source: string | null;
} {
  const [result, setResult] = useState<{
    materials: Array<{ slug: string; label: string; category?: string }>;
    loading: boolean;
    error: Error | null;
    source: string | null;
  }>({
    materials: [],
    loading: true,
    error: null,
    source: null,
  });

  useEffect(() => {
    async function fetchMaterials() {
      const startTime = performance.now();

      // Try cache first
      const cached = await getCachedMaterialsList();
      if (cached) {
        const duration = Math.round(performance.now() - startTime);
        trackCacheHit("materials-list", duration);
        setResult({
          materials: cached,
          loading: false,
          error: null,
          source: "api",
        });
        return;
      }
      trackCacheMiss("materials-list");

      // Serve stale list immediately and refresh in background.
      const staleCached = await getStaleCachedMaterialsList();
      if (staleCached) {
        const duration = Math.round(performance.now() - startTime);
        trackDataSource("cache", "fallback", {
          duration,
          success: true,
        });

        void retryWithBackoff(
          async () => {
            const response = await fetch(getApiUrl("materials"));
            if (!response.ok) {
              throw new Error(`API read failed status:${response.status}`);
            }
            const data = await response.json();
            if (data?.materials) {
              await setCachedMaterialsList(data.materials);
            }
            return true;
          },
          {
            retries: 2,
            baseDelayMs: 120,
            maxDelayMs: 1000,
            shouldRetry: shouldRetryReadError,
          }
        ).catch((err) => {
          console.warn("[useUnifiedMaterialsList] Background refresh failed:", err);
        });

        setResult({
          materials: staleCached,
          loading: false,
          error: null,
          source: "api",
        });
        return;
      }

      // Try API first
      try {
        const data = await retryWithBackoff(
          async () => {
            const response = await fetch(getApiUrl("materials"));
            if (!response.ok) {
              throw new Error(`API read failed status:${response.status}`);
            }
            return response.json();
          },
          {
            retries: 2,
            baseDelayMs: 120,
            maxDelayMs: 1000,
            shouldRetry: shouldRetryReadError,
          }
        );

        if (data?.materials) {
          // Cache the result
          await setCachedMaterialsList(data.materials);
          const duration = Math.round(performance.now() - startTime);
          trackDataSource("api", "read", {
            duration,
            success: true,
          });
          setResult({
            materials: data.materials,
            loading: false,
            error: null,
            source: "api",
          });
          return;
        }
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        trackDataSource("api", "read", {
          duration,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        trackDataSource("api", "fallback", { success: true });
        console.warn("[useUnifiedMaterialsList] API read failed:", err);
      }

      // Fallback to JSON
      try {
        const { default: atlasData } = await import("@/data/atlas-data.json");
        const slugs = Object.keys(atlasData.images || {});
        const materials = slugs.map((slug) => ({
          slug,
          label: slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
        }));
        const duration = Math.round(performance.now() - startTime);
        trackDataSource("json", "read", { duration, success: true });
        setResult({
          materials,
          loading: false,
          error: null,
          source: "json",
        });
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        trackDataSource("json", "read", {
          duration,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        setResult({
          materials: [],
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
          source: null,
        });
      }
    }

    fetchMaterials();
  }, []);

  return result;
}
