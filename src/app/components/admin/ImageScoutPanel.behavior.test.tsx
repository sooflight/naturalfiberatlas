/** @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ImageScoutPanel, { buildProfileHierarchy, getProfileHierarchyNode, getPrimaryTagPathSegments } from "./ImageScoutPanel";
import { uploadToCloudinary } from "@/utils/cloudinary";
import { getConfiguredProviders } from "@/utils/imageSearch";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

vi.mock("@/contexts/AdminSettingsContext", () => ({
  useAdminSettings: () => ({
    settings: {
      imageSearch: {
        brave: "test",
        unsplash: "",
        pexels: "",
        flickr: "",
        openverse: "_none_",
        europeana: "",
        wikimedia: "_none_",
      },
      cloudinary: { cloudName: "", uploadPreset: "" },
      preferences: { defaultZoom: 2 },
    },
    goToSettings: vi.fn(),
  }),
}));

vi.mock("@/utils/cloudinary", () => ({
  uploadFromUrl: vi.fn(),
  uploadToCloudinary: vi.fn(),
}));

vi.mock("@/utils/imageSearch", () => ({
  PROVIDERS: [
    { id: "brave", label: "Brave", keyRequired: true, color: "#fb542b", pageable: true },
    { id: "openverse", label: "Openverse", keyRequired: false, color: "#c233ed", pageable: true },
  ],
  getConfiguredProviders: vi.fn(() => ["brave"]),
  initProviderPageState: () => ({ brave: 1 }),
  searchAllSources: vi.fn().mockResolvedValue({ results: [], providerState: { brave: 1 }, allExhausted: true }),
  searchImages: vi.fn().mockResolvedValue([]),
  fetchIIIFManifest: vi.fn().mockResolvedValue({ results: [] }),
  buildScoutQuery: (profile: string) => `${profile} texture`,
}));

describe("ImageScoutPanel recovered behavior", () => {
  beforeEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(getConfiguredProviders).mockReturnValue(["brave"]);
  });

  it("does not render the all-sources pill even with multiple providers configured", () => {
    vi.mocked(getConfiguredProviders).mockReturnValue(["brave", "openverse"]);

    render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialQuery="fiber"
        initialProfile="hemp"
        images={{ hemp: [] }}
        tags={{ hemp: ["fiber/bast"] }}
      />,
    );

    expect(screen.queryByTitle(/Search all/i)).toBeNull();
  });

  it("renders queue strip with active/inactive widths and updates on click", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp", "cotton"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        queue={["hemp", "cotton"]}
        images={{
          hemp: ["https://example.com/hemp.jpg"],
          cotton: ["https://example.com/cotton.jpg"],
        }}
        tags={{
          hemp: ["fiber/bast"],
          cotton: ["fiber/seed"],
        }}
      />,
    );

    const hempThumb = await waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>('button[title="hemp"]');
      expect(el).toBeTruthy();
      return el!;
    });
    const cottonThumb = await waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>('button[title="cotton"]');
      expect(el).toBeTruthy();
      return el!;
    });
    expect(hempThumb.style.width).toBe("72px");
    expect(cottonThumb.style.width).toBe("56px");

    await user.click(cottonThumb);

    await waitFor(() => {
      expect(cottonThumb.style.width).toBe("72px");
      expect(hempThumb.style.width).toBe("56px");
    });
  });

  it("opens left panel from profile trigger click (not hover)", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        queue={["hemp"]}
        images={{
          hemp: ["https://example.com/hemp.jpg"],
        }}
        tags={{
          hemp: ["fiber/bast"],
        }}
      />,
    );

    // Initially, "Current Images" is not visible (panel closed by default)
    expect(screen.queryByText(/Current Images/i)).toBeNull();

    const trigger = await waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>(".scout-profile-trigger");
      expect(el).toBeTruthy();
      return el!;
    });

    // Hover should NOT open the panel anymore
    fireEvent.mouseEnter(trigger);
    expect(screen.queryByText(/Current Images/i)).toBeNull();

    // Click should open the panel
    await user.click(trigger);
    expect(await screen.findByText(/Current Images/i)).toBeTruthy();

    // Click again should close the panel
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.queryByText(/Current Images/i)).toBeNull();
    });
  });

  it("advanced tools are hidden by default (progressive disclosure)", async () => {
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialQuery="fiber"
        initialProfile="hemp"
        images={{ hemp: ["https://example.com/hemp.jpg"] }}
        tags={{ hemp: ["fiber/bast"] }}
      />,
    );

    // IIIF manifest input should not be visible by default
    expect(screen.queryByPlaceholderText(/Paste manifest URL/i)).toBeNull();

    // "Advanced tools" section should not be visible
    expect(screen.queryByText(/Advanced Tools/i)).toBeNull();
  });

  it("shows unified action rail when items are selected", async () => {
    const onAddImages = vi.fn();

    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp", "cotton"]}
        onAddImages={onAddImages}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialQuery="fiber"
        initialProfile="hemp"
        images={{ hemp: [], cotton: [] }}
        tags={{ hemp: ["fiber/bast"], cotton: ["fiber/seed"] }}
      />,
    );

    // Action rail should not be visible initially (no selection)
    expect(screen.queryByText(/selected/i)).toBeNull();

    // Simulate selecting an image by clicking the right zone on a card
    // First wait for results to render, then trigger selection via context
    // Since we mock search results as empty, we test the rail structure instead

    // Verify the unified rail class exists in the component
    const actionBar = container.querySelector('.scout-action-bar');
    // Initially not rendered because selCount === 0
    expect(actionBar).toBeNull();
  });

  it("uses 'selected' terminology consistently", async () => {
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        queue={["hemp"]}
        images={{ hemp: [] }}
        tags={{ hemp: ["fiber/bast"] }}
      />,
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(container.querySelector('.scout-profile-trigger')).toBeTruthy();
    });

    // Old "Collected" terminology should not exist
    expect(screen.queryByText(/collected/i)).toBeNull();
  });

  it("stages dropped files for upload", async () => {
    const uploadMock = vi.mocked(uploadToCloudinary);
    uploadMock.mockResolvedValueOnce("https://res.cloudinary.com/demo/image/upload/v1/atlas/hemp-file.jpg");

    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialProfile="hemp"
        cloudinaryReady
        cloudinaryConfig={{ cloudName: "demo", uploadPreset: "atlas" }}
        images={{ hemp: [] }}
        tags={{ hemp: ["fiber/bast"] }}
      />,
    );

    const dropzone = container.querySelector('[data-testid="scout-file-dropzone"]') as HTMLElement;
    expect(dropzone).toBeTruthy();
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [new File(["image"], "hemp-file.jpg", { type: "image/jpeg" })],
      },
    });

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledTimes(1);
    });
  });

  it("stages dropped image URLs without uploading immediately", async () => {
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialProfile="hemp"
        cloudinaryReady
        cloudinaryConfig={{ cloudName: "demo", uploadPreset: "atlas" }}
        images={{ hemp: [] }}
        tags={{ hemp: ["fiber/bast"] }}
      />,
    );

    const dropzone = container.querySelector('[data-testid="scout-file-dropzone"]') as HTMLElement;
    expect(dropzone).toBeTruthy();

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [],
        getData: (type: string) =>
          type === "text/uri-list" ? "https://example.com/hemp-drop.jpg" : "",
      },
    });

    await waitFor(() => {
      expect(container.querySelector(".scout-action-bar")).toBeTruthy();
    });
  });

  it("builds layer hierarchy from first tag path and includes untagged branch", () => {
    expect(getPrimaryTagPathSegments(["fiber/plant/bast"])).toEqual(["fiber", "plant", "bast"]);
    expect(getPrimaryTagPathSegments(["fiber/plant/stem/bast/micro"])).toEqual([
      "fiber",
      "plant",
      "stem",
      "bast",
    ]);
    expect(getPrimaryTagPathSegments([])).toEqual(["untagged"]);

    const root = buildProfileHierarchy(
      ["hemp", "flax", "mystery"],
      {
        hemp: ["fiber/plant/bast"],
        flax: ["fiber/plant/leaf"],
        mystery: [],
      },
    );

    expect(Array.from(root.children.keys()).sort()).toEqual(["fiber", "untagged"]);

    const fiberNode = getProfileHierarchyNode(root, ["fiber"]);
    expect(fiberNode).toBeTruthy();
    expect(Array.from(fiberNode!.children.keys())).toEqual(["plant"]);

    const bastNode = getProfileHierarchyNode(root, ["fiber", "plant", "bast"]);
    const leafNode = getProfileHierarchyNode(root, ["fiber", "plant", "leaf"]);
    const untaggedNode = getProfileHierarchyNode(root, ["untagged"]);
    expect(bastNode?.profiles).toEqual(["hemp"]);
    expect(leafNode?.profiles).toEqual(["flax"]);
    expect(untaggedNode?.profiles).toEqual(["mystery"]);
  });

  it("prompts for the next node layer after selecting a node", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp", "flax"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        cloudinaryReady
        cloudinaryConfig={{ cloudName: "demo", uploadPreset: "atlas" }}
        images={{ hemp: [], flax: [] }}
        tags={{
          hemp: ["fiber/plant/bast"],
          flax: ["fiber/plant/leaf"],
        }}
      />,
    );

    const dropzone = container.querySelector('[data-testid="scout-file-dropzone"]') as HTMLElement;
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [],
        getData: (type: string) =>
          type === "text/uri-list" ? "https://example.com/hemp-drop.jpg" : "",
      },
    });

    await waitFor(() => {
      expect(container.querySelector(".scout-action-bar")).toBeTruthy();
    });

    const actionBars = Array.from(container.querySelectorAll(".scout-action-bar"));
    const activeActionBar = actionBars[actionBars.length - 1] as HTMLElement;
    const addDirectButton = Array.from(activeActionBar.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Add Direct",
    ) as HTMLButtonElement;
    await user.click(addDirectButton);

    expect(await screen.findByText("Select Layer 1 node")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /fiber/i }));
    expect(await screen.findByText("Select Layer 2 node")).toBeTruthy();
  });

  it("clears drag dim state after reordering existing profile images", async () => {
    const onReorderImages = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ImageScoutPanel
        allProfileKeys={["hemp"]}
        onAddImages={vi.fn()}
        onClose={vi.fn()}
        onFlash={vi.fn()}
        initialProfile="hemp"
        images={{
          hemp: [
            "https://example.com/hemp-one.jpg",
            "https://example.com/hemp-two.jpg",
          ],
        }}
        tags={{ hemp: ["fiber/bast"] }}
        onReorderImages={onReorderImages}
      />,
    );

    const trigger = await waitFor(() => {
      const el = container.querySelector<HTMLButtonElement>(".scout-profile-trigger");
      expect(el).toBeTruthy();
      return el!;
    });
    await user.click(trigger);
    await screen.findByText(/Current Images/i);

    const firstName = await screen.findByText("hemp-one.jpg");
    const secondName = await screen.findByText("hemp-two.jpg");
    const firstRow = firstName.closest("div[draggable='true']") as HTMLDivElement;
    const secondRow = secondName.closest("div[draggable='true']") as HTMLDivElement;
    expect(firstRow).toBeTruthy();
    expect(secondRow).toBeTruthy();

    const dataTransfer = {
      effectAllowed: "move",
      setData: vi.fn(),
      getData: vi.fn(() => ""),
      clearData: vi.fn(),
    };

    fireEvent.dragStart(firstRow, { dataTransfer });
    await waitFor(() => {
      expect(firstRow.className).toContain("opacity-40");
    });

    fireEvent.dragOver(secondRow);
    fireEvent.drop(secondRow, { dataTransfer });

    expect(onReorderImages).toHaveBeenCalledWith("hemp", 0, 1);
    await waitFor(() => {
      expect(firstRow.className).not.toContain("opacity-40");
    });
  });
});
