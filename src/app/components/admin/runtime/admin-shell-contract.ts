import { resolveAdminRouteState, type AdminRouteState } from "../admin-route-contract";

export type AdminCapabilityBadge =
  | "workspace"
  | "images"
  | "detail"
  | "legacy-alias";

export interface AdminBreadcrumb {
  label: string;
  href: string;
}

export interface AdminShellHeaderActions {
  showGlobalSearch: boolean;
  showCommandPalette: boolean;
  showBackToAdmin: boolean;
}

export interface AdminShellContract {
  route: AdminRouteState;
  title: string;
  breadcrumbs: AdminBreadcrumb[];
  capabilityBadges: AdminCapabilityBadge[];
  headerActions: AdminShellHeaderActions;
}

function buildBreadcrumbs(route: AdminRouteState): AdminBreadcrumb[] {
  const root: AdminBreadcrumb = { label: "Admin", href: "/workbench" };
  if (route.mode === "images") {
    return [root, { label: "Images", href: "/admin/images" }];
  }
  if (route.entityId) {
    return [root, { label: route.entityId, href: `/admin/${encodeURIComponent(route.entityId)}` }];
  }
  return [root];
}

function buildCapabilityBadges(route: AdminRouteState): AdminCapabilityBadge[] {
  const badges: AdminCapabilityBadge[] = [route.mode];
  if (route.entityId) badges.push("detail");
  if (route.isLegacyAlias) badges.push("legacy-alias");
  return badges;
}

function buildTitle(route: AdminRouteState): string {
  if (route.mode === "images") {
    return "Admin Images";
  }
  if (route.entityId) {
    return `Admin ${route.entityId}`;
  }
  return "Admin Workspace";
}

export function resolveAdminShellContract(pathname: string): AdminShellContract | null {
  const route = resolveAdminRouteState(pathname);
  if (!route) return null;

  return {
    route,
    title: buildTitle(route),
    breadcrumbs: buildBreadcrumbs(route),
    capabilityBadges: buildCapabilityBadges(route),
    headerActions: {
      showGlobalSearch: true,
      showCommandPalette: true,
      showBackToAdmin: route.mode === "images",
    },
  };
}
