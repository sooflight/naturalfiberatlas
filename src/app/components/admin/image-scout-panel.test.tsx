import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ImageScoutPanel } from "./image-scout-panel";
import type { GalleryImageEntry } from "../../data/fibers";
import type { AtlasMedia } from "../../types/atlas-media";

const legacyPanelSpy = vi.fn(() => null);

vi.mock("./ImageScoutPanel", () => ({
  __esModule: true,
  default: (props: unknown) => legacyPanelSpy(props),
}));

const mockAdminSettings = {
  imageSearch: { brave: "", unsplash: "", pexels: "", flickr: "", openverse: "_none_", europeana: "", wikimedia: "_none_", pinterest: "" },
  ai: { openai: "", claude: "", gemini: "", openrouter: "", ollama: "http://localhost:11434" },
  cloudinary: { cloudName: "", uploadPreset: "" },
  upscale: { replicateApiKey: "", defaultEngine: "slim" as const, defaultScale: "2x" as const },
  preferences: { defaultZoom: 200 },
};

vi.mock("@/contexts/AdminSettingsContext", () => ({
  AdminSettingsProvider: ({ children }: { children: ReactNode }) => children,
  useAdminSettings: () => ({
    settings: mockAdminSettings,
    updateSettings: () => {},
    goToSettings: undefined,
    navigateTo: undefined,
  }),
}));

describe("ImageScoutPanel", () => {
  it("passes embedded parity props to legacy scout component", () => {
    legacyPanelSpy.mockClear();
    render(
      <ImageScoutPanel
        profileId="hemp"
        existingImages={[]}
        allProfileIds={["hemp", "cotton"]}
        onAddImages={vi.fn()}
      />,
    );
    expect(legacyPanelSpy).toHaveBeenCalledTimes(1);
    const props = legacyPanelSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.embedded).toBe(true);
    expect(props.initialProfile).toBe("hemp");
    expect(props.initialQuery).toBe("hemp");
    expect(props.allProfileKeys).toEqual(["hemp", "cotton"]);
  });

  it("adapts legacy onAddImages media payload into local gallery entries", async () => {
    legacyPanelSpy.mockClear();
    const onAddImages = vi.fn();
    render(
      <ImageScoutPanel
        profileId="hemp"
        existingImages={[]}
        onAddImages={onAddImages}
      />,
    );
    const props = legacyPanelSpy.mock.calls[0]?.[0] as {
      onAddImages: (profileKey: string, urls: string[], media?: AtlasMedia[]) => Promise<void>;
    };
    await props.onAddImages("cotton", ["https://example.com/a.jpg"], [
      {
        url: "https://example.com/a.jpg",
        title: "A",
        provider: "unsplash",
        attribution: "Unsplash",
      },
    ]);
    expect(onAddImages).toHaveBeenCalledWith(
      [
        {
          url: "https://example.com/a.jpg",
          title: "A",
          attribution: "Unsplash",
          provider: "unsplash",
          rights: undefined,
          licenseUrl: undefined,
          sourceManifest: undefined,
          tileSource: undefined,
          width: undefined,
          height: undefined,
          thumbUrl: undefined,
        },
      ],
      "direct",
      "cotton",
    );
  });

  it("routes remove and reorder only for active profile", () => {
    legacyPanelSpy.mockClear();
    const onRemoveExistingImage = vi.fn();
    const onMoveExistingImage = vi.fn();
    render(
      <ImageScoutPanel
        profileId="hemp"
        existingImages={[{ url: "https://example.com/1.jpg" } as GalleryImageEntry]}
        onAddImages={vi.fn()}
        onRemoveExistingImage={onRemoveExistingImage}
        onMoveExistingImage={onMoveExistingImage}
      />,
    );
    const props = legacyPanelSpy.mock.calls[0]?.[0] as {
      onRemoveImage: (profile: string, idx: number) => void;
      onReorderImages: (profile: string, from: number, to: number) => void;
    };
    props.onRemoveImage("hemp", 0);
    props.onRemoveImage("cotton", 0);
    props.onReorderImages("hemp", 0, 1);
    props.onReorderImages("cotton", 0, 1);
    expect(onRemoveExistingImage).toHaveBeenCalledTimes(1);
    expect(onRemoveExistingImage).toHaveBeenCalledWith(0);
    expect(onMoveExistingImage).toHaveBeenCalledTimes(1);
    expect(onMoveExistingImage).toHaveBeenCalledWith(0, 1);
  });
});

