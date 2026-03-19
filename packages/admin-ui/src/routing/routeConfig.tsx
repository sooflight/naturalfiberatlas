import { createElement, type ComponentType } from "react";
import { Navigate, type RouteObject } from "react-router";

export function createAdminRouteConfig(
  AdminScreen: ComponentType,
): RouteObject[] {
  return [
    {
      path: "/",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/admin",
      Component: AdminScreen,
    },
    {
      path: "/admin/profile-base/:nodeId",
      Component: AdminScreen,
    },
    {
      path: "*",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
  ];
}

export function createAdminLegacyAliasRoutes(
  AliasRedirectScreen: ComponentType,
): RouteObject[] {
  return [
    {
      path: "/workbench",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/workbench/profile-base/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/workbench/profile-base",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/workbench/editor/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/workbench/node-base/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/workbench/editor",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/workbench/node-base",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/db",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/db/profile-base/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/db/profile-base",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/db/editor/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/db/node-base/:nodeId",
      Component: AliasRedirectScreen,
    },
    {
      path: "/db/editor",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/db/node-base",
      element: createElement(Navigate, { to: "/admin", replace: true }),
    },
    {
      path: "/canvas/:nodeId",
      Component: AliasRedirectScreen,
    },
  ];
}
