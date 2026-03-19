export interface AdminFeatureFlags {
  embeddedActions: boolean;
  advancedImagesRoute: boolean;
  rapidScout: boolean;
  iiif: boolean;
  transformOps: boolean;
  imagesUiSource: "imported" | "legacy";
  workbenchV2: boolean;
  adminUnifiedShell: boolean;
  /** Base URL for canonical admin. When set and different origin, host /admin* redirects here. Empty = serve admin in-app (e.g. localhost:3000/admin). */
  adminCanonicalUrl: string;
}

function isTrue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function getImagesUiSource(value: string | undefined): "imported" | "legacy" {
  return value === "legacy" ? "legacy" : "imported";
}

export function getAdminFeatureFlags(
  env: ImportMetaEnv = import.meta.env,
): AdminFeatureFlags {
  const adminCanonicalUrl =
    env.VITE_ADMIN_CANONICAL_URL ?? "";
  return {
    embeddedActions: isTrue(env.VITE_ADMIN_EMBEDDED_ACTIONS, true),
    advancedImagesRoute: isTrue(env.VITE_ADMIN_ADVANCED_IMAGES_ROUTE, true),
    rapidScout: isTrue(env.VITE_ADMIN_RAPID_SCOUT, true),
    iiif: isTrue(env.VITE_ADMIN_IIIF, true),
    transformOps: isTrue(env.VITE_ADMIN_TRANSFORM_OPS, true),
    imagesUiSource: getImagesUiSource(env.VITE_ADMIN_IMAGES_UI_SOURCE),
    workbenchV2: isTrue(env.VITE_ADMIN_WORKBENCH_V2, true),
    adminUnifiedShell: isTrue(env.VITE_ADMIN_UNIFIED_SHELL, false),
    adminCanonicalUrl,
  };
}

