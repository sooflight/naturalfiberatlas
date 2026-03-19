export type ScoutProvider =
  | "all"
  | "cloudinary"
  | "brave"
  | "unsplash"
  | "pexels"
  | "openverse"
  | "europeana"
  | "wikimedia"
  | "pinterest";

export interface ScoutResult {
  url: string;
  provider: ScoutProvider;
  title: string;
  attribution?: string;
  rights?: string;
  licenseUrl?: string;
  sourceManifest?: string;
  tileSource?: string;
  width?: number;
  height?: number;
  thumbUrl?: string;
}

export interface ScoutRunState {
  runId: number;
  query: string;
  provider: ScoutProvider;
}

export function canonicalizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    const host = u.hostname.replace(/^www\./, "");
    u.hostname = host;
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Merges existing and incoming scout results, deduping by canonical URL.
 * When an incoming item's canonical URL already exists, the incoming item
 * replaces the existing one (incoming wins).
 */
export function mergeUniqueResults(
  existing: ScoutResult[],
  incoming: ScoutResult[],
): ScoutResult[] {
  const seen = new Set<string>();
  const result: ScoutResult[] = [];

  for (const r of existing) {
    const key = canonicalizeImageUrl(r.url);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(r);
    }
  }

  for (const r of incoming) {
    const key = canonicalizeImageUrl(r.url);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(r);
    } else {
      const idx = result.findIndex((x) => canonicalizeImageUrl(x.url) === key);
      if (idx >= 0) result[idx] = r;
    }
  }

  return result;
}

export function createScoutRunState(prev?: ScoutRunState): ScoutRunState {
  if (!prev) {
    return { runId: 1, query: "", provider: "all" };
  }
  return {
    runId: prev.runId + 1,
    query: prev.query,
    provider: prev.provider,
  };
}

export interface RunScoutSearchOpts {
  query: string;
  provider: ScoutProvider;
  adapters: Record<string, (opts: RunScoutSearchOpts) => Promise<ScoutResult[]>>;
  /** Page number for pagination (1-based). Default 1. */
  page?: number;
}

export interface RunScoutSearchResult {
  results: ScoutResult[];
  status: "partial" | "error" | "ready";
  exhausted: boolean;
  providerErrors: Record<string, string>;
}

export async function runScoutSearch(opts: RunScoutSearchOpts): Promise<RunScoutSearchResult> {
  const providers =
    opts.provider === "all" ? Object.keys(opts.adapters) : [opts.provider];
  const providerErrors: Record<string, string> = {};
  let results: ScoutResult[] = [];
  let exhausted = true;

  for (const id of providers) {
    const adapter = opts.adapters[id];
    if (typeof adapter !== "function") {
      providerErrors[id] = "adapter not configured";
      continue;
    }
    try {
      const batch = await adapter(opts);
      const arr = Array.isArray(batch) ? batch : [];
      if (arr.length > 0) exhausted = false;
      results = mergeUniqueResults(results, arr);
    } catch (err: unknown) {
      providerErrors[id] =
        err instanceof Error ? err.message : "provider failed";
    }
  }

  const hasErrors = Object.keys(providerErrors).length > 0;
  const status =
    hasErrors && results.length > 0 ? "partial" : hasErrors ? "error" : "ready";
  return { results, status, exhausted, providerErrors };
}
