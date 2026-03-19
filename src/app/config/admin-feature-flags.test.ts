import { describe, expect, it } from "vitest";
import { getAdminFeatureFlags } from "./admin-feature-flags";

describe("getAdminFeatureFlags", () => {
  it("defaults to enabled when env values are absent", () => {
    const flags = getAdminFeatureFlags();
    expect(flags.embeddedActions).toBe(true);
    expect(flags.advancedImagesRoute).toBe(true);
    expect(flags.rapidScout).toBe(true);
    expect(flags.iiif).toBe(true);
    expect(flags.transformOps).toBe(true);
    expect(flags.imagesUiSource).toBe("imported");
    expect(flags.workbenchV2).toBe(true);
    expect(flags.adminUnifiedShell).toBe(false);
  });

  it("uses legacy admin images ui source when explicitly configured", () => {
    const env = {
      ...import.meta.env,
      VITE_ADMIN_IMAGES_UI_SOURCE: "legacy",
    };
    const flags = getAdminFeatureFlags(env);
    expect(flags.imagesUiSource).toBe("legacy");
  });

  it("falls back to imported source for invalid image ui source values", () => {
    const env = {
      ...import.meta.env,
      VITE_ADMIN_IMAGES_UI_SOURCE: "unexpected",
    };
    const flags = getAdminFeatureFlags(env);
    expect(flags.imagesUiSource).toBe("imported");
  });

  it("supports disabling the unified workbench rollout", () => {
    const env = {
      ...import.meta.env,
      VITE_ADMIN_WORKBENCH_V2: "false",
    };
    const flags = getAdminFeatureFlags(env);
    expect(flags.workbenchV2).toBe(false);
  });

  it("supports enabling unified shell rollout independently", () => {
    const env = {
      ...import.meta.env,
      VITE_ADMIN_WORKBENCH_V2: "false",
      VITE_ADMIN_UNIFIED_SHELL: "true",
    };
    const flags = getAdminFeatureFlags(env);
    expect(flags.workbenchV2).toBe(false);
    expect(flags.adminUnifiedShell).toBe(true);
  });

  it("provides adminCanonicalUrl for redirect target", () => {
    const flags = getAdminFeatureFlags();
    expect(flags.adminCanonicalUrl).toBeDefined();
  });

  it("uses VITE_ADMIN_CANONICAL_URL when set", () => {
    const env = {
      ...import.meta.env,
      VITE_ADMIN_CANONICAL_URL: "https://admin.example.com",
    };
    const flags = getAdminFeatureFlags(env);
    expect(flags.adminCanonicalUrl).toBe("https://admin.example.com");
  });
});
