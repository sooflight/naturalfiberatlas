/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsTab from "./SettingsTab";

const testConnectionMock = vi.fn();

vi.mock("@/utils/imageSearch", () => ({
  PROVIDERS: [
    {
      id: "brave",
      label: "Brave",
      description: "Search",
      color: "#fb542b",
      configUrl: "https://example.com",
      keyRequired: true,
    },
    {
      id: "openverse",
      label: "Openverse",
      description: "Public",
      color: "#c233ed",
      configUrl: "https://example.com/openverse",
      keyRequired: false,
    },
  ],
  testConnection: (...args: unknown[]) => testConnectionMock(...args),
}));

vi.mock("@/utils/aiGenerate", () => ({
  AI_PROVIDERS: [],
  fetchOllamaModels: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/utils/cloudinary", () => ({
  getCloudinarySignedStatus: vi.fn().mockResolvedValue({ configured: false }),
  requestCloudinaryUpscale: vi.fn().mockResolvedValue(""),
  testCloudinaryConnection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/utils/activityLog", () => ({
  logActivity: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/contexts/AdminSettingsContext", async () => {
  const ReactModule = await import("react");

  const initialSettings = {
    imageSearch: {
      brave: "",
      unsplash: "",
      pexels: "",
      flickr: "",
      openverse: "_none_",
      europeana: "",
      wikimedia: "_none_",
    },
    ai: { openai: "", claude: "", gemini: "", openrouter: "", ollama: "http://localhost:11434" },
    cloudinary: { cloudName: "", uploadPreset: "" },
    upscale: { replicateApiKey: "", defaultEngine: "slim", defaultScale: "2x" },
    preferences: { defaultZoom: 200 },
  };

  function merge(base: any, patch: any): any {
    const next = { ...base };
    for (const key of Object.keys(patch)) {
      const val = patch[key];
      if (val && typeof val === "object" && !Array.isArray(val) && base[key] && typeof base[key] === "object") {
        next[key] = merge(base[key], val);
      } else {
        next[key] = val;
      }
    }
    return next;
  }

  return {
    useAdminSettings: () => {
      const [settings, setSettings] = ReactModule.useState(initialSettings);
      return {
        settings,
        updateSettings: (patch: unknown) => setSettings((prev) => merge(prev, patch)),
      };
    },
  };
});

describe("SettingsTab key connection UX", () => {
  beforeEach(() => {
    testConnectionMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("starts as unconnected when key is empty", () => {
    testConnectionMock.mockResolvedValue(undefined);
    render(<SettingsTab />);
    const light = screen.getByTestId("Brave-connection-light");
    expect(light.getAttribute("data-status")).toBe("unconnected");
  });

  it("renders keyless providers as always-connected without text input", () => {
    render(<SettingsTab />);
    const openverseLight = screen.getByTestId("Openverse-connection-light");
    expect(openverseLight.getAttribute("data-status")).toBe("connected");
    expect(screen.getByText("No key required")).toBeTruthy();
  });

  it("auto-checks after key entry and turns green on success", async () => {
    testConnectionMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SettingsTab />);
    const input = screen.getAllByPlaceholderText("Brave API key…")[0];
    await user.type(input, "abc-key");
    expect(screen.getByText("Key received and saved")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId("Brave-connection-light").getAttribute("data-status")).toBe("connected");
    }, { timeout: 2000 });
  });

  it("turns orange when auto-check fails", async () => {
    testConnectionMock.mockRejectedValue(new Error("Bad key"));
    const user = userEvent.setup();
    render(<SettingsTab />);
    await user.type(screen.getAllByPlaceholderText("Brave API key…")[0], "bad-key");
    await waitFor(() => {
      expect(screen.getByTestId("Brave-connection-light").getAttribute("data-status")).toBe("error");
    }, { timeout: 2000 });
  });
});

describe("SettingsTab profile image links export", () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem("atlas-images");
  });

  it("exports profile image links as a JSON download", () => {
    localStorage.setItem("atlas-images", JSON.stringify({ hemp: ["https://example.com/a.jpg"] }));
    const createObjectUrl = vi.fn(() => "blob:atlas-export");
    const revokeObjectUrl = vi.fn();
    const originalCreateObjectURL = globalThis.URL.createObjectURL;
    const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = createObjectUrl;
    globalThis.URL.revokeObjectURL = revokeObjectUrl;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    try {
      render(<SettingsTab />);
      fireEvent.click(screen.getByRole("button", { name: /export json/i }));

      expect(createObjectUrl).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrl).toHaveBeenCalledWith("blob:atlas-export");
    } finally {
      clickSpy.mockRestore();
      globalThis.URL.createObjectURL = originalCreateObjectURL;
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });
});
