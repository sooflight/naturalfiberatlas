import { describe, it, expect } from "vitest";
import { isPublicBrowseCatalogProfileId } from "./public-catalog-gate";

describe("isPublicBrowseCatalogProfileId", () => {
  it("excludes published fibers missing from bundled global fiber order", () => {
    expect(isPublicBrowseCatalogProfileId("bamboo", "published")).toBe(false);
    expect(isPublicBrowseCatalogProfileId("charmeuse", "published")).toBe(false);
  });

  it("excludes passport-archived rows even when fiber status is published", () => {
    expect(isPublicBrowseCatalogProfileId("cable-knit", "published")).toBe(false);
    expect(isPublicBrowseCatalogProfileId("flannel", "published")).toBe(false);
  });

  it("includes a known ordered live profile", () => {
    expect(isPublicBrowseCatalogProfileId("hemp", "published")).toBe(true);
  });

  it("excludes archived fibers", () => {
    expect(isPublicBrowseCatalogProfileId("cotton", "archived")).toBe(false);
  });
});
