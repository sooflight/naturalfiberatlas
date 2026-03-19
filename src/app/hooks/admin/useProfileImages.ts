import { useState, useEffect, useRef, useCallback } from "react";
import { apiKey, getApiUrl } from "@/utils/api/info";
import { imageSeedReady } from "./useSeedData";

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
 * Fetch a batch of node images from KV via the server.
 * POST { ids: [...] } → { images: { id: urls[] } }
 *
 * Includes retry with exponential backoff for transient failures.
 */
async function fetchBatch(
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
        const text = await res.text().catch(() => "");
        lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        console.warn(`[useProfileImages] ${lastError.message} (attempt ${attempt + 1})`);
        continue; // retry
      }

      const data = await res.json();
      return data.images || {};
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`[useProfileImages] Fetch failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
      }
    }
  }

  // All retries exhausted
  console.warn("[useProfileImages] All retries exhausted:", lastError);
  return {};
}

// ── Hook ──────────────────────────────────────────────
export function useProfileImages(profiles: ProfileImageRequest[]) {
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ requested: 0, fetched: 0, errors: 0 });

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
      `[useProfileImages] Fetching ${needed.length} node images from KV (${profiles.length - needed.length} cached)`
    );

    setLoading(true);
    setStats({ requested: needed.length, fetched: 0, errors: 0 });

    const controller = new AbortController();

    // Server accepts up to 200 per request — send in one batch when possible
    const BATCH_SIZE = 200;
    const batches: string[][] = [];
    for (let i = 0; i < needed.length; i += BATCH_SIZE) {
      batches.push(needed.slice(i, i + BATCH_SIZE).map((p) => p.id));
    }

    let totalFetched = 0;

    (async () => {
      // Wait for image seed to complete so KV has fresh multi-URL data
      await imageSeedReady;

      for (let b = 0; b < batches.length; b++) {
        if (controller.signal.aborted) break;

        try {
          const batchResult = await fetchBatch(batches[b], controller.signal);
          const batchUrls = Object.entries(batchResult).filter(
            ([, urls]) => urls && urls.length > 0
          );

          // Update module cache
          for (const [id, urls] of batchUrls) {
            imageCache.set(id, urls);
          }

          totalFetched += batchUrls.length;

          // Update component state
          if (!controller.signal.aborted) {
            setImages((prev) => {
              const next = { ...prev };
              for (const [id, urls] of batchUrls) {
                next[id] = urls;
              }
              return next;
            });
            setStats((s) => ({ ...s, fetched: totalFetched }));
          }
        } catch (err: any) {
          if (err?.name === "AbortError") break;
          console.warn(`[useProfileImages] Batch ${b + 1} error:`, err);
          setStats((s) => ({ ...s, errors: s.errors + 1 }));
        }
      }

      // Release in-flight markers
      for (const p of needed) inFlightIds.delete(p.id);

      if (!controller.signal.aborted) {
        setLoading(false);
        console.log(
          `[useProfileImages] Complete: ${totalFetched}/${needed.length} nodes have images`
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

  return { images, loading, stats };
}