import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AtlasDataProvider, useAtlasData } from "./atlas-data-context";
import { dataSource } from "../data/data-provider";
import { fibers as bundledFibers } from "../data/fibers";

function FallbackProbe() {
  const { adminMode, canUndo, fibers } = useAtlasData();
  return (
    <div>
      <span data-testid="admin-mode">{String(adminMode)}</span>
      <span data-testid="can-undo">{String(canUndo)}</span>
      <span data-testid="fiber-count">{fibers.length}</span>
    </div>
  );
}

function ProviderProbe({ fiberId }: { fiberId: string }) {
  const { getFiberById } = useAtlasData();
  return <span data-testid="fiber-name">{getFiberById(fiberId)?.name}</span>;
}

function AdminGalleryHeroSyncProbe({ fiberId }: { fiberId: string }) {
  const { fiberIndex, getFiberById, updateFiber } = useAtlasData();
  const indexImage = fiberIndex.find((fiber) => fiber.id === fiberId)?.image ?? "";
  const galleryFirstImage = getFiberById(fiberId)?.galleryImages?.[0]?.url ?? "";

  return (
    <div>
      <span data-testid="index-image">{indexImage}</span>
      <span data-testid="gallery-first-image">{galleryFirstImage}</span>
      <button
        type="button"
        data-testid="admin-change-first-image"
        onClick={() => {
          updateFiber(fiberId, {
            galleryImages: [
              { url: "https://example.com/admin-new-hero.jpg" },
              { url: "https://example.com/admin-secondary.jpg" },
            ],
          });
        }}
      >
        change-first-image
      </button>
    </div>
  );
}

describe("atlas-data-context contracts", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ENABLE_ADMIN", "true");
    window.history.replaceState({}, "", "/");
    localStorage.clear();
    dataSource.resetToDefaults();
    dataSource.clearJournal();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw in test mode when provider is missing", () => {
    expect(() => render(<FallbackProbe />)).not.toThrow();
  });

  it("returns a safe fallback shape when used without provider", () => {
    render(<FallbackProbe />);

    expect(screen.getByTestId("admin-mode")).toHaveTextContent("false");
    expect(screen.getByTestId("can-undo")).toHaveTextContent("false");
    expect(Number(screen.getByTestId("fiber-count").textContent)).toBeGreaterThan(0);
  });

  it("reacts to datasource updates when wrapped in provider", async () => {
    const fiberId = bundledFibers[0].id;
    const originalName = bundledFibers[0].name;

    render(
      <AtlasDataProvider>
        <ProviderProbe fiberId={fiberId} />
      </AtlasDataProvider>,
    );

    expect(screen.getByTestId("fiber-name")).toHaveTextContent(originalName);

    act(() => {
      dataSource.updateFiber(fiberId, { name: "Provider Updated Name" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("fiber-name")).toHaveTextContent("Provider Updated Name");
    });
  });

  it("keeps frontend index image synced after admin-style gallery first-image update", async () => {
    const fiberId = bundledFibers[0].id;

    render(
      <AtlasDataProvider>
        <AdminGalleryHeroSyncProbe fiberId={fiberId} />
      </AtlasDataProvider>,
    );

    const beforeIndexImage = screen.getByTestId("index-image").textContent;
    const beforeGalleryFirstImage = screen.getByTestId("gallery-first-image").textContent;
    expect(beforeIndexImage).toBe(beforeGalleryFirstImage);

    fireEvent.click(screen.getByTestId("admin-change-first-image"));

    await waitFor(() => {
      expect(screen.getByTestId("gallery-first-image")).toHaveTextContent(
        "https://example.com/admin-new-hero.jpg",
      );
      expect(screen.getByTestId("index-image")).toHaveTextContent(
        "https://example.com/admin-new-hero.jpg",
      );
    });
  });

  it("starts in admin mode on legacy workbench aliases", () => {
    window.history.replaceState({}, "", "/workbench");

    render(
      <AtlasDataProvider>
        <FallbackProbe />
      </AtlasDataProvider>,
    );

    expect(screen.getByTestId("admin-mode")).toHaveTextContent("true");
  });
});
