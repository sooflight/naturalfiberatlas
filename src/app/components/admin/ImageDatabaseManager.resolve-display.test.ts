/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { extractImageUrl } from "@/utils/imageUrl";
import { resolveDisplayImageEntriesForKey } from "./ImageDatabaseManager";
import type { ImageMap } from "./image-database";

describe("resolveDisplayImageEntriesForKey", () => {
  /** Id must not collide with atlas `getGalleryImages` fallbacks for deterministic counts. */
  const testKey = "z-test-resolve-display-fiber";

  it("matches fiber gallery order when active node matches, even if local atlas-images is stale", () => {
    const source: ImageMap = {
      [testKey]: ["https://example.com/stale-only.jpg"],
    };
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            galleryImages: [
              { url: "https://example.com/a.jpg" },
              { url: "https://example.com/b.jpg" },
            ],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, testKey, getFiberById);
    const urls = entries.map((e) => extractImageUrl(e).trim());
    expect(urls).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("returns empty when atlas-images row is explicitly empty (no fiber resurrection)", () => {
    const source: ImageMap = {
      [testKey]: [],
    };
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            galleryImages: [
              { url: "https://example.com/a.jpg" },
              { url: "https://example.com/b.jpg" },
            ],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, null, getFiberById);
    expect(entries.length).toBe(0);
  });

  it("uses local atlas list when no active-node override applies", () => {
    const source: ImageMap = {
      [testKey]: ["https://example.com/stale-only.jpg"],
    };
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            galleryImages: [
              { url: "https://example.com/a.jpg" },
              { url: "https://example.com/b.jpg" },
            ],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, null, getFiberById);
    const urls = entries.map((e) => extractImageUrl(e).trim());
    expect(urls).toEqual(["https://example.com/stale-only.jpg"]);
  });

  it("when active node matches, prefers local subset so deletes persist", () => {
    const source: ImageMap = {
      [testKey]: ["https://example.com/a.jpg"],
    };
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            galleryImages: [
              { url: "https://example.com/a.jpg" },
              { url: "https://example.com/b.jpg" },
            ],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, testKey, getFiberById);
    const urls = entries.map((e) => extractImageUrl(e).trim());
    expect(urls).toEqual(["https://example.com/a.jpg"]);
  });

  it("dedupes _600x vs full-size as one asset when active node matches", () => {
    const source: ImageMap = {
      [testKey]: [
        "https://cdn.shopify.com/files/1/hero_600x.jpg",
        "https://cdn.shopify.com/files/1/hero.jpg",
      ],
    };
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            galleryImages: [{ url: "https://cdn.shopify.com/files/1/hero.jpg" }],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, testKey, getFiberById);
    const urls = entries.map((e) => extractImageUrl(e).trim());
    expect(urls).toEqual(["https://cdn.shopify.com/files/1/hero_600x.jpg"]);
  });

  it("falls back to hero image when fiber gallery is empty and no local row exists", () => {
    const source: ImageMap = {};
    const getFiberById = (id: string) =>
      id === testKey
        ? {
            id: testKey,
            image: "https://example.com/hero-only.jpg",
            galleryImages: [],
          }
        : undefined;

    const entries = resolveDisplayImageEntriesForKey(source, testKey, null, getFiberById);
    const urls = entries.map((e) => extractImageUrl(e).trim());
    expect(urls).toEqual(["https://example.com/hero-only.jpg"]);
  });
});
