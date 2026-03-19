import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOllamaModels } from "./aiGenerate";

describe("fetchOllamaModels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns models from admin proxy endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ models: ["llama3.1:latest", "mistral:latest"] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOllamaModels("http://localhost:11434")).resolves.toEqual([
      "llama3.1:latest",
      "mistral:latest",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/ollama-models",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns an empty array when endpoint is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOllamaModels("http://localhost:11434")).resolves.toEqual([]);
  });
});
