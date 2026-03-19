import { useState, useEffect, useRef, useCallback } from "react";
import { apiKey, getApiUrl } from "@/utils/api/info";
import { imageSeedReady } from "./useSeedData";
import {
  buildProfileImageFetchPlan,
  resolveFetchedImagesForRequestedIds,
} from "./profile-image-resolution";

// ── Types ──────────────────────────────────────────────
export interface ProfileImageRequest {
  id: string;
  label: string;
  sectionId: string;
}

// ── Module-level cache (survives re-renders / re-mounts) ──
const imageCache = new Map<string, string[]>();

// Track in-flight fetch IDs to prevent duplicate concurrent requests
const inFlightIds = new Set<string>();

/**
 * Fetch a batch of node images from database via the server.
 * POST { ids: [...] } → { media: { id: [{ url, ... }] } }, normalized to url[].
 *
 * Includes retry with exponential backoff for transient failures.
 */
async function fetchBatchFromDb(
  ids: string[],
  signal?: AbortSignal,
  maxRetries = 2,
): Promise<Record<string, string[]>> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) return {};

    // Exponential backoff: 0ms, 800ms, 2400ms
    if (attempt > 0) {
      const delay = attempt * 800;
      await new Promise((r) => setTimeout(r, delay));
      if (signal?.aborted) return {};
    }

    try {
      const res = await fetch(getApiUrl("materials/media"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ ids }),
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        console.warn(`[useProfileImagesDb] ${lastError.message} (attempt ${attempt + 1})`);
        continue; // retry
      }

      const data = await res.json();
      const media = data.media || {};
      const normalized: Record<string, string[]> = {};
      for (const [id, items] of Object.entries(media)) {
        if (!Array.isArray(items)) continue;
        const urls = items
          .map((item) =>
            typeof item === "string"
              ? item
              : typeof item === "object" && item !== null && "url" in item
                ? (item as { url?: unknown }).url
                : undefined
          )
          .filter((url): url is string => typeof url === "string" && url.length > 0);
        if (urls.length > 0) normalized[id] = urls;
      }
      return normalized;
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`[useProfileImagesDb] Fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
      }
    }
  }

  // All retries exhausted
  console.warn("[useProfileImagesDb] All retries exhausted:", lastError);
  return {};
}

/**
 * Fallback to KV store for images (legacy compatibility)
 */
async function fetchBatchFromKv(
  ids: string[],
  signal?: AbortSignal,
): Promise<Record<string, string[]>> {
  try {
    const res = await fetch(getApiUrl("node-images"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ ids }),
      signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.images || {};
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    console.warn("[useProfileImagesDb] KV fallback failed:", err);
    return {};
  }
}

// ── Hook ──────────────────────────────────────────────
export function useProfileImagesDb(profiles: ProfileImageRequest[]) {
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ requested: 0, fetched: 0, errors: 0, fromKv: 0 });
  const [usingFallback, setUsingFallback] = useState(false);

  // Stable ref to latest profiles (avoids stale closures)
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  // Sync from module cache on every render (cheap — just Map lookups)
  const syncFromCache = useCallback(() => {
    let updated = false;
    setImages((prev) => {
      const next = { ...prev };
      for (const p of profilesRef.current) {
        const cached = imageCache.get(p.id);
        if (cached && !prev[p.id]) {
          next[p.id] = cached;
          updated = true;
        }
      }
      return updated ? next : prev;
    });
    return updated;
  }, []);

  // Main fetch effect
  useEffect(() => {
    if (profiles.length === 0) return;

    // 1. Sync anything already in module cache
    syncFromCache();

    // 2. Determine what still needs fetching
    const needed = profiles.filter(
      (p) => !imageCache.has(p.id) && !inFlightIds.has(p.id)
    );

    if (needed.length === 0) {
      return;
    }

    // Mark as in-flight
    for (const p of needed) inFlightIds.add(p.id);

    console.log(
      `[useProfileImagesDb] Fetching ${needed.length} node images from database (${profiles.length - needed.length} cached)`
    );

    setLoading(true);
    setStats({ requested: needed.length, fetched: 0, errors: 0, fromKv: 0 });
    setUsingFallback(false);

    const controller = new AbortController();

    // Server accepts up to 200 per request — send in one batch when possible
    const BATCH_SIZE = 200;
    const batches: ProfileImageRequest[][] = [];
    for (let i = 0; i < needed.length; i += BATCH_SIZE) {
      batches.push(needed.slice(i, i + BATCH_SIZE));
    }

    let totalFetched = 0;
    let fromKvCount = 0;

    (async () => {
      // Wait for image seed to complete so KV has fresh multi-URL data
      await imageSeedReady;

      for (let b = 0; b < batches.length; b++) {
        if (controller.signal.aborted) break;

        try {
          const requestedIds = batches[b].map((p) => p.id);
          const requestPlan = buildProfileImageFetchPlan(requestedIds);

          // Try database first
          const batchResult = await fetchBatchFromDb(requestPlan.requestIds, controller.signal);
          const resolvedFromDb = resolveFetchedImagesForRequestedIds(requestedIds, batchResult);
          const missingIds = requestedIds.filter((id) => !resolvedFromDb[id] || resolvedFromDb[id].length === 0);
          let resolved = { ...resolvedFromDb };

          // Fallback for IDs still missing after DB lookup
          if (missingIds.length > 0) {
            console.log(
              `[useProfileImagesDb] Missing ${missingIds.length} profile(s) from DB; trying KV fallback for batch ${b + 1}`,
            );
            const missingRequestPlan = buildProfileImageFetchPlan(missingIds);
            const kvResult = await fetchBatchFromKv(missingRequestPlan.requestIds, controller.signal);
            const resolvedFromKv = resolveFetchedImagesForRequestedIds(missingIds, kvResult);
            resolved = { ...resolved, ...resolvedFromKv };
            fromKvCount += Object.keys(resolvedFromKv).length;

            if (!controller.signal.aborted) setUsingFallback(true);
          }

          // Update module cache
          for (const id of Object.keys(resolved)) {
            if (resolved[id] && resolved[id].length > 0) {
              imageCache.set(id, resolved[id]);
            }
          }

          totalFetched += Object.keys(resolved).length;

          // Update component state
          if (!controller.signal.aborted) {
            setImages((prev) => {
              const next = { ...prev };
              for (const [id, items] of Object.entries(resolved)) {
                if (items && items.length > 0) {
                  next[id] = items;
                }
              }
              return next;
            });
            setStats((s) => ({ ...s, fetched: totalFetched, fromKv: fromKvCount }));
          }
        } catch (err: any) {
          if (err?.name === "AbortError") break;
          console.warn(`[useProfileImagesDb] Batch ${b + 1} error:`, err);
          setStats((s) => ({ ...s, errors: s.errors + 1 }));
        }
      }

      // Release in-flight markers
      for (const p of needed) inFlightIds.delete(p.id);

      if (!controller.signal.aborted) {
        setLoading(false);
        console.log(
          `[useProfileImagesDb] Complete: ${totalFetched}/${needed.length} nodes have images (${fromKvCount} from KV fallback)`
        );
      }
    })();

    return () => {
      controller.abort();
      // Release in-flight markers so re-mount can retry
      for (const p of needed) {
        if (!imageCache.has(p.id)) {
          inFlightIds.delete(p.id);
        }
      }
    };
  }, [profiles, syncFromCache]);

  return { images, loading, stats, usingFallback };
}
