import { afterEach, describe, expect, it, vi } from "vitest";
import { mutateAdminStatus, readVerificationQueuePayload } from "./adminStatusApi";
import { FEATURE_FLAGS } from "@/config/featureFlags";

describe("adminStatusApi contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    FEATURE_FLAGS.canonicalAdminApi = false;
  });

  it("posts passport mutation to expected endpoint payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await mutateAdminStatus({ type: "passport", id: "hemp", status: "verified" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/update-passport-status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ materialId: "hemp", status: "verified" }),
      }),
    );
  });

  it("posts supplier mutation to expected endpoint payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await mutateAdminStatus({ type: "supplier", id: "supplier-a", status: "reviewed" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/update-supplier-status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ supplierId: "supplier-a", status: "reviewed" }),
      }),
    );
  });

  it("throws on non-ok mutation response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, text: async () => "bad request" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(mutateAdminStatus({ type: "evidence", id: "e-1", status: "draft" })).rejects.toThrow("bad request");
  });

  it("reads verification queue payload", async () => {
    const payload = { passports: { hemp: { materialId: "hemp" } }, suppliers: {}, evidence: {} };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(readVerificationQueuePayload()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/read-verification-queue",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("routes status APIs to edge when canonical flag enabled", async () => {
    FEATURE_FLAGS.canonicalAdminApi = true;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await mutateAdminStatus({ type: "supplier", id: "supplier-a", status: "reviewed" });
    await readVerificationQueuePayload();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/make-server-4a437a67/admin/update-supplier-status",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/make-server-4a437a67/admin/read-verification-queue",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
