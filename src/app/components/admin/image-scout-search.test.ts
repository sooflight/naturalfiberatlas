import { describe, expect, it } from "vitest";
import {
  canonicalizeImageUrl,
  mergeUniqueResults,
  createScoutRunState,
  runScoutSearch,
} from "./image-scout-search";

describe("canonicalizeImageUrl", () => {
  it("strips query parameters", () => {
    expect(canonicalizeImageUrl("https://example.com/img.jpg?w=200&h=100")).toBe(
      "https://example.com/img.jpg",
    );
  });

  it("normalizes www vs non-www host", () => {
    expect(canonicalizeImageUrl("https://www.example.com/img.jpg")).toBe(
      "https://example.com/img.jpg",
    );
  });

  it("handles URL with both www and query", () => {
    expect(
      canonicalizeImageUrl("https://www.cdn.com/photo.jpg?token=abc&size=large"),
    ).toBe("https://cdn.com/photo.jpg");
  });

  it("returns unchanged URL when no noise", () => {
    expect(canonicalizeImageUrl("https://example.com/img.jpg")).toBe(
      "https://example.com/img.jpg",
    );
  });

  it("normalizes mixed-case scheme and host", () => {
    expect(canonicalizeImageUrl("HTTPS://EXAMPLE.com/a.jpg?utm=1")).toBe(
      "https://example.com/a.jpg",
    );
  });

  it("returns input unchanged for invalid URL (deterministic)", () => {
    const invalid = "not-a-valid-url";
    expect(canonicalizeImageUrl(invalid)).toBe(invalid);
    expect(canonicalizeImageUrl(invalid)).toBe(invalid);
  });
});

describe("mergeUniqueResults", () => {
  it("dedupes by canonical URL", () => {
    const existing = [{ url: "https://example.com/a.jpg", provider: "unsplash" as const, title: "A" }];
    const incoming = [
      { url: "https://www.example.com/a.jpg?w=100", provider: "pexels" as const, title: "A2" },
    ];
    const merged = mergeUniqueResults(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].url).toBe("https://www.example.com/a.jpg?w=100");
  });

  it("keeps unique results", () => {
    const existing = [{ url: "https://a.com/1.jpg", provider: "unsplash" as const, title: "1" }];
    const incoming = [
      { url: "https://b.com/2.jpg", provider: "pexels" as const, title: "2" },
    ];
    const merged = mergeUniqueResults(existing, incoming);
    expect(merged).toHaveLength(2);
  });

  it("prefers incoming order for duplicates", () => {
    const existing = [{ url: "https://example.com/x.jpg", provider: "unsplash" as const, title: "Old" }];
    const incoming = [{ url: "https://example.com/x.jpg?t=1", provider: "pexels" as const, title: "New" }];
    const merged = mergeUniqueResults(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("New");
  });
});

describe("createScoutRunState", () => {
  it("increments run id from previous state", () => {
    const prev = { runId: 3, query: "hemp", provider: "all" as const };
    const next = createScoutRunState(prev);
    expect(next.runId).toBe(4);
  });

  it("starts at 1 when no previous state", () => {
    const next = createScoutRunState();
    expect(next.runId).toBe(1);
  });

  it("preserves query and provider from previous state", () => {
    const prev = { runId: 2, query: "cotton", provider: "unsplash" as const };
    const next = createScoutRunState(prev);
    expect(next.query).toBe("cotton");
    expect(next.provider).toBe("unsplash");
  });
});

describe("runScoutSearch", () => {
  it("returns partial when one provider fails but another returns results, and exposes provider error", async () => {
    const out = await runScoutSearch({
      query: "hemp",
      provider: "all",
      adapters: {
        openverse: async () => [
          { url: "https://x/1.jpg", provider: "openverse" as const, title: "ok" },
        ],
        wikimedia: async () => {
          throw new Error("timeout");
        },
      },
    } as any);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].url).toBe("https://x/1.jpg");
    expect(out.status).toBe("partial");
    expect(out.providerErrors.wikimedia).toMatch(/timeout/i);
  });

  it("sets exhausted=true when all providers return empty results", async () => {
    const out = await runScoutSearch({
      query: "hemp",
      provider: "all",
      adapters: {
        openverse: async () => [],
        wikimedia: async () => [],
      },
    } as any);
    expect(out.exhausted).toBe(true);
  });

  it("does not throw when single-provider adapter is missing; returns status error and provider error", async () => {
    const out = await runScoutSearch({
      query: "hemp",
      provider: "unsplash",
      adapters: {},
    } as any);
    expect(out.status).toBe("error");
    expect(out.providerErrors.unsplash).toMatch(/adapter not configured/i);
  });
});
