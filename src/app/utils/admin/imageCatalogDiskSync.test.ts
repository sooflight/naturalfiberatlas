import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildProfileImageLinksDiskPayload,
  resetImageCatalogDiskSyncFingerprintForTests,
  syncImageCatalogToDisk,
} from "./imageCatalogDiskSync";

vi.mock("./adminRoutes", () => ({
  adminRoute: (p: string) => p,
  authenticatedFetch: (url: string, init?: RequestInit) => globalThis.fetch(url, init),
}));

describe("buildProfileImageLinksDiskPayload", () => {
  it("sorts profile keys and totals image links", () => {
    const p = buildProfileImageLinksDiskPayload(
      { b: ["https://a.com/1"], a: "https://a.com/2" },
      "2026-01-01T00:00:00.000Z",
    );
    expect(p.exportedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(p.profileCount).toBe(2);
    expect(p.imageLinkCount).toBe(2);
    expect(p.profiles[0].profileKey).toBe("a");
    expect(p.profiles[1].profileKey).toBe("b");
  });
});

describe("syncImageCatalogToDisk", () => {
  beforeEach(() => {
    resetImageCatalogDiskSyncFingerprintForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips duplicate fetches when the image map is unchanged after success", async () => {
    const map = { x: "https://x.test/a.jpg" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ atlasBytes: 10, newImagesBytes: 20 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await syncImageCatalogToDisk(map);
    await syncImageCatalogToDisk(map);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns an error when the server responds with failure", async () => {
    resetImageCatalogDiskSyncFingerprintForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "boom" }),
      }),
    );

    const r = await syncImageCatalogToDisk({ y: "https://y.test/b.jpg" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("boom");
  });
});
