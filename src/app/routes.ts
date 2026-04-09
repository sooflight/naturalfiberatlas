/**
 * routes.ts — React Router Data mode configuration.
 *
 * All routes are wrapped by the RootLayout which provides shared
 * context providers (AtlasDataProvider, ImagePipelineProvider) and
 * the admin overlay layer.
 *
 * C6: admin deep-links are served via /workbench and /admin/:fiberId.
 */

import { createBrowserRouter, Navigate, useParams, type RouteObject } from "react-router";
import { createElement, lazy, Suspense } from "react";
import { FiberRouteOutlet } from "./pages/fiber-profile-route";
import { RootLayout } from "./layouts/root-layout";
import { NotFoundPage } from "./pages/not-found";
import { RouteErrorPage } from "./pages/route-error";
import { AdminRedirectPage } from "./pages/admin-redirect";
import { preloadHomeRoute, preloadAboutRoute } from "./route-preload";
import { isAdminEnabled } from "./config/admin-access";
import { getAdminFeatureFlags, type AdminFeatureFlags } from "./config/admin-feature-flags";
import { resolveCanonicalFiberId } from "./data/fiber-id-redirects";

const LazyAtlasWorkbenchShell = lazy(() =>
  import("./components/admin/AtlasWorkbenchShell"),
);

function AdminShellFallback() {
  return createElement(
    "div",
    { className: "flex min-h-atlas-vvh items-center justify-center bg-[#060606] text-white" },
    createElement(
      "div",
      { className: "flex flex-col items-center gap-4" },
      createElement("div", {
        className: "w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin",
      }),
      createElement("p", { className: "text-sm text-neutral-400" }, "Loading admin..."),
    ),
  );
}

function AdminShellElement() {
  return createElement(
    Suspense,
    { fallback: createElement(AdminShellFallback) },
    createElement(LazyAtlasWorkbenchShell),
  );
}

function isAdminCanonicalExternal(baseUrl: string): boolean {
  if (!baseUrl || baseUrl.trim() === "") return false;
  try {
    const base = new URL(baseUrl);
    const current = new URL(window.location.href);
    return base.origin !== current.origin;
  } catch {
    return false;
  }
}

function WorkbenchFiberRedirect() {
  const { fiberId } = useParams<{ fiberId: string }>();
  const raw = fiberId ? decodeURIComponent(fiberId) : "";
  const canonical = raw ? resolveCanonicalFiberId(raw) : "";
  const to = canonical ? `/admin/${encodeURIComponent(canonical)}` : "/admin";
  return createElement(Navigate, { to, replace: true });
}

/** Index leaf under atlas layout — content lives in parent `HomeAtlasLayout`; this satisfies RR7 leaf route contract */
function AtlasIndexLeaf() {
  return null;
}

async function loadHomeRoute() {
  const mod = await preloadHomeRoute();
  return { Component: mod.HomeAtlasLayout };
}

async function loadAboutRoute() {
  const mod = await preloadAboutRoute();
  return { Component: mod.AboutPage };
}

/** Shown during initial hydration while lazy public routes load (silences Router HydrateFallback warning). */
const publicRouteHydrateFallback = createElement(
  "div",
  {
    className: "min-h-atlas-vvh bg-[#111111] flex items-center justify-center",
    role: "status",
    "aria-busy": true,
    "aria-label": "Loading Natural Fiber Atlas",
  },
  createElement("div", {
    className: "h-9 w-9 rounded-full border-2 border-white/15 border-t-white/55 animate-spin",
    "aria-hidden": true,
  }),
);

function buildAdminRoutes(adminEnabled: boolean, flags: AdminFeatureFlags): RouteObject[] {
  if (!adminEnabled) {
    return [];
  }

  const baseUrl = flags.adminCanonicalUrl || (import.meta.env.DEV ? "" : "");
  const useRedirect = baseUrl && isAdminCanonicalExternal(baseUrl);
  const adminElement = useRedirect
    ? createElement(AdminRedirectPage, { baseUrl })
    : createElement(AdminShellElement);

  const adminRoutes: RouteObject[] = [
    { path: "admin", element: adminElement },
    { path: "admin/:fiberId", element: adminElement },
    { path: "admin/profile-base/:nodeId", element: adminElement },
    { path: "admin/editor/:nodeId", element: adminElement },
    { path: "admin/node-base/:nodeId", element: adminElement },
    { path: "workbench", element: useRedirect ? adminElement : createElement(Navigate, { to: "/admin", replace: true }) },
    { path: "workbench/:fiberId", element: useRedirect ? adminElement : createElement(WorkbenchFiberRedirect) },
  ];

  const advancedRoutes = flags.advancedImagesRoute
    ? [
        { path: "admin/images", element: adminElement },
        { path: "db", element: createElement(Navigate, { to: "/admin/images", replace: true }) },
        { path: "canvas", element: createElement(Navigate, { to: "/admin/images", replace: true }) },
      ]
    : [];

  return [...adminRoutes, ...advancedRoutes].map((route) => ({
    ...route,
    errorElement: createElement(RouteErrorPage),
  }));
}

export function buildAppRoutes(
  adminEnabled: boolean,
  flags: AdminFeatureFlags = getAdminFeatureFlags(),
): RouteObject[] {
  return [
    {
      path: "/",
      Component: RootLayout,
      errorElement: createElement(RouteErrorPage),
      children: [
        {
          lazy: loadHomeRoute,
          hydrateFallbackElement: publicRouteHydrateFallback,
          errorElement: createElement(RouteErrorPage),
          children: [
            { index: true, Component: AtlasIndexLeaf },
            {
              path: "fiber/:fiberId",
              Component: FiberRouteOutlet,
              errorElement: createElement(RouteErrorPage),
            },
          ],
        },
        {
          path: "about",
          lazy: loadAboutRoute,
          hydrateFallbackElement: publicRouteHydrateFallback,
          errorElement: createElement(RouteErrorPage),
        },
        ...buildAdminRoutes(adminEnabled, flags),
        { path: "*", Component: NotFoundPage, errorElement: createElement(RouteErrorPage) },
      ],
    },
  ];
}

const adminEnabled = isAdminEnabled();

export const router = createBrowserRouter(buildAppRoutes(adminEnabled));
