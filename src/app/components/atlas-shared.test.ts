import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getThumbUrl } from "./atlas-shared";

const originalLocalStorage = globalThis.localStorage;

describe("atlas-shared getThumbUrl", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it("prefers navigation parent image overrides from local storage", () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas:nav-parent-images") {
        return JSON.stringify({ fiber: ["https://example.com/nav-fiber.jpg"] });
      }
      return null;
    });

    expect(getThumbUrl("fiber")).toBe("https://example.com/nav-fiber.jpg");
  });

  it("falls back to atlas-images for navigation node thumbnails", () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas-images") {
        return JSON.stringify({
          regen: [{ url: "https://example.com/regen-from-imagebase.jpg" }],
        });
      }
      return null;
    });

    expect(getThumbUrl("regen")).toBe("https://example.com/regen-from-imagebase.jpg");
  });

  it("prefers mineral-regenerated over regen in atlas-images when both exist", () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas-images") {
        return JSON.stringify({
          "mineral-regenerated": [{ url: "https://example.com/published-regen-thumb.jpg" }],
          regen: [{ url: "https://example.com/stale-regen-thumb.jpg" }],
        });
      }
      return null;
    });

    expect(getThumbUrl("regen")).toBe("https://example.com/published-regen-thumb.jpg");
  });

  it("resolves admin tree IDs (seed-fibers, grass-fibers) when frontend requests singular (seed-fiber, grass-fiber)", () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas:nav-parent-images") {
        return JSON.stringify({
          "seed-fibers": ["https://example.com/seed-fiber-thumb.jpg"],
          "grass-fibers": ["https://example.com/grass-fiber-thumb.jpg"],
          "bark-fibers": ["https://example.com/bark-fiber-thumb.jpg"],
        });
      }
      return null;
    });

    expect(getThumbUrl("seed-fiber")).toBe("https://example.com/seed-fiber-thumb.jpg");
    expect(getThumbUrl("grass-fiber")).toBe("https://example.com/grass-fiber-thumb.jpg");
    expect(getThumbUrl("bark-fiber")).toBe("https://example.com/bark-fiber-thumb.jpg");
  });
});
