/**
 * useFiberDetail — Returns the full FiberProfile for a given ID.
 *
 * Reads from the AtlasDataContext (which wraps the AtlasDataSource with
 * useSyncExternalStore reactivity). Admin edits trigger version bumps,
 * which re-render the context consumers, which re-call this hook with
 * fresh data.
 *
 * Falls back to the dataSource singleton for non-reactive paths
 * (e.g. module-init code, HMR boundary resets where the context
 * is temporarily unavailable).
 */

import { fibers, type FiberProfile } from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { useAtlasData } from "../context/atlas-data-context";

/* ── Module-level cache: id → full profile (fallback for non-reactive paths) ── */
const detailCache = new Map<string, FiberProfile>();

/* Populate immediately at module load — data is already in-bundle */
for (const f of fibers) {
  detailCache.set(f.id, f);
}

/**
 * Returns the full FiberProfile for the given ID, or null if not found.
 * Reads through the reactive context so admin edits are reflected live.
 */
export function useFiberDetail(id: string | null): FiberProfile | null {
  /* Hook must be called unconditionally (Rules of Hooks) */
  const { getFiberById } = useAtlasData();
  if (!id) return null;
  return getFiberById(id) ?? detailCache.get(id) ?? null;
}

/**
 * No-op retained for API compatibility.
 * The cache is populated at module init; nothing to prefetch.
 */
export function prefetchFiberDetails(): void {
  /* intentional no-op */
}