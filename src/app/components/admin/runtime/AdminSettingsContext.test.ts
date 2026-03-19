/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { loadSettings } from "./AdminSettingsContext";

describe("AdminSettingsContext loadSettings", () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
    });
  });

  it("includes openrouter in default ai settings", () => {
    const settings = loadSettings();
    expect(settings.ai.openrouter).toBe("");
  });

  it("keeps openrouter key when migrating legacy ai settings", () => {
    localStorage.setItem("atlas-ai-api-keys", JSON.stringify({
      openai: "oa",
      claude: "cl",
      gemini: "gm",
      ollama: "http://localhost:11434",
    }));
    const settings = loadSettings();
    expect(settings.ai).toEqual({
      openai: "oa",
      claude: "cl",
      gemini: "gm",
      openrouter: "",
      ollama: "http://localhost:11434",
    });
  });
});
