/**
 * Tiered loading hints for profile grid cells so earlier atlas indices win
 * browser scheduling without flooding the network (caps + column-aware rows).
 */

export type GridImageNetworkProfile = "normal" | "slow" | "data-saver";

/**
 * Mirrors the coarse buckets in `getWarmupPolicy` so grid images stay conservative
 * on save-data / 2G without importing the full warmup module.
 */
export function getGridImageNetworkProfile(): GridImageNetworkProfile {
  if (typeof navigator === "undefined") {
    return "normal";
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType ?? "";

  if (connection?.saveData || /(^2g$|slow-2g)/.test(effectiveType)) {
    return "data-saver";
  }
  if (effectiveType === "3g") {
    return "slow";
  }
  return "normal";
}

export function getGridProfileImageLoadingFlags(
  index: number,
  columnCount: number,
  networkProfile: GridImageNetworkProfile = getGridImageNetworkProfile(),
): { eagerLoading: boolean; fetchPriorityHigh: boolean } {
  const cols = Math.max(1, columnCount);

  switch (networkProfile) {
    case "data-saver":
      return {
        eagerLoading: index < Math.min(6, cols * 2),
        fetchPriorityHigh: index < Math.min(2, cols),
      };
    case "slow":
      return {
        eagerLoading: index < Math.min(18, Math.max(8, cols * 3)),
        fetchPriorityHigh: index < Math.max(4, cols),
      };
    case "normal":
    default: {
      const highFetchCutoff = Math.max(8, cols * 2);
      const eagerCutoff = Math.min(36, Math.max(16, cols * 5));
      return {
        eagerLoading: index < eagerCutoff,
        fetchPriorityHigh: index < highFetchCutoff,
      };
    }
  }
}
