import { describe, expect, it, vi } from "vitest";
import { parseImportWithOpenRouter } from "./import-ai";

describe("parseImportWithOpenRouter", () => {
  it("returns normalized JSON string and model on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        model: "openai/gpt-4o-mini",
        data: {
          fibers: {
            hemp: { name: "Hemp (AI Organized)" },
          },
        },
      }),
    });

    const result = await parseImportWithOpenRouter('{"unstructured": "data"}', fetchMock);
    expect(result.model).toBe("openai/gpt-4o-mini");
    expect(JSON.parse(result.normalizedJson)).toEqual({
      fibers: {
        hemp: { name: "Hemp (AI Organized)" },
      },
    });
  });

  it("throws a readable error when proxy request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Proxy failure",
    });

    await expect(parseImportWithOpenRouter("{}", fetchMock)).rejects.toThrow(
      /OpenRouter parse request failed/,
    );
  });

  it("throws when proxy response shape is invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, model: "test-model" }),
    });

    await expect(parseImportWithOpenRouter("{}", fetchMock)).rejects.toThrow(
      /invalid payload/i,
    );
  });
});
