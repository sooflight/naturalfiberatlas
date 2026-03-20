import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GridView } from "./grid-view";
import { AtlasDataProvider } from "../context/atlas-data-context";
import { dataSource } from "../data/data-provider";
import { fibers as bundledFibers } from "../data/fibers";
import { MemoryRouter } from "react-router";
import * as atlasData from "../data/atlas-data";
import * as plateLayout from "../utils/plate-layout";

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("./profile-card", () => ({
  ProfileCard: ({
    id,
    image,
    onClick,
  }: {
    id: string;
    image: string;
    onClick?: () => void;
  }) => (
    <button type="button" data-testid={`profile-card-${id}`} data-image={image} onClick={onClick} />
  ),
}));

vi.mock("./detail-card", () => ({
  DetailCard: () => null,
}));

vi.mock("./lightbox", () => ({
  Lightbox: () => null,
}));

vi.mock("./screen-plate", () => ({
  ScreenPlate: () => null,
}));

vi.mock("./grid-skeleton", () => ({
  GridSkeleton: () => null,
}));

vi.mock("../hooks/use-image-brightness", () => ({
  useImageAnalysis: () => null,
}));

vi.mock("../hooks/use-fiber-detail", () => ({
  useFiberDetail: () => null,
  prefetchFiberDetails: () => {},
}));

vi.mock("../hooks/use-magnetic-tilt", () => ({
  useMagneticTilt: () => {},
}));

vi.mock("../hooks/use-column-count", () => ({
  useColumnCount: () => ({ cols: 4, gridGap: "12px" }),
}));

vi.mock("../hooks/use-virtual-grid", () => ({
  useVirtualGrid: () => ({
    visibleIds: null,
    observeCell: () => {},
  }),
}));

vi.mock("../hooks/use-detail-lifecycle", () => ({
  useDetailLifecycle: () => ({
    detailRevealed: false,
    detailPrimed: false,
    backdropActive: false,
    detailSettled: false,
  }),
}));

vi.mock("../hooks/use-lightbox-state", () => ({
  useLightboxState: () => ({
    lightboxFiberId: null,
    lightboxInitialIndex: 0,
    lightboxSourceRect: null,
    openLightbox: () => {},
    closeLightbox: () => {},
  }),
}));

vi.mock("../hooks/use-screen-plate-state", () => ({
  useScreenPlateState: () => ({
    screenPlateInfo: null,
    screenPlateEntries: [],
    getCellRect: () => null,
    openScreenPlate: () => {},
    closeScreenPlate: () => {},
  }),
}));

vi.mock("../utils/image-warmup", () => ({
  getWarmupPolicy: () => ({
    skip: false,
    startDelayMs: 2000,
    analysisBatchSize: 4,
    decodeBatchSize: 3,
  }),
  warmUpImageAnalysis: () => {},
}));

vi.mock("../utils/hash-routing", () => ({
  parseHash: () => ({ fiberId: null, category: null }),
  writeHash: () => {},
  saveScrollPosition: () => {},
  restoreScrollPosition: () => {},
}));

vi.mock("../utils/smooth-scroll", () => ({
  smoothScrollTo: () => {},
}));

function defaultPlateLayoutResult() {
  return {
    plateAssignments: new Map(),
    profileInhaleDelays: new Map(),
    detailInhaleDelays: new Map(),
    profileExhaleDelays: new Map(),
    detailExhaleDelays: new Map(),
    gallerySlotImages: new Map(),
    plateExitOffsets: new Map(),
  };
}

vi.mock("../utils/plate-layout", () => ({
  DETAIL_FADE: 0.2,
  EXHALE_EASE: "easeOut",
  computePlateLayout: vi.fn(() => defaultPlateLayoutResult()),
}));

vi.mock("../context/image-pipeline", () => ({
  useImagePipeline: () => ({
    transform: (url: string | undefined) => url ?? "",
  }),
}));

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

