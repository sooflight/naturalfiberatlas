/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { FiberEditor } from "./fiber-editor";

const mockGetFiberById = vi.fn();
const mockUpdateFiber = vi.fn();

vi.mock("../../context/atlas-data-context", () => ({
  useAtlasData: () => ({
    getFiberById: mockGetFiberById,
    updateFiber: mockUpdateFiber,
    version: 1,
    fiberIndex: [],
  }),
}));

vi.mock("../../data/data-provider", () => ({
  dataSource: {
    getFiberOverrideKeys: () => [],
    getBundledFiber: () => undefined,
    removeFiberOverride: vi.fn(),
    removeFieldOverride: vi.fn(),
    updateFiber: vi.fn(),
  },
}));

vi.mock("./supplementary-editors", () => ({
  ProcessEditor: () => <div data-testid="process-editor" />,
  AnatomyEditor: () => <div data-testid="anatomy-editor" />,
  CareEditor: () => <div data-testid="care-editor" />,
  QuoteEditor: () => <div data-testid="quote-editor" />,
  WorldNamesEditor: () => <div data-testid="world-names-editor" />,
}));

vi.mock("./gallery-editor", () => ({
  GalleryEditor: () => <div data-testid="gallery-editor" />,
}));

vi.mock("./image-quick-actions", () => ({
  ImageQuickActions: ({ onAddImages }: { onAddImages: (urls: string[], mode: "direct" | "upload") => void }) => (
    <button
      data-testid="image-quick-actions"
      onClick={() => onAddImages(["https://example.com/new.jpg"], "direct")}
    >
      Add Quick Image
    </button>
  ),
}));

vi.mock("../plate-primitives", () => ({
  splitAboutText: (text: string) => [text, ""],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("FiberEditor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpdateFiber.mockReset();
    mockGetFiberById.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders even when legacy fiber data is missing sustainability", () => {
    mockGetFiberById.mockReturnValue({
      id: "hemp",
      name: "Hemp",
      image: "https://example.com/hemp.jpg",
      category: "fiber",
      subtitle: "Subtitle",
      about: "About hemp.",
      tags: ["bast"],
      regions: ["Global"],
      seasonality: "All year",
      priceRange: { raw: "$1-2 / kg" },
      translationCount: 1,
      typicalMOQ: { quantity: 100, unit: "kg" },
      leadTime: { minWeeks: 2, maxWeeks: 4 },
      profilePills: {
        scientificName: "Cannabis Sativa",
        plantPart: "Stalk",
        handFeel: "Coarse",
        fiberType: "Bast",
        era: "Ancient",
        origin: "Asia",
      },
      // Intentionally omitted sustainability to reproduce runtime crash.
      seeAlso: [],
      galleryImages: [],
      schemaVersion: 1,
    });

    render(
      <MemoryRouter>
        <FiberEditor fiberId="hemp" />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sustainability")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /sustainability/i }));
    expect(screen.getByText("Water Usage")).toBeTruthy();
  });

  it("preserves existing hero image when quick-adding to legacy profile without galleryImages", () => {
    mockGetFiberById.mockReturnValue({
      id: "hemp",
      name: "Hemp",
      image: "https://example.com/existing-hero.jpg",
      category: "fiber",
      subtitle: "Subtitle",
      about: "About hemp.",
      tags: ["bast"],
      regions: ["Global"],
      seasonality: "All year",
      priceRange: { raw: "$1-2 / kg" },
      translationCount: 1,
      typicalMOQ: { quantity: 100, unit: "kg" },
      leadTime: { minWeeks: 2, maxWeeks: 4 },
      profilePills: {
        scientificName: "Cannabis Sativa",
        plantPart: "Stalk",
        handFeel: "Coarse",
        fiberType: "Bast",
        era: "Ancient",
        origin: "Asia",
      },
      sustainability: {
        environmentalRating: 2,
        waterUsage: 2,
        carbonFootprint: 2,
        chemicalProcessing: 2,
        circularity: 3,
        biodegradable: true,
        recyclable: false,
        certifications: [],
      },
      seeAlso: [],
      galleryImages: [],
      schemaVersion: 1,
    });

    render(
      <MemoryRouter>
        <FiberEditor fiberId="hemp" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Quick Image" }));
    vi.runAllTimers();

    expect(mockUpdateFiber).toHaveBeenCalledWith(
      "hemp",
      expect.objectContaining({
        image: "https://example.com/existing-hero.jpg",
        galleryImages: [
          expect.objectContaining({ url: "https://example.com/existing-hero.jpg" }),
          expect.objectContaining({ url: "https://example.com/new.jpg" }),
        ],
      }),
    );
  });
});

