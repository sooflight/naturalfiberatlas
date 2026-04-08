/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ImageDatabaseManager, { getEffectiveProfileZoom } from "./ImageDatabaseManager";

vi.mock("./ImageScoutPanel", () => ({
  default: ({
    initialProfile,
    initialQuery,
  }: {
    initialProfile?: string;
    initialQuery?: string;
  }) => (
    <div data-testid="image-scout-panel-proxy">
      {initialProfile ?? "none"}::{initialQuery ?? ""}
    </div>
  ),
}));

const { updateFiberMock, getFiberByIdMock, uploadToCloudinaryMock, uploadFromUrlMock } = vi.hoisted(() => ({
  updateFiberMock: vi.fn(),
  getFiberByIdMock: vi.fn((id: string) => ({ id })),
  uploadToCloudinaryMock: vi.fn(),
  uploadFromUrlMock: vi.fn(),
}));
let atlasFibersMock: Array<{
  id: string;
  name: string;
  category: string;
  image?: string;
  galleryImages: Array<{ url: string }>;
}> = [];

vi.mock("../../../../src/app/context/atlas-data-context", () => ({
  useAtlasData: () => ({
    fibers: atlasFibersMock,
    updateFiber: updateFiberMock,
    getFiberById: getFiberByIdMock,
    version: 0,
  }),
}));

vi.mock("@/contexts/AdminSettingsContext", () => ({
  useAdminSettings: () => ({
    settings: {
      cloudinary: {
        cloudName: "atlas-cloud",
        uploadPreset: "atlas-preset",
      },
    },
  }),
}));

vi.mock("@/utils/cloudinary", () => ({
  requestCloudinaryUpscale: vi.fn(),
  uploadFromUrl: uploadFromUrlMock,
  uploadToCloudinary: uploadToCloudinaryMock,
  isCloudinaryUrl: (url: string) => /res\.cloudinary\.com\//i.test(url),
  canApplyCloudinaryCrop: (url: string) =>
    url.includes("/image/upload/") || url.includes("/image/fetch/"),
  stripCropTransform: (url: string) => url.replace(/\/c_crop,[^/]+\//g, "/"),
  buildCropUrl: (url: string, opts: { x?: number; y?: number; width?: number; height?: number }) => {
    if (!url.includes("/image/upload/")) return url;
    const seg = `c_crop,w_${Math.round(opts.width ?? 0)},h_${Math.round(opts.height ?? 0)},x_${Math.round(opts.x ?? 0)},y_${Math.round(opts.y ?? 0)}`;
    return url.replace("/image/upload/", `/image/upload/${seg}/`);
  },
  buildOptimizedUrl: (url: string, opts?: { width?: number; height?: number; quality?: string; format?: string }) => {
    if (!/cloudinary\.com\/.*\/image\/upload\//i.test(url)) return url;
    const parts = [
      opts?.width ? `w_${Math.round(opts.width)}` : "",
      opts?.height ? `h_${Math.round(opts.height)}` : "",
      opts?.quality ? `q_${opts.quality}` : "",
      opts?.format ? `f_${opts.format}` : "",
    ].filter(Boolean);
    if (parts.length === 0) return url;
    return url.replace("/image/upload/", `/image/upload/${parts.join(",")}/`);
  },
}));

vi.mock("@/contexts/AdminSaveContext", () => ({
  useAdminSave: () => ({
    saveStatus: "idle",
  }),
}));

vi.mock("@/hooks/useAtlasOrder", () => ({
  useAtlasOrder: () => ({
    cardOrder: {},
    reorderCards: vi.fn(),
  }),
}));

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  atlasFibersMock = [
    {
      id: "hemp",
      name: "hemp",
      category: "fiber",
      image: "https://example.com/hemp-hero.jpg",
      galleryImages: [{ url: "https://example.com/hemp-hero.jpg" }],
    },
  ];
  updateFiberMock.mockReset();
  getFiberByIdMock.mockReset();
  uploadToCloudinaryMock.mockReset();
  uploadFromUrlMock.mockReset();
  uploadToCloudinaryMock.mockResolvedValue("https://res.cloudinary.com/demo/image/upload/v1/new-drop.jpg");
  uploadFromUrlMock.mockResolvedValue("https://res.cloudinary.com/demo/image/upload/v1/new-drop-url.jpg");
  getFiberByIdMock.mockImplementation((id: string) => ({ id }));
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
  });
});

