/**
 * Feature flags for admin runtime behavior switches.
 * Re-exports from admin package for backward compatibility.
 */

export const FEATURE_FLAGS: Record<
  "logDataSource" | "canonicalAdminApi",
  boolean
> = {
  logDataSource: import.meta.env.VITE_LOG_DATA_SOURCE === "true",
  canonicalAdminApi: import.meta.env.VITE_CANONICAL_ADMIN_API === "true",
};

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}
