// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMaterialPassportDb, useMaterialPassportsDb } from "./useMaterialPassportDb";

vi.mock("@/utils/api/info", () => ({
  getApiUrl: (path: string) => `https://test-api.local/${path}`,
}));

vi.mock("@/utils/api/client", () => ({
  getAuthHeaders: vi.fn(async () => ({ Authorization: "Bearer test-token" })),
}));

describe("useMaterialPassportDb", () => {
  let fetchMock: Mock<(input: string | Request, init?: RequestInit) => Promise<Response>>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns null when no materialId is provided", () => {
    const { result } = renderHook(() => useMaterialPassportDb(undefined));

    expect(result.current.passport).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe("draft");
  });

  it("fetches passport from database successfully", async () => {
    const mockPassport = {
      status: "verified",
      sustainability: { carbonFootprint: "low" },
      process: { spinning: { value: "good" } },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        passport: mockPassport,
        status: "verified",
        material_id: "hemp",
        source: "database",
      }),
    } as Response);

    const { result } = renderHook(() => useMaterialPassportDb("hemp"));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passport).toEqual(mockPassport);
    expect(result.current.status).toBe("verified");
    expect(result.current.error).toBeNull();

    // Verify fetch was called correctly
    expect(fetchMock).toHaveBeenCalledWith(
      "https://test-api.local/material/hemp/passport",
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  });

  it("handles API errors gracefully", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const { result } = renderHook(() => useMaterialPassportDb("hemp"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passport).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain("Failed to fetch passport");
  });

  it("handles network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMaterialPassportDb("hemp"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passport).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Network error");
  });

  it("refetches when materialId changes", async () => {
    const mockPassport1 = { status: "draft", materialId: "hemp" };
    const mockPassport2 = { status: "published", materialId: "cotton" };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passport: mockPassport1,
          status: "draft",
          material_id: "hemp",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          passport: mockPassport2,
          status: "published",
          material_id: "cotton",
        }),
      } as Response);

    const { result, rerender } = renderHook(
      ({ id }) => useMaterialPassportDb(id),
      { initialProps: { id: "hemp" } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passport).toEqual(mockPassport1);

    // Change materialId
    rerender({ id: "cotton" });

    await waitFor(() => {
      expect(result.current.passport).toEqual(mockPassport2);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles null passport response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        passport: null,
        status: "draft",
        material_id: "unknown",
        source: "database",
      }),
    } as Response);

    const { result } = renderHook(() => useMaterialPassportDb("unknown"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passport).toBeNull();
    expect(result.current.status).toBe("draft");
    expect(result.current.error).toBeNull();
  });
});

describe("useMaterialPassportsDb", () => {
  let fetchMock: Mock<(input: string | Request, init?: RequestInit) => Promise<Response>>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("fetches all passports successfully", async () => {
    const mockPassports = {
      hemp: { status: "verified" },
      cotton: { status: "published" },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        passports: mockPassports,
        aliases: {},
      }),
    } as Response);

    const { result } = renderHook(() => useMaterialPassportsDb());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passports).toEqual(mockPassports);
    expect(result.current.error).toBeNull();
  });

  it("handles fetch errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("API Error"));

    const { result } = renderHook(() => useMaterialPassportsDb());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.passports).toEqual({});
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
