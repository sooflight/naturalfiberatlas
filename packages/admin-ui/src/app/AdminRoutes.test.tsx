import { describe, expect, it } from "vitest";
import { createElement } from "react";
import {
  createAdminLegacyAliasRoutes,
  createAdminRouteConfig,
} from "../routing/routeConfig";

describe("createAdminRouteConfig", () => {
  it("includes core admin routes", () => {
    const AdminScreen = () => createElement("div", null, "admin");
    const routes = createAdminRouteConfig(AdminScreen);
    const paths = routes.map((route) => route.path);

    expect(paths).toContain("/");
    expect(paths).toContain("/admin");
    expect(paths).toContain("/admin/profile-base/:nodeId");
    expect(paths).toContain("*");
  });
});

describe("createAdminLegacyAliasRoutes", () => {
  it("includes workbench and db aliases", () => {
    const RedirectScreen = () => createElement("div", null, "redirect");
    const routes = createAdminLegacyAliasRoutes(RedirectScreen);
    const paths = routes.map((route) => route.path);

    expect(paths).toContain("/workbench");
    expect(paths).toContain("/workbench/profile-base/:nodeId");
    expect(paths).toContain("/db");
    expect(paths).toContain("/db/profile-base/:nodeId");
    expect(paths).toContain("/canvas/:nodeId");
  });
});
