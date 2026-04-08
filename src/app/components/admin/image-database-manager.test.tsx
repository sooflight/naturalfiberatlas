import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ImageDatabaseManager } from "./image-database-manager";

const updateFiberMock = vi.fn();
let fibersMock = [
  {
    id: "hemp",
    name: "Hemp",
    status: "published" as const,
    image: "https://example.com/hero.jpg",
    galleryImages: [
      { url: "https://example.com/hero.jpg" },
      { url: "https://example.com/detail.jpg" },
    ],
    tags: [],
  },
];

vi.mock("../../context/atlas-data-context", () => ({
  useAtlasData: () => ({
    fibers: fibersMock,
    updateFiber: updateFiberMock,
  }),
}));

describe("ImageDatabaseManager", () => {
  beforeEach(() => {
    updateFiberMock.mockReset();
    fibersMock = [
      {
        id: "hemp",
        name: "Hemp",
        status: "published",
        image: "https://example.com/hero.jpg",
        galleryImages: [
          { url: "https://example.com/hero.jpg" },
          { url: "https://example.com/detail.jpg" },
        ],
        tags: [],
      },
    ];
  });

  it("renders a live/archived status control and toggles status", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    const statusSwitch = screen.getByRole("switch", { name: /set profile status to archived/i });
    expect(statusSwitch.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("workspace-status-circle-hemp").className).toContain("bg-emerald-500");

    fireEvent.click(statusSwitch);
    expect(updateFiberMock).toHaveBeenCalledWith("hemp", { status: "archived" });
  });

  it("renders preview thumbnails for profile images", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    expect(screen.getByAltText("Hemp image 1")).toBeInTheDocument();
    expect(screen.getByAltText("Hemp image 2")).toBeInTheDocument();
  });

  it("places archived profiles in a collapsed Archived section at the bottom", () => {
    fibersMock = [
      {
        id: "hemp",
        name: "Hemp",
        status: "published",
        image: "https://example.com/hemp.jpg",
        galleryImages: [{ url: "https://example.com/hemp.jpg" }],
        tags: [],
      },
      {
        id: "wool",
        name: "Wool",
        status: "published",
        image: "https://example.com/wool.jpg",
        galleryImages: [{ url: "https://example.com/wool.jpg" }],
        tags: [],
      },
      {
        id: "old-fiber",
        name: "Old Fiber",
        status: "archived",
        image: "https://example.com/old.jpg",
        galleryImages: [{ url: "https://example.com/old.jpg" }],
        tags: [],
      },
    ];

    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    expect(screen.getByText("Hemp")).toBeInTheDocument();
    expect(screen.getByText("Wool")).toBeInTheDocument();
    expect(screen.queryByText("Old Fiber")).not.toBeInTheDocument();

    const archivedToggle = screen.getByRole("button", { name: /archived/i });
    fireEvent.click(archivedToggle);

    expect(screen.getByText("Old Fiber")).toBeInTheDocument();
  });

  it("opens a lightbox when a thumbnail is clicked", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.click(screen.getByAltText("Hemp image 1"));

    expect(screen.getByRole("dialog", { name: "Image preview" })).toBeInTheDocument();
    expect(screen.getByAltText("Hemp preview")).toBeInTheDocument();
  });

  it("renders the lightbox with black glass background treatment", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.click(screen.getByAltText("Hemp image 1"));

    const dialog = screen.getByRole("dialog", { name: "Image preview" });
    expect(dialog.className).toContain("bg-black/90");
    expect(dialog.className).not.toContain("backdrop-blur");
  });

  it("keeps preview image sharp and capped to 88vh", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.click(screen.getByAltText("Hemp image 1"));

    const preview = screen.getByAltText("Hemp preview");
    const tokens = preview.className.split(/\s+/);
    expect(preview.className).toContain("max-h-[88vh]");
    expect(preview.className).toContain("max-w-[92vw]");
    expect(tokens).not.toContain("w-full");
    expect(preview.className).not.toContain("bg-black/40");
    expect(preview.className).not.toContain("blur");
  });

  it("shows a download option on thumbnail right-click", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.contextMenu(screen.getByAltText("Hemp image 1"));

    expect(screen.getByRole("button", { name: "Download Image" })).toBeInTheDocument();
  });

  it("shows a download option when right-clicking the thumbnail tile wrapper", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.contextMenu(screen.getByRole("button", { name: "Hemp image 1" }));

    expect(screen.getByRole("button", { name: "Download Image" })).toBeInTheDocument();
  });

  it("shows a download option on lightbox right-click", () => {
    render(
      <ImageDatabaseManager
        onOpenScoutForProfile={() => {}}
        onSelectProfile={() => {}}
      />,
    );

    fireEvent.click(screen.getByAltText("Hemp image 1"));
    fireEvent.contextMenu(screen.getByAltText("Hemp preview"));

    expect(screen.getByRole("button", { name: "Download Image" })).toBeInTheDocument();
  });
});
