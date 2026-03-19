import { describe, expect, it } from "vitest";
import { resolveAdminRouteState, isAdminBaseOrImagesRoute } from "./admin-route-contract";
import { resolveAdminShellContract } from "./runtime/admin-shell-contract";
import { buildCanonicalAdminRedirectUrl } from "../../pages/admin-redirect";

describe("buildCanonicalAdminRedirectUrl (redirect semantics)", () => {
  const baseUrl = "http://localhost:5173";

  it("preserves path for deep links", () => {
    expect(buildCanonicalAdminRedirectUrl(baseUrl, "/admin")).toBe("http://localhost:5173/admin");
    expect(buildCanonicalAdminRedirectUrl(baseUrl, "/admin/hemp")).toBe("http://localhost:5173/admin/hemp");
    expect(buildCanonicalAdminRedirectUrl(baseUrl, "/admin/images")).toBe("http://localhost:5173/admin/images");
    expect(buildCanonicalAdminRedirectUrl(baseUrl, "/workbench")).toBe("http://localhost:5173/workbench");
  });

  it("preserves query string", () => {
    expect(buildCanonicalAdminRedirectUrl(baseUrl, "/admin", "?foo=bar")).toBe(
      "http://localhost:5173/admin?foo=bar",
    );
  });

  it("strips trailing slash from baseUrl", () => {
    expect(buildCanonicalAdminRedirectUrl("http://localhost:5173/", "/admin")).toBe(
      "http://localhost:5173/admin",
    );
  });
});

describe("isAdminBaseOrImagesRoute", () => {
  it("returns true for base admin and ImageBase routes", () => {
    expect(isAdminBaseOrImagesRoute("/admin")).toBe(true);
    expect(isAdminBaseOrImagesRoute("/admin/")).toBe(true);
    expect(isAdminBaseOrImagesRoute("/admin/images")).toBe(true);
  });
  it("returns false for deep links and other paths", () => {
    expect(isAdminBaseOrImagesRoute("/admin/profile-base/hemp")).toBe(false);
    expect(isAdminBaseOrImagesRoute("/admin/hemp")).toBe(false);
    expect(isAdminBaseOrImagesRoute("/")).toBe(false);
  });
});

describe("resolveAdminRouteState", () => {
  it("parses canonical and legacy routes", () => {
    expect(resolveAdminRouteState("/admin")?.mode).toBe("images");
    expect(resolveAdminRouteState("/admin/")?.mode).toBe("images");
    expect(resolveAdminRouteState("/admin/images")?.mode).toBe("images");
    expect(resolveAdminRouteState("/admin/hemp")?.entityId).toBe("hemp");
    expect(resolveAdminRouteState("/workbench")?.mode).toBe("workspace");
    expect(resolveAdminRouteState("/db")?.mode).toBe("images");
  });
});

describe("resolveAdminShellContract", () => {
  it("builds consistent shell metadata for core admin routes", () => {
    const workspace = resolveAdminShellContract("/workbench");
    const detail = resolveAdminShellContract("/admin/hemp");
    const admin = resolveAdminShellContract("/admin");
    const images = resolveAdminShellContract("/admin/images");

    expect(admin?.capabilityBadges).toContain("images");

    expect(workspace?.headerActions).toEqual({
      showGlobalSearch: true,
      showCommandPalette: true,
      showBackToAdmin: false,
    });
    expect(detail?.headerActions).toEqual({
      showGlobalSearch: true,
      showCommandPalette: true,
      showBackToAdmin: false,
    });
    expect(images?.headerActions).toEqual({
      showGlobalSearch: true,
      showCommandPalette: true,
      showBackToAdmin: true,
    });

    expect(workspace?.capabilityBadges).toContain("workspace");
    expect(detail?.breadcrumbs[1]?.label).toBe("hemp");
    expect(images?.capabilityBadges).toContain("images");
  });
});