describe("GridView image sync", () => {
  const fetchMock = vi.fn(() => Promise.resolve({} as Response));

  beforeEach(() => {
    localStorage.clear();
    dataSource.resetToDefaults();
    dataSource.clearJournal();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(plateLayout.computePlateLayout).mockImplementation(() => defaultPlateLayoutResult());
  });

  it("updates rendered profile card hero when admin changes first gallery image", async () => {
    const sampleFiber = bundledFibers[0];
    const newHeroUrl = "https://example.com/ui-hero-from-admin.jpg";
    const search = sampleFiber.name;

    render(
      <AtlasDataProvider>
        <GridView hideHeader externalSearch={search} />
      </AtlasDataProvider>,
    );

    const card = await screen.findByTestId(`profile-card-${sampleFiber.id}`);
    const initialHero = dataSource.getFiberById(sampleFiber.id)?.image ?? "";
    expect(card).toHaveAttribute("data-image", initialHero);

    act(() => {
      dataSource.updateFiber(sampleFiber.id, {
        galleryImages: [
          { url: newHeroUrl },
          { url: "https://example.com/secondary.jpg" },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId(`profile-card-${sampleFiber.id}`)).toHaveAttribute(
        "data-image",
        newHeroUrl,
      );
    });
  });

  it("does not emit debug network calls while applying external search", async () => {
    const sampleFiber = bundledFibers[0];
    const nonMatchSearch = "__not-a-real-fiber-name__";
    const { rerender } = render(
      <AtlasDataProvider>
        <GridView hideHeader externalSearch={sampleFiber.name} />
      </AtlasDataProvider>,
    );

    await screen.findByTestId(`profile-card-${sampleFiber.id}`);

    rerender(
      <AtlasDataProvider>
        <GridView hideHeader externalSearch={nonMatchSearch} />
      </AtlasDataProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId(`profile-card-${sampleFiber.id}`)).not.toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows guided empty state and clears active filters", async () => {
    render(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    const input = await screen.findByLabelText("Search fibers");
    fireEvent.change(input, { target: { value: "__no-match__" } });

    await waitFor(() => {
      expect(screen.getByText("No fibers match this view")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(screen.queryByText("No fibers match this view")).not.toBeInTheDocument();
    });
  });

  it("prefetches selected and adjacent gallery payloads on fiber selection", async () => {
    const prefetchSpy = vi
      .spyOn(atlasData, "prefetchGalleryImagesForFibers")
      .mockResolvedValue(undefined);

    const sampleFiber = bundledFibers[0];
    render(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView hideHeader externalSearch={sampleFiber.name} />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId(`profile-card-${sampleFiber.id}`));

    await waitFor(() => {
      expect(prefetchSpy).toHaveBeenCalled();
    });

    prefetchSpy.mockRestore();
  });

  it("does not emit search-clear callback on profile click while filtered", async () => {
    const onSearchChange = vi.fn();
    render(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView externalSearch="cotton" onSearchChange={onSearchChange} />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    const cards = await screen.findAllByTestId(/profile-card-/);
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(onSearchChange).not.toHaveBeenCalledWith("");
    });
  });

  it("clears expanded profile when external nav filters change", async () => {
    const sampleFiber = bundledFibers[0];
    const { rerender } = render(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView hideHeader externalSearch={sampleFiber.name} externalCategory={sampleFiber.category} />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId(`profile-card-${sampleFiber.id}`));

    await waitFor(() => {
      const hasSelectedCall = vi
        .mocked(plateLayout.computePlateLayout)
        .mock.calls
        .some((call) => call[0] === sampleFiber.id);
      expect(hasSelectedCall).toBe(true);
    });

    rerender(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView
            hideHeader
            externalSearch={sampleFiber.name}
            externalCategory="fiber"
            externalFiberSubcategory="animal"
          />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const calls = vi.mocked(plateLayout.computePlateLayout).mock.calls;
      const lastCall = calls.at(-1);
      expect(lastCall?.[0]).toBeNull();
    });
  });

  it("hides draft profiles in non-admin mode", async () => {
    const sampleFiber = bundledFibers[0];

    act(() => {
      dataSource.updateFiber(sampleFiber.id, { status: "draft" });
    });

    render(
      <AtlasDataProvider>
        <GridView hideHeader externalSearch={sampleFiber.name} />
      </AtlasDataProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId(`profile-card-${sampleFiber.id}`)).not.toBeInTheDocument();
    });
  });

  it("renders virtual detail slots beyond filtered profile count when assignments exceed it", async () => {
    const sampleFiber = bundledFibers.find((f) => f.id === "hemp") ?? bundledFibers[0];
    const search = sampleFiber.name;

    const assignmentsBeyondFiltered = new Map<number, string>([
      [0, "about"],
      [1, "trade"],
      [2, "regions"],
      [3, "contactSheet"],
      [4, "seeAlso"],
      [5, "process"],
    ]);
    const delayMap = new Map<number, number>();
    for (let i = 0; i <= 6; i++) delayMap.set(i, 0);

    vi.mocked(plateLayout.computePlateLayout).mockReturnValue({
      plateAssignments: assignmentsBeyondFiltered,
      profileInhaleDelays: delayMap,
      detailInhaleDelays: delayMap,
      profileExhaleDelays: delayMap,
      detailExhaleDelays: delayMap,
      gallerySlotImages: new Map(),
      plateExitOffsets: new Map(),
    });

    const { container } = render(
      <MemoryRouter>
        <AtlasDataProvider>
          <GridView hideHeader externalSearch={search} />
        </AtlasDataProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByTestId(`profile-card-${sampleFiber.id}`));

    await waitFor(() => {
      const cells = container.querySelectorAll(".grid-cell");
      expect(cells.length).toBeGreaterThan(1);
    });

    const cells = container.querySelectorAll(".grid-cell");
    expect(cells.length).toBeGreaterThanOrEqual(6);
  });

  it("shows draft profiles in admin mode", async () => {
    const sampleFiber = bundledFibers[0];
    vi.stubEnv("VITE_ENABLE_ADMIN", "true");
    window.history.pushState({}, "", "/?admin");

    act(() => {
      dataSource.updateFiber(sampleFiber.id, { status: "draft" });
    });

    render(
      <AtlasDataProvider>
        <GridView hideHeader externalSearch={sampleFiber.name} />
      </AtlasDataProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId(`profile-card-${sampleFiber.id}`)).toBeInTheDocument();
    });

    vi.unstubAllEnvs();
    window.history.pushState({}, "", "/");
  });
});
