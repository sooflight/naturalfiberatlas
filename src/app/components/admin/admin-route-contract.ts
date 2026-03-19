export type AdminRouteMode = "workspace" | "images";

export interface AdminRouteState {
  mode: AdminRouteMode;
  entityId: string | null;
  isLegacyAlias: boolean;
}

export const ADMIN_TABS = [
  { id: "images", label: "ImageBase" },
  { id: "profilebase", label: "Profile Base" },
  { id: "settings", label: "Settings" },
] as const;

export type TabId = (typeof ADMIN_TABS)[number]["id"];

function decodeAdminEntityId(entityId: string): string | null {
  try {
    return decodeURIComponent(entityId);
  } catch {
    return null;
  }
}

/** True when pathname is the base admin or ImageBase route (no deep link) */
export function isAdminBaseOrImagesRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/" || pathname === "/admin/images";
}

/** Resolves profile-base, editor, node-base deep links for AtlasWorkbenchShell URL sync */
export function resolveAdminShellRouteState(pathname: string): { tab: TabId; entityId?: string } | null {
  const profileBaseMatch = pathname.match(/^\/admin\/profile-base\/([^/]+)$/);
  if (profileBaseMatch) {
    const entityId = decodeAdminEntityId(profileBaseMatch[1]);
    if (entityId == null) return null;
    return { tab: "profilebase", entityId };
  }
  const legacyEditorMatch = pathname.match(/^\/admin\/editor\/([^/]+)$/);
  if (legacyEditorMatch) {
    const entityId = decodeAdminEntityId(legacyEditorMatch[1]);
    if (entityId == null) return null;
    return { tab: "profilebase", entityId };
  }
  const legacyNodeBaseMatch = pathname.match(/^\/admin\/node-base\/([^/]+)$/);
  if (legacyNodeBaseMatch) {
    const entityId = decodeAdminEntityId(legacyNodeBaseMatch[1]);
    if (entityId == null) return null;
    return { tab: "profilebase", entityId };
  }
  return null;
}

export function resolveAdminRouteState(pathname: string): AdminRouteState | null {
  if (pathname === "/admin" || pathname === "/admin/") {
    return { mode: "images", entityId: null, isLegacyAlias: false };
  }
  if (pathname === "/admin/images") {
    return { mode: "images", entityId: null, isLegacyAlias: false };
  }

  const matchEditor = pathname.match(/^\/admin\/([^/]+)$/);
  if (matchEditor && matchEditor[1] !== "images") {
    return {
      mode: "workspace",
      entityId: decodeURIComponent(matchEditor[1]),
      isLegacyAlias: false,
    };
  }

  if (pathname === "/workbench") {
    return { mode: "workspace", entityId: null, isLegacyAlias: true };
  }

  if (pathname === "/db" || pathname === "/canvas") {
    return { mode: "images", entityId: null, isLegacyAlias: true };
  }

  return null;
}

