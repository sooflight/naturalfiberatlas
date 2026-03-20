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
import { RootLayout } from "./layouts/root-layout";
import { NotFoundPage } from "./pages/not-found";
import { RouteErrorPage } from "./pages/route-error";
import { AdminRedirectPage } from "./pages/admin-redirect";
import { preloadHomeRoute, preloadAboutRoute } from "./route-preload";
import { isAdminEnabled } from "./config/admin-access";
import { getAdminFeatureFlags, type AdminFeatureFlags } from "./config/admin-feature-flags";

const LazyAtlasWorkbenchShell = lazy(() =>
  import("./components/admin/AtlasWorkbenchShell"),
);

function AdminShellFallback() {
  return createElement(
    "div",
    { className: "flex min-h-dvh items-center justify-center bg-[#060606] text-white" },
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
  const to = fiberId ? `/admin/${encodeURIComponent(fiberId)}` : "/admin";
  return createElement(Navigate, { to, replace: true });
}

function debugAdminRoutes(message: string, data: Record<string, unknown>, hypothesisId: string) {
  // #region agent log
  fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "da2446",
    },
    body: JSON.stringify({
      sessionId: "da2446",
      runId: "pre-fix",
      hypothesisId,
      location: "src/app/routes.ts",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

async function loadHomeRoute() {
  const mod = await preloadHomeRoute();
  return { Component: mod.HomePage };
}

async function loadAboutRoute() {
  const mod = await preloadAboutRoute();
  return { Component: mod.AboutPage };
}

function buildAdminRoutes(adminEnabled: boolean, flags: AdminFeatureFlags): RouteObject[] {
  if (!adminEnabled) {
    return [];
  }

  const baseUrl = flags.adminCanonicalUrl || (import.meta.env.DEV ? "" : "");
  const useRedirect = baseUrl && isAdminCanonicalExternal(baseUrl);
  const adminElement = useRedirect
    ? createElement(AdminRedirectPage, { baseUrl })
    : createElement(AdminShellElement);

  debugAdminRoutes(
    "buildAdminRoutes",
    {
      adminEnabled,
      adminCanonicalUrl: baseUrl,
      useRedirect,
      advancedImagesRoute: flags.advancedImagesRoute,
    },
    "H1",
  );

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
        { index: true, lazy: loadHomeRoute, errorElement: createElement(RouteErrorPage) },
        { path: "about", lazy: loadAboutRoute, errorElement: createElement(RouteErrorPage) },
        ...buildAdminRoutes(adminEnabled, flags),
        { path: "*", Component: NotFoundPage, errorElement: createElement(RouteErrorPage) },
      ],
    },
  ];
}

const adminEnabled = isAdminEnabled();

export const router = createBrowserRouter(buildAppRoutes(adminEnabled));
