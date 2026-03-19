export const ADMIN_UI_PACKAGE_VERSION = "0.0.0-dev";
export type { AdminHostConfig } from "./contracts/AdminHostConfig";
export { AdminHostProvider } from "./providers/AdminHostProvider";
export { useAdminHost } from "./hooks/useAdminHost";
export { AdminApp } from "./app/AdminApp";
export { AdminWorkbenchScreen } from "./app/AdminWorkbenchScreen";
export { createAdminRoutes } from "./app/AdminRoutes";
export { createAdminRouteConfig } from "./routing/routeConfig";
export { createAdminLegacyAliasRoutes } from "./routing/routeConfig";
