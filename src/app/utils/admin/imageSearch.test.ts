import { afterEach, describe, expect, it, vi } from "vitest";
import { __imageSearchTestUtils, testConnection } from "./imageSearch";
import { FEATURE_FLAGS } from "@/config/featureFlags";

describe("imageSearch provider normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    FEATURE_FLAGS.canonicalAdminApi = false;
  });

  it("keeps provider metadata and drops malformed rows", () => {
    const rows = [
      {
        title: "Historic textile",
        imageUrl: "https://img.example/a.jpg",
        thumbnailUrl: "https://img.example/a-thumb.jpg",
        sourceUrl: "https://source.example/a",
        rights: "CC-BY",
        attribution: "Museum Archive",
        licenseUrl: "https://license.example/cc-by",
      },
      {
        title: "Malformed row without URLs",
      },
    ];

    const results = __imageSearchTestUtils.normalizeProviderResults("europeana", rows);
    expect(results).toHaveLength(1);
    expect(results[0]?.provider).toBe("europeana");
    expect(results[0]?.rights).toBe("CC-BY");
    expect(results[0]?.attribution).toBe("Museum Archive");
    expect(results[0]?.licenseUrl).toBe("https://license.example/cc-by");
  });

  it("deduplicates rows by imageUrl", () => {
    const rows = [
      { imageUrl: "https://img.example/a.jpg", sourceUrl: "one" },
      { imageUrl: "https://img.example/a.jpg", sourceUrl: "two" },
      { imageUrl: "https://img.example/b.jpg", sourceUrl: "three" },
    ];

    const results = __imageSearchTestUtils.normalizeProviderResults("wikimedia", rows);
    expect(results).toHaveLength(2);
    expect(results[0]?.imageUrl).toBe("https://img.example/a.jpg");
    expect(results[1]?.imageUrl).toBe("https://img.example/b.jpg");
  });

  it("tests openverse connection without requiring an API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(testConnection("openverse", "")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/openverse-image-search",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("routes provider proxy calls through canonical admin API when enabled", async () => {
    FEATURE_FLAGS.canonicalAdminApi = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(testConnection("openverse", "")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/make-server-4a437a67/admin/openverse-image-search",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails fast when API-key providers have no key", async () => {
    await expect(testConnection("brave", "")).rejects.toThrow("Brave API key not configured");
  });
});
