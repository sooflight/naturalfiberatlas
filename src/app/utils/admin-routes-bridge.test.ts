import { afterEach, describe, expect, it, vi } from "vitest";
import { FEATURE_FLAGS } from "../config/featureFlags";
import { authenticatedFetch } from "../utils/admin/adminRoutes";

vi.mock("@/utils/api/client", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

describe("authenticatedFetch admin route bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    FEATURE_FLAGS.canonicalAdminApi = false;
  });

  it("rewrites __admin requests to canonical admin path when flag is enabled", async () => {
    FEATURE_FLAGS.canonicalAdminApi = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/__admin/openverse-image-search", { method: "POST" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/make-server-4a437a67/admin/openverse-image-search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("falls back to legacy __admin route when canonical endpoint returns 404", async () => {
    FEATURE_FLAGS.canonicalAdminApi = true;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "not found" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await authenticatedFetch("/__admin/brave-image-search", { method: "POST" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/make-server-4a437a67/admin/brave-image-search",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/__admin/brave-image-search",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
