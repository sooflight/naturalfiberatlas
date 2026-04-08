import { afterEach, describe, expect, it, vi } from "vitest";
import { atomicImageUpdate, readAtlasDiskData, writeAtlasDiskData } from "./atlasImageStore";

vi.mock("@/utils/adminRoutes", () => ({
  adminRoute: (p: string) => p,
  authenticatedFetch: (url: string, init?: RequestInit) => globalThis.fetch(url, init),
}));

function mockJsonResponse(body: unknown, init?: { status?: number; ok?: boolean }) {
  return {
    status: init?.status ?? 200,
    ok: init?.ok ?? true,
    json: async () => body,
  };
}

describe("atlasImageStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads revision envelope from /__admin/read-atlas-data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse({
          data: { images: { hemp: ["https://example.com/1.jpg"] } },
          revision: "rev-1",
        }),
      ),
    );

    const result = await readAtlasDiskData();
    expect(result?.revision).toBe("rev-1");
    expect(result?.images.hemp).toEqual(["https://example.com/1.jpg"]);
  });

  it("returns null when read body is an error object without data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockJsonResponse({ error: "atlas read failed" }, { status: 200, ok: true })),
    );

    await expect(readAtlasDiskData()).resolves.toBeNull();
  });

  it("returns conflict metadata when save endpoint responds 409", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockJsonResponse({ conflict: true, revision: "rev-2" }, { status: 409, ok: false }),
      ),
    );

    const result = await writeAtlasDiskData({ images: {} }, { expectedRevision: "rev-1" });
    expect(result).toEqual({
      ok: false,
      conflict: true,
      revision: "rev-2",
    });
  });

  it("retries once on revision conflict during atomic image update", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: { images: { flax: ["https://example.com/a.jpg"] } },
          revision: "rev-1",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ conflict: true, revision: "rev-2" }, { status: 409, ok: false }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          data: { images: { flax: ["https://example.com/a.jpg"] } },
          revision: "rev-2",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({ ok: true, revision: "rev-3" }, { status: 200, ok: true }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const updated = await atomicImageUpdate((images) => ({
      ...images,
      flax: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    }));

    expect(updated?.flax).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
