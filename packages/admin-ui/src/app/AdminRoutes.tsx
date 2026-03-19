import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import { createAdminRouteConfig } from "../routing/routeConfig";

export function createAdminRoutes(
  AdminScreen: ComponentType,
): RouteObject[] {
  return createAdminRouteConfig(AdminScreen);
}
