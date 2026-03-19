/**
 * Telemetry for tracking data source usage (API vs JSON/KV)
 * Helps monitor migration progress and performance
 */

type DataSource = "api" | "kv" | "json" | "cache";

interface TelemetryEvent {
  source: DataSource;
  action: "read" | "write" | "fallback";
  slug?: string;
  duration: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

interface DataSourceStats {
  api: { reads: number; writes: number; errors: number };
  kv: { reads: number; writes: number; errors: number };
  json: { reads: number; writes: number; errors: number };
  cache: { hits: number; misses: number };
}

const STORAGE_KEY = "data_source_telemetry_events";
const MAX_EVENTS = 1000;

let stats: DataSourceStats = {
  api: { reads: 0, writes: 0, errors: 0 },
  kv: { reads: 0, writes: 0, errors: 0 },
  json: { reads: 0, writes: 0, errors: 0 },
  cache: { hits: 0, misses: 0 },
};

/**
 * Track a data source event
 */
export function trackDataSource(
  source: DataSource,
  action: TelemetryEvent["action"],
  options: {
    slug?: string;
    duration?: number;
    success?: boolean;
    error?: string;
  } = {}
): void {
  const event: TelemetryEvent = {
    source,
    action,
    slug: options.slug,
    duration: options.duration ?? 0,
    success: options.success ?? true,
    timestamp: Date.now(),
    error: options.error,
  };

  // Update in-memory stats
  updateStats(source, action, event.success);

  // Store event in localStorage for debugging
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      ) as TelemetryEvent[];
      const updated = [...existing, event].slice(-MAX_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }

  // Log in development
  if (import.meta.env.DEV) {
    const status = event.success ? "✓" : "✗";
    console.log(`[Telemetry] ${status} ${source}.${action}${options.slug ? ` (${options.slug})` : ""} ${options.duration ? `${options.duration}ms` : ""}`);
  }
}

/**
 * Track a cache hit/miss
 */
export function trackCacheHit(slug: string, duration: number): void {
  stats.cache.hits++;
  trackDataSource("cache", "read", { slug, duration, success: true });
}

export function trackCacheMiss(slug?: string): void {
  stats.cache.misses++;
  if (slug) {
    trackDataSource("cache", "read", { slug, success: false });
  }
}

/**
 * Get current stats
 */
export function getDataSourceStats(): DataSourceStats {
  return { ...stats };
}

/**
 * Get total API usage percentage
 */
export function getApiUsagePercentage(): number {
  const total = stats.api.reads + stats.kv.reads + stats.json.reads;
  if (total === 0) return 0;
  return Math.round((stats.api.reads / total) * 100);
}

/**
 * Get cache hit rate
 */
export function getCacheHitRate(): number {
  const total = stats.cache.hits + stats.cache.misses;
  if (total === 0) return 0;
  return Math.round((stats.cache.hits / total) * 100);
}

/**
 * Get recent events from localStorage
 */
export function getRecentEvents(limit = 50): TelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const events = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    ) as TelemetryEvent[];
    return events.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Clear telemetry data
 */
export function clearTelemetry(): void {
  stats = {
    api: { reads: 0, writes: 0, errors: 0 },
    kv: { reads: 0, writes: 0, errors: 0 },
    json: { reads: 0, writes: 0, errors: 0 },
    cache: { hits: 0, misses: 0 },
  };
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Private helper
function updateStats(
  source: DataSource,
  action: TelemetryEvent["action"],
  success: boolean
): void {
  if (source === "cache") return;

  if (action === "read") {
    if (success) {
      stats[source].reads++;
    } else {
      stats[source].errors++;
    }
  } else if (action === "write") {
    if (success) {
      stats[source].writes++;
    } else {
      stats[source].errors++;
    }
  }
}

// Export for debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).dataSourceTelemetry = {
    trackDataSource,
    getDataSourceStats,
    getApiUsagePercentage,
    getCacheHitRate,
    getRecentEvents,
    clearTelemetry,
  };
}
