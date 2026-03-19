import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNodeRevision, revertNodeBundle, saveNodeBundle } from "./nodeSaveTransaction";
import { FEATURE_FLAGS } from "@/config/featureFlags";

describe("node save transaction contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    FEATURE_FLAGS.canonicalAdminApi = false;
  });

  it("fetches node revision by encoded node id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ revision: "rev-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const revision = await fetchNodeRevision("hemp root");
    expect(revision).toBe("rev-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/read-node-revision?nodeId=hemp%20root",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("maps save-node-bundle failure payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Revision conflict", currentRevision: "rev-next" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveNodeBundle({
      nodeId: "hemp",
      expectedRevision: "rev-old",
      passport: {},
      atlasPatch: {},
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.error).toBe("Revision conflict");
    expect(result.currentRevision).toBe("rev-next");
  });

  it("maps save-node-bundle partial failure summary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: "passport write failed",
        code: "BUNDLE_PARTIAL",
        summary: {
          committed: ["atlas-data"],
          failed: ["passport: write failed"],
          rollback: { attempted: true, succeeded: false },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveNodeBundle({
      nodeId: "hemp",
      expectedRevision: "rev-1",
      passport: {},
      atlasPatch: {},
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("BUNDLE_PARTIAL");
    expect(result.summary?.committed).toEqual(["atlas-data"]);
    expect(result.summary?.rollback).toEqual({ attempted: true, succeeded: false });
  });

  it("maps save-node-bundle success summary and revision", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        revision: "rev-2",
        summary: {
          committed: ["atlas-data", "passport"],
          failed: [],
          rollback: { attempted: false, succeeded: true },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await saveNodeBundle({
      nodeId: "hemp",
      expectedRevision: "rev-1",
      passport: {},
      atlasPatch: {},
    });
    expect(result.ok).toBe(true);
    expect(result.revision).toBe("rev-2");
    expect(result.summary?.committed).toEqual(["atlas-data", "passport"]);
  });

  it("maps revert-node-bundle success payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ summary: { committed: ["atlas-data", "passport"] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await revertNodeBundle({
      nodeId: "hemp",
      passport: {},
      atlasPatch: {},
    });
    expect(result.ok).toBe(true);
    expect(result.summary?.committed).toEqual(["atlas-data", "passport"]);
  });

  it("switches to edge admin routes when canonical API flag is enabled", async () => {
    FEATURE_FLAGS.canonicalAdminApi = true;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ revision: "edge-rev", summary: { committed: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchNodeRevision("hemp");
    await saveNodeBundle({
      nodeId: "hemp",
      expectedRevision: "rev-1",
      passport: {},
      atlasPatch: {},
    });
    await revertNodeBundle({
      nodeId: "hemp",
      passport: {},
      atlasPatch: {},
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/make-server-4a437a67/admin/read-node-revision?nodeId=hemp",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/make-server-4a437a67/admin/save-node-bundle",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/make-server-4a437a67/admin/revert-node-bundle",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