afterEach(() => {
  cleanup();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: originalLocalStorage,
  });
});

describe("ImageDatabaseManager view mode layouts", () => {
  it("renders synthetic navigation parent profiles in ImageBase", async () => {
    getFiberByIdMock.mockImplementation((id: string) =>
      atlasFibersMock.some((f) => f.id === id) ? { id } : undefined
    );
    render(<ImageDatabaseManager viewMode="list" />);

    await waitFor(() => {
      expect(screen.getByTestId("image-db-profile-plant-cellulose")).toBeTruthy();
      expect(screen.getByTestId("image-db-profile-animal-protein")).toBeTruthy();
      expect(screen.getByTestId("image-db-profile-mineral-regenerated")).toBeTruthy();
    });
  });

  it("applies distinct layout classes for list/cards/grid", () => {
    const { rerender } = render(<ImageDatabaseManager viewMode="list" />);
    const listContainer = screen.getByTestId("image-db-content");
    expect(listContainer.getAttribute("data-view-mode")).toBe("list");
    expect(listContainer.className).toContain("space-y-3");
    expect(screen.queryAllByTestId("compact-profile-tile").length).toBe(0);

    rerender(<ImageDatabaseManager viewMode="cards" />);
    const cardsContainer = screen.getByTestId("image-db-content");
    expect(cardsContainer.getAttribute("data-view-mode")).toBe("cards");
    expect(cardsContainer.className).toContain("md:grid-cols-2");
    expect(screen.queryAllByTestId("compact-profile-tile").length).toBeGreaterThan(0);

    rerender(<ImageDatabaseManager viewMode="grid" />);
    const gridContainer = screen.getByTestId("image-db-content");
    expect(gridContainer.getAttribute("data-view-mode")).toBe("grid");
    expect(gridContainer.className).toContain("xl:grid-cols-4");
    expect(screen.queryAllByTestId("compact-profile-tile").length).toBeGreaterThan(0);
  });

  it("clamps effective thumbnail zoom only in grid mode", () => {
    expect(getEffectiveProfileZoom(80, "grid")).toBe(120);
    expect(getEffectiveProfileZoom(180, "grid")).toBe(180);
    expect(getEffectiveProfileZoom(400, "grid")).toBe(220);

    expect(getEffectiveProfileZoom(80, "cards")).toBe(80);
    expect(getEffectiveProfileZoom(400, "list")).toBe(400);
  });

  it("scrolls selected sidebar profile into centered ImageBase viewport", async () => {
    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });

    try {
      render(<ImageDatabaseManager viewMode="list" activeNodeId="hemp" />);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith(
          expect.objectContaining({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          })
        );
      });

      expect(screen.getByTestId("image-db-profile-hemp")).toBeTruthy();
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("hides draft profiles with no images unless selected from the sidebar", async () => {
    atlasFibersMock = [
      {
        id: "draft-only-profile",
        name: "draft-only-profile",
        category: "fiber",
        status: "draft",
        image: "",
        galleryImages: [],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) => atlasFibersMock.find((fiber) => fiber.id === id));
    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    try {
      const { rerender } = render(<ImageDatabaseManager viewMode="list" />);

      await waitFor(() => {
        expect(screen.queryByTestId("image-db-profile-draft-only-profile")).toBeNull();
      });

      rerender(<ImageDatabaseManager viewMode="list" activeNodeId="draft-only-profile" />);

      await waitFor(() => {
        expect(screen.getByTestId("image-db-profile-draft-only-profile")).toBeTruthy();
      });
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("shows draft profiles in ImageBase when they still have images", async () => {
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        status: "draft",
        image: "https://example.com/hemp-draft.jpg",
        galleryImages: [{ url: "https://example.com/hemp-draft.jpg" }],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) => atlasFibersMock.find((fiber) => fiber.id === id));
    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    try {
      render(<ImageDatabaseManager viewMode="list" />);
      await waitFor(() => {
        expect(screen.getByTestId("image-db-profile-hemp")).toBeTruthy();
      });
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("preserves existing selected-profile images when pasting from clipboard", async () => {
    atlasFibersMock = [
      {
        id: "selected-draft-profile",
        name: "selected-draft-profile",
        category: "fiber",
        status: "draft",
        image: "https://example.com/draft-hero.jpg",
        galleryImages: [
          { url: "https://example.com/draft-hero.jpg" },
          { url: "https://example.com/draft-secondary.jpg" },
        ],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) =>
      atlasFibersMock.find((fiber) => fiber.id === id),
    );

    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue("https://example.com/pasted.jpg"),
      },
    });
    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    try {
      render(
        <ImageDatabaseManager
          viewMode="list"
          activeNodeId="selected-draft-profile"
          searchQueryInput="selected-draft-profile"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("image-db-profile-selected-draft-profile")).toBeTruthy();
      });

      const profileRow = screen.getByTestId("image-db-profile-selected-draft-profile");
      fireEvent.click(
        within(profileRow).getByRole("button", { name: /paste image from clipboard/i }),
      );

      await waitFor(() => {
        expect(updateFiberMock).toHaveBeenCalledWith(
          "selected-draft-profile",
          expect.objectContaining({
            image: "https://example.com/draft-hero.jpg",
            galleryImages: [
              expect.objectContaining({ url: "https://example.com/draft-hero.jpg" }),
              expect.objectContaining({ url: "https://example.com/draft-secondary.jpg" }),
              expect.objectContaining({
                url: "https://res.cloudinary.com/demo/image/upload/v1/new-drop-url.jpg",
              }),
            ],
          }),
        );
      });
      expect(uploadFromUrlMock).toHaveBeenCalledWith(
        "https://example.com/pasted.jpg",
        expect.any(Object),
        { folder: "atlas" },
      );
    } finally {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("reorders selected-profile images from context menu when local cache is missing", async () => {
    atlasFibersMock = [
      {
        id: "selected-draft-profile",
        name: "selected-draft-profile",
        category: "fiber",
        status: "draft",
        image: "https://example.com/draft-hero.jpg",
        galleryImages: [
          { url: "https://example.com/draft-hero.jpg" },
          { url: "https://example.com/draft-secondary.jpg" },
        ],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) =>
      atlasFibersMock.find((fiber) => fiber.id === id),
    );
    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    try {
      render(
        <ImageDatabaseManager
          viewMode="list"
          activeNodeId="selected-draft-profile"
          searchQueryInput="selected-draft-profile"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("image-db-profile-selected-draft-profile")).toBeTruthy();
      });

      const imageTiles = screen.getAllByAltText(/selected-draft-profile \d+$/i);
      expect(imageTiles.length).toBeGreaterThan(1);
      fireEvent.contextMenu(imageTiles[0], { clientX: 80, clientY: 100 });
      fireEvent.click(screen.getByRole("button", { name: /send to back/i }));

      await waitFor(() => {
        expect(updateFiberMock).toHaveBeenCalledWith(
          "selected-draft-profile",
          expect.objectContaining({
            image: "https://example.com/draft-secondary.jpg",
            galleryImages: [
              expect.objectContaining({ url: "https://example.com/draft-secondary.jpg" }),
              expect.objectContaining({ url: "https://example.com/draft-hero.jpg" }),
            ],
          }),
        );
      });
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("reorders selected-profile images via drag-and-drop when local cache is missing", async () => {
    atlasFibersMock = [
      {
        id: "selected-draft-profile",
        name: "selected-draft-profile",
        category: "fiber",
        status: "draft",
        image: "https://example.com/draft-hero.jpg",
        galleryImages: [
          { url: "https://example.com/draft-hero.jpg" },
          { url: "https://example.com/draft-secondary.jpg" },
        ],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) =>
      atlasFibersMock.find((fiber) => fiber.id === id),
    );

    const originalScrollIntoView = (
      HTMLElement.prototype as HTMLElement & {
        scrollIntoView?: (options?: ScrollIntoViewOptions | boolean) => void;
      }
    ).scrollIntoView;
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const startTransitionSpy = vi
      .spyOn(React, "startTransition")
      .mockImplementation((callback: Parameters<typeof React.startTransition>[0]) => callback());

    try {
      render(
        <ImageDatabaseManager
          viewMode="list"
          activeNodeId="selected-draft-profile"
          searchQueryInput="selected-draft-profile"
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("image-db-profile-selected-draft-profile")).toBeTruthy();
      });

      const imageTiles = screen.getAllByAltText(/selected-draft-profile \d+$/i);
      expect(imageTiles.length).toBeGreaterThan(1);
      const firstTile = imageTiles[0].closest('[draggable="true"]');
      const secondTile = imageTiles[1].closest('[draggable="true"]');
      expect(firstTile).toBeTruthy();
      expect(secondTile).toBeTruthy();

      fireEvent.dragStart(firstTile as Element, {
        dataTransfer: { setData: vi.fn() },
      });
      fireEvent.dragOver(secondTile as Element);
      fireEvent.drop(secondTile as Element, {
        dataTransfer: {
          files: [],
          getData: () => "",
        },
      });

      await waitFor(() => {
        expect(updateFiberMock).toHaveBeenCalledWith(
          "selected-draft-profile",
          expect.objectContaining({
            image: "https://example.com/draft-secondary.jpg",
            galleryImages: [
              expect.objectContaining({ url: "https://example.com/draft-secondary.jpg" }),
              expect.objectContaining({ url: "https://example.com/draft-hero.jpg" }),
            ],
          }),
        );
      });
    } finally {
      startTransitionSpy.mockRestore();
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("shows only the focused profile and ignores search filtering", async () => {
    render(
      <ImageDatabaseManager
        viewMode="list"
        searchQueryInput="no-match-search"
        focusProfileId="hemp"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("image-db-profile-hemp")).toBeTruthy();
    });

    expect(screen.queryByTestId("image-db-profile-plant-cellulose")).toBeNull();
    expect(screen.queryByTestId("image-db-profile-animal-protein")).toBeNull();
  });

  it("uses responsive image hints and priority loading for above-the-fold compact tiles", () => {
    atlasFibersMock = [
      {
        id: "alpha",
        name: "alpha",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/atlas/alpha.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/alpha.jpg" }],
      },
      {
        id: "beta",
        name: "beta",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/atlas/beta.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/beta.jpg" }],
      },
      {
        id: "gamma",
        name: "gamma",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/atlas/gamma.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/gamma.jpg" }],
      },
      {
        id: "delta",
        name: "delta",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/atlas/delta.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/delta.jpg" }],
      },
      {
        id: "epsilon",
        name: "epsilon",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/atlas/epsilon.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/atlas/epsilon.jpg" }],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) => {
      const fiber = atlasFibersMock.find((f) => f.id === id);
      return fiber ? { ...fiber, status: "published" } : undefined;
    });

    render(<ImageDatabaseManager viewMode="grid" />);

    const previews = screen.getAllByAltText(/ preview$/);
    expect(previews.length).toBeGreaterThanOrEqual(2);
    const lastPreview = previews[previews.length - 1];

    const eagerCloudinary = previews.find(
      (img) =>
        img.getAttribute("loading") === "eager" &&
        (img.getAttribute("src") || "").includes("res.cloudinary.com"),
    );
    expect(eagerCloudinary).toBeTruthy();
    expect(eagerCloudinary!.getAttribute("fetchpriority")).toBe("high");
    expect(eagerCloudinary!.getAttribute("decoding")).toBe("async");
    expect(eagerCloudinary!.getAttribute("sizes")).toContain("50vw");
    const eagerSrcset = eagerCloudinary!.getAttribute("srcset");
    expect(eagerSrcset).toBeTruthy();
    // Upload URLs get w_* transforms from buildOptimizedUrl; image/fetch URLs keep full fetch URLs with 420w descriptors.
    expect(eagerSrcset!).toMatch(/\b420w\b/);

    expect(lastPreview.getAttribute("loading")).toBe("lazy");
    expect(lastPreview.getAttribute("fetchpriority")).toBe("auto");
  });

  it("closes the right-click context menu when clicking outside", () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const imageTile = screen.getAllByAltText(/ \d+$/)[0];
    fireEvent.contextMenu(imageTile, { clientX: 100, clientY: 120 });

    expect(screen.getByText("Copy URL")).toBeTruthy();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByText("Copy URL")).toBeNull();
  });

  it("shows a Download Image option when right-clicking an image in lightbox", () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const imageTile = screen.getAllByAltText(/ \d+$/)[0];
    fireEvent.click(imageTile);

    const lightbox = screen.getByTestId("lightbox-root");
    const lightboxImage = within(lightbox).getByAltText("hemp 1");
    fireEvent.contextMenu(lightboxImage, { clientX: 100, clientY: 120 });

    const downloadButtons = screen.getAllByRole("button", { name: "Download Image" });
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it("offers Crop from lightbox context menu for Cloudinary delivery URLs", () => {
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        image: "https://res.cloudinary.com/demo/image/upload/v1/hemp.jpg",
        galleryImages: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/hemp.jpg" }],
      },
    ];
    render(<ImageDatabaseManager viewMode="list" />);

    fireEvent.click(screen.getAllByAltText(/ \d+$/)[0]);
    const lightbox = screen.getByTestId("lightbox-root");
    const lightboxImage = within(lightbox).getByAltText("hemp 1");
    fireEvent.contextMenu(lightboxImage, { clientX: 100, clientY: 120 });

    fireEvent.click(screen.getByRole("button", { name: "Crop in fullscreen" }));

    expect(screen.getByRole("group", { name: /crop controls/i })).toBeTruthy();
  });

  it("shows a Download Image button directly in lightbox chrome", () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const imageTile = screen.getAllByAltText(/ \d+$/)[0];
    fireEvent.click(imageTile);

    expect(screen.getByRole("button", { name: "Download Image" })).toBeTruthy();
  });

  it("syncs reordered hero image into atlas fiber data", async () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas-images") {
        return JSON.stringify({
          hemp: ["https://example.com/hero-a.jpg", "https://example.com/hero-b.jpg"],
        });
      }
      return null;
    });
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        image: "https://example.com/hero-a.jpg",
        galleryImages: [
          { url: "https://example.com/hero-a.jpg" },
          { url: "https://example.com/hero-b.jpg" },
        ],
      },
    ];

    render(<ImageDatabaseManager viewMode="list" />);

    const imageTile = screen.getAllByAltText(/ \d+$/)[0];
    fireEvent.contextMenu(imageTile, { clientX: 80, clientY: 100 });
    fireEvent.click(screen.getByRole("button", { name: /send to back/i }));

    await waitFor(() => {
      expect(updateFiberMock).toHaveBeenCalledWith(
        "hemp",
        expect.objectContaining({
          image: "https://example.com/hero-b.jpg",
          galleryImages: [
            expect.objectContaining({ url: "https://example.com/hero-b.jpg" }),
            expect.objectContaining({ url: "https://example.com/hero-a.jpg" }),
          ],
        }),
      );
    });
  });

  it("uploads dropped image files on a profile card and appends them to that profile", async () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const profileCard = screen.getByText("hemp").closest('[draggable="true"]');
    expect(profileCard).toBeTruthy();

    const file = new File(["fake-image"], "drop.jpg", { type: "image/jpeg" });
    fireEvent.drop(profileCard as Element, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(uploadToCloudinaryMock).toHaveBeenCalledWith(
        file,
        expect.objectContaining({
          cloudName: "atlas-cloud",
          uploadPreset: "atlas-preset",
        }),
        expect.objectContaining({ folder: "atlas" }),
      );
    });

    await waitFor(() => {
      expect(updateFiberMock).toHaveBeenCalledWith(
        "hemp",
        expect.objectContaining({
          galleryImages: expect.arrayContaining([
            expect.objectContaining({
              url: "https://res.cloudinary.com/demo/image/upload/v1/new-drop.jpg",
            }),
          ]),
        }),
      );
    });
  });

  it("uploads dropped image URLs on a profile card and appends them to that profile", async () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const profileCard = screen.getByText("hemp").closest('[draggable="true"]');
    expect(profileCard).toBeTruthy();

    const droppedUrl = "https://images.example.com/drop-url.jpg";
    const getData = vi.fn((mimeType: string) => {
      if (mimeType === "text/uri-list") return droppedUrl;
      return "";
    });

    fireEvent.drop(profileCard as Element, {
      dataTransfer: {
        files: [],
        getData,
      },
    });

    await waitFor(() => {
      expect(uploadFromUrlMock).toHaveBeenCalledWith(
        droppedUrl,
        expect.objectContaining({
          cloudName: "atlas-cloud",
          uploadPreset: "atlas-preset",
        }),
        expect.objectContaining({ folder: "atlas" }),
      );
    });

    await waitFor(() => {
      expect(updateFiberMock).toHaveBeenCalledWith(
        "hemp",
        expect.objectContaining({
          galleryImages: expect.arrayContaining([
            expect.objectContaining({
              url: "https://res.cloudinary.com/demo/image/upload/v1/new-drop-url.jpg",
            }),
          ]),
        }),
      );
    });
  });

  it("does not treat internal image reordering drag as URL upload", async () => {
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        image: "https://example.com/hero-a.jpg",
        galleryImages: [
          { url: "https://example.com/hero-a.jpg" },
          { url: "https://example.com/hero-b.jpg" },
        ],
      },
    ];

    render(<ImageDatabaseManager viewMode="list" />);

    const imageTiles = screen.getAllByAltText(/hemp \d+$/i);
    expect(imageTiles.length).toBeGreaterThan(1);

    fireEvent.dragStart(imageTiles[0]);
    fireEvent.drop(imageTiles[1], {
      dataTransfer: {
        files: [],
        getData: (mimeType: string) => {
          if (mimeType === "text/plain") return "https://example.com/hero-a.jpg";
          if (mimeType === "text/html") return '<img src="https://example.com/hero-a.jpg" />';
          return "";
        },
      },
    });

    await waitFor(() => {
      expect(updateFiberMock).toHaveBeenCalledWith(
        "hemp",
        expect.objectContaining({
          image: "https://example.com/hero-b.jpg",
          galleryImages: [
            expect.objectContaining({ url: "https://example.com/hero-b.jpg" }),
            expect.objectContaining({ url: "https://example.com/hero-a.jpg" }),
          ],
        }),
      );
    });

    expect(uploadFromUrlMock).not.toHaveBeenCalled();
  });

  it("clears drag dimming when profile drag ends without a drop", () => {
    render(<ImageDatabaseManager viewMode="list" />);

    const profileRow = screen.getByTestId("image-db-profile-hemp");
    const draggableCard = profileRow.querySelector('[draggable="true"]') as HTMLElement | null;
    expect(draggableCard).toBeTruthy();

    fireEvent.dragStart(draggableCard as HTMLElement);
    expect((draggableCard as HTMLElement).className).toContain("opacity-50");

    fireEvent.dragEnd(draggableCard as HTMLElement);
    expect((draggableCard as HTMLElement).className).not.toContain("opacity-50");
  });

  it("hydrates profile view from atlas fibers when local cache is stale", async () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas-images") {
        return JSON.stringify({
          hemp: ["https://example.com/stale-local-cache.jpg"],
        });
      }
      return null;
    });
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        image: "https://example.com/from-atlas.jpg",
        galleryImages: [{ url: "https://example.com/from-atlas.jpg" }],
      },
    ];

    render(<ImageDatabaseManager viewMode="list" />);

    await waitFor(() => {
      const imageTile = screen.getAllByAltText(/hemp \d+$/i)[0] as HTMLImageElement;
      expect(imageTile.src).toContain("https://example.com/from-atlas.jpg");
    });
  });

  it("keeps hydrated profiles expanded by default until collapse-all is clicked", async () => {
    const getItem = globalThis.localStorage.getItem as unknown as ReturnType<typeof vi.fn>;
    getItem.mockImplementation((key: string) => {
      if (key === "atlas-images") {
        return JSON.stringify({
          hemp: ["https://example.com/from-local-cache.jpg"],
        });
      }
      return null;
    });
    atlasFibersMock = [
      {
        id: "hemp",
        name: "hemp",
        category: "fiber",
        image: "https://example.com/hemp-live.jpg",
        galleryImages: [{ url: "https://example.com/hemp-live.jpg" }],
      },
    ];
    getFiberByIdMock.mockImplementation((id: string) => {
      const fiber = atlasFibersMock.find((f) => f.id === id);
      return fiber ? { ...fiber, status: "published" } : undefined;
    });

    render(<ImageDatabaseManager viewMode="list" />);

    await waitFor(() => {
      const profileRow = screen.getByTestId("image-db-profile-hemp");
      expect(profileRow).toBeTruthy();
      expect(within(profileRow).getByAltText(/hemp 1$/i)).toBeTruthy();
    });
  });

  it("opens ImageScout when the global open event is dispatched", async () => {
    render(<ImageDatabaseManager viewMode="list" />);

    window.dispatchEvent(
      new CustomEvent("admin:open-image-scout", {
        detail: {
          profileId: "hemp",
          query: "hemp fiber",
        },
      }),
    );

    await waitFor(() => {
      const panel = screen.getByTestId("image-scout-panel-proxy");
      expect(panel.textContent).toContain("hemp::hemp fiber");
    });
  });
});
