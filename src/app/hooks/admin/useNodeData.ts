import { useState, useEffect } from "react";
import { apiKey, getApiUrl } from "@/utils/api/info";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { MATERIAL_PASSPORTS } from "@/data/material-passports";

// ── Warmup ──────────────────────────────────────────────
// Fire a lightweight health-check on import so the edge function is already
// booted by the time real data requests arrive (avoids cold-start retries).
let _warmupDone = false;
export function warmupServer() {
  if (_warmupDone) return;
  _warmupDone = true;
  fetch(getApiUrl("health"), {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  }).catch(() => {/* ignore – best-effort warmup */});
}

// ── Types for KV node data ──
export interface NodeVariety {
  name: string;
  traits: string;
  uses: string;
}

export interface NodeData {
  id: string;
  type: string;
  category: string;
  subcategory?: string;
  portal: string;
  name: string;
  scientificName?: string;
  tagline?: string;
  summary: string;
  imageQuery?: string;

  properties?: Record<string, any>;
  environmental?: Record<string, any>;
  processing?: string[];
  applications?: string[] | Record<string, string>;
  dyeCompatibility?: Record<string, any>;
  varieties?: NodeVariety[];
  breedTypes?: Record<string, string>;
  culturalSignificance?: string;
  crossReferences?: Record<string, string[]>;

  // ── Textile / technique nodes ──
  technique?: Record<string, any>;
  process?: Record<string, string>;
  methods?: any[];
  visualCharacteristics?: Record<string, string>;
  bestFibers?: Record<string, any>;
  plyStructures?: any[];
  twistDirection?: Record<string, any>;
  benefits?: Record<string, string>;
  weightCategories?: any[];
  practicalImpact?: Record<string, string>;
  twistLevels?: any[];
  effectOnFabric?: Record<string, string>;
  textureTypes?: any[];
  considerations?: Record<string, string>;

  // ── Woven / weave-structure nodes ──
  characteristics?: Record<string, string>;
  variations?: any[];
  advantages?: Record<string, string>;
  disadvantages?: Record<string, string>;
  twillAngles?: Record<string, string>;
  satinWeaves?: Record<string, string>;
  loomTypes?: Record<string, string>;
  specialFunctions?: Record<string, string>;

  // ── Knit / stitch-structure nodes ──
  bestYarns?: Record<string, any>;

  /** Catch-all for future / category-specific fields */
  [key: string]: any;
}

// Module-level cache
const nodeCache = new Map<string, NodeData>();
const pendingRequests = new Map<string, Promise<NodeData | null>>();

function getLocalFallbackNode(nodeId: string): NodeData | null {
  const passport = MATERIAL_PASSPORTS[nodeId];
  if (!passport) return null;
  return {
    id: nodeId,
    type: "material",
    category: "fiber",
    portal: nodeId,
    name: nodeId,
    summary: "",
    passport,
  };
}

// Retry helper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelay = 600
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      // Treat 502/503/504 as retryable server errors
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.debug(`[useNodeData] Server ${res.status}, retry ${attempt + 1}/${retries} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = baseDelay * Math.pow(2, attempt);
      console.debug(`[useNodeData] Retry ${attempt + 1}/${retries} for ${url} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

export function useNodeData(nodeId: string | undefined) {
  const [data, setData] = useState<NodeData | null>(
    nodeId ? nodeCache.get(nodeId) ?? null : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nodeId) {
      setData(null);
      setLoading(false);
      return;
    }

    // Check cache
    const cached = nodeCache.get(nodeId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if there's already a pending request for this node
    const pending = pendingRequests.get(nodeId);
    if (pending) {
      setLoading(true);
      pending.then((result) => {
        setData(result);
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    setError(null);

    const fetchPromise = fetchWithRetry(
      getApiUrl(`node/${encodeURIComponent(nodeId)}`),
      { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }
    )
      .then(async (res) => {
        if (res.status === 404) {
          // Not enriched yet — not an error
          return null;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        const json = await res.json();
        return json.node as NodeData;
      })
      .catch((err: unknown): NodeData | null => {
        console.error(`[useNodeData] Error fetching "${nodeId}":`, err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return null;
      })
      .finally(() => {
        pendingRequests.delete(nodeId);
      });

    pendingRequests.set(nodeId, fetchPromise);

    fetchPromise.then((result) => {
      if (result) {
        nodeCache.set(nodeId, result);
      }
      setData(result);
      setLoading(false);
    });
  }, [nodeId]);

  return { data, loading, error };
}

export async function getNodeData(nodeId: string): Promise<NodeData | null> {
  if (!FEATURE_FLAGS.canonicalAdminApi) {
    return getLocalFallbackNode(nodeId);
  }
  const cached = nodeCache.get(nodeId);
  if (cached) return cached;

  const res = await fetchWithRetry(
    getApiUrl(`node/${encodeURIComponent(nodeId)}`),
    { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return (json?.node as NodeData | undefined) ?? null;
}

// ── Seed utility (call once to load a batch) ──
export async function seedNodes(batch: Record<string, any>): Promise<{ success: boolean; count: number; keys: string[] }> {
  if (!FEATURE_FLAGS.canonicalAdminApi) {
    return {
      success: true,
      count: Object.keys(batch).length,
      keys: Object.keys(batch),
    };
  }
  const res = await fetchWithRetry(getApiUrl("seed-nodes"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ nodes: batch }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seed failed ${res.status}: ${text}`);
  }
  return res.json();
}

export function invalidateNodeCache(nodeId?: string) {
  if (nodeId) {
    nodeCache.delete(nodeId);
    pendingRequests.delete(nodeId);
    return;
  }
  nodeCache.clear();
  pendingRequests.clear();
}