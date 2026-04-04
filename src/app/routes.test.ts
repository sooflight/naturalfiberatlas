import { describe, expect, it } from "vitest";
import { buildAppRoutes } from "./routes";
import type { AdminFeatureFlags } from "./config/admin-feature-flags";

function getChildPaths(adminEnabled: boolean): string[] {
  const routes = buildAppRoutes(adminEnabled);
  const root = routes[0];
  const children = root.children ?? [];

  return children
    .map((route) => ("path" in route ? route.path : undefined))
    .filter((path): path is string => typeof path === "string");
}

function makeFlags(overrides: Partial<AdminFeatureFlags> = {}): AdminFeatureFlags {
  return {
    embeddedActions: true,
    advancedImagesRoute: true,
    rapidScout: true,
    iiif: true,
    transformOps: true,
    imagesUiSource: "imported",
    workbenchV2: true,
    adminUnifiedShell: false,
    adminCanonicalUrl: "http://localhost:3000",
    ...overrides,
  };
}

function getRouteByPath(adminEnabled: boolean, path: string, flags: AdminFeatureFlags) {
  const routes = buildAppRoutes(adminEnabled, flags);
  const root = routes[0];
  const children = root.children ?? [];
  return children.find((route) => "path" in route && route.path === path);
}

function getIndexRoute(adminEnabled: boolean, flags: AdminFeatureFlags) {
  const routes = buildAppRoutes(adminEnabled, flags);
  const root = routes[0];
  const children = root.children ?? [];
  return children.find((route) => "index" in route && route.index);
}

describe("route access controls", () => {
  it("omits admin routes when admin is disabled", () => {
    const paths = getChildPaths(false);

    expect(paths).not.toContain("admin");
    expect(paths).not.toContain("admin/:fiberId");
    expect(paths).not.toContain("admin/images");
    expect(paths).not.toContain("workbench");
    expect(paths).not.toContain("db");
    expect(paths).not.toContain("canvas");
  });

  it("includes admin routes when admin is enabled", () => {
    const paths = getChildPaths(true);

    expect(paths).toContain("admin");
    expect(paths).toContain("admin/:fiberId");
    expect(paths).toContain("admin/images");
    expect(paths).toContain("workbench");
    expect(paths).toContain("db");
    expect(paths).toContain("canvas");
  });

  it("uses redirect element for all admin routes to canonical admin", () => {
    const flags = makeFlags();
    const workbenchRoute = getRouteByPath(true, "workbench", flags);
    const adminImagesRoute = getRouteByPath(true, "admin/images", flags);
    const adminRoute = getRouteByPath(true, "admin", flags);

    expect(workbenchRoute).toBeDefined();
    expect(workbenchRoute && "element" in workbenchRoute).toBe(true);
    expect(workbenchRoute && "lazy" in workbenchRoute ? workbenchRoute.lazy : undefined).toBeUndefined();

    expect(adminImagesRoute).toBeDefined();
    expect(adminImagesRoute && "element" in adminImagesRoute).toBe(true);

    expect(adminRoute).toBeDefined();
    expect(adminRoute && "element" in adminRoute).toBe(true);
  });

  it("redirects legacy /db alias to /admin/images", () => {
    const route = getRouteByPath(true, "db", makeFlags());
    expect(route).toBeDefined();
    expect(route && "lazy" in route ? route.lazy : undefined).toBeUndefined();
  });

  it("includes public fiber profile path segment", () => {
    const paths = getChildPaths(false);
    expect(paths).toContain("fiber/:fiberId");
  });

  it("lazy-loads the index route home page", async () => {
    const route = getIndexRoute(false, makeFlags());
    expect(route).toBeDefined();
    expect(route && "Component" in route ? route.Component : undefined).toBeUndefined();
    if (!route || !("lazy" in route) || typeof route.lazy !== "function") {
      throw new Error("expected index route to be lazy loaded");
    }
    const resolved = await route.lazy();
    expect(resolved).toHaveProperty("Component");
    expect(resolved.Component?.name).toBe("HomePage");
  });
});
