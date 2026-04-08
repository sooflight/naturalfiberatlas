/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NodeSidebar } from "./NodeSidebar";
import { dataSource } from "../../../../../src/app/data/data-provider";
import { toggleProfilePublishStatus } from "../ImageDatabaseManager";

vi.mock("../ImageDatabaseManager", () => ({
  toggleProfilePublishStatus: vi.fn(() => Promise.resolve()),
}));

describe("NodeSidebar knowledge fibers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("renders the knowledge section and keeps profile selection in ImageBase ids", () => {
    const onSelect = vi.fn();

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[
            { id: "alpaca", name: "Alpaca", category: "animal" },
            { id: "hemp", name: "Hemp", category: "plant" },
          ]}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^alpaca\b/i }));
    expect(onSelect).toHaveBeenCalledWith("alpaca");
  });

  it("opens profile context menu and routes to ImageBase", () => {
    const onSelect = vi.fn();

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[{ id: "alpaca", name: "Alpaca", category: "animal" }]}
        />
      </div>,
    );

    fireEvent.contextMenu(screen.getAllByTitle("Alpaca (animal)")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Go to ImageBase" }));

    expect(onSelect).toHaveBeenCalledWith("image-base");
  });

  it("toggles profile status from context menu", () => {
    const onSelect = vi.fn();

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[{ id: "alpaca", name: "Alpaca", category: "animal" }]}
        />
      </div>,
    );

    fireEvent.contextMenu(screen.getAllByTitle("Alpaca (animal)")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Toggle Live/Archived" }));

    expect(toggleProfilePublishStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        profileKey: "alpaca",
        profileId: "alpaca",
      }),
    );
  });

  it("shows inline live/archived switch and toggles status", () => {
    const onSelect = vi.fn();

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[{ id: "alpaca", name: "Alpaca", category: "animal" }]}
        />
      </div>,
    );

    const switchControl = screen.getAllByRole("switch", { name: /set profile status to/i })[0];
    expect(screen.getByTestId("node-sidebar-status-circle-alpaca")).toBeTruthy();
    fireEvent.click(switchControl);

    expect(toggleProfilePublishStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        profileKey: "alpaca",
        profileId: "alpaca",
      }),
    );
  });

  it("renders profile thumbnail in a block-sized frame", () => {
    const onSelect = vi.fn();

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[
            {
              id: "alpaca",
              name: "Alpaca",
              category: "animal",
              image: "https://example.com/alpaca.jpg",
            },
          ]}
        />
      </div>,
    );

    const thumbnail = screen.getByRole("img", { name: "Alpaca" });
    expect(thumbnail.getAttribute("src")).toBe("https://example.com/alpaca.jpg");
    expect(thumbnail.parentElement?.style.display).toBe("block");
  });

  it("starts with Archived Profiles collapsed by default", () => {
    const onSelect = vi.fn();
    const getFiberByIdSpy = vi.spyOn(dataSource, "getFiberById").mockImplementation((id: string) => {
      if (id === "jute") {
        return {
          id,
          name: "Jute",
          status: "archived",
          category: "fiber",
        } as ReturnType<typeof dataSource.getFiberById>;
      }
      return {
        id,
        name: "Hemp",
        status: "archived",
        category: "fiber",
      } as ReturnType<typeof dataSource.getFiberById>;
    });

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[
            { id: "hemp", name: "Hemp", category: "fiber" },
            { id: "jute", name: "Jute", category: "fiber" },
          ]}
        />
      </div>,
    );

    expect(screen.queryByTitle("Hemp (fiber)")).toBeNull();
    expect(screen.queryByTitle("Jute (fiber)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /archived profiles/i }));
    expect(screen.getByTitle("Hemp (fiber)")).toBeTruthy();
    expect(screen.getByTitle("Jute (fiber)")).toBeTruthy();

    getFiberByIdSpy.mockRestore();
  });

  it("counts AtlasData profiles in Live and footer totals", () => {
    const onSelect = vi.fn();
    const getFiberByIdSpy = vi.spyOn(dataSource, "getFiberById").mockImplementation((id: string) => {
      if (id === "hemp" || id === "knowledge-only-profile") {
        return {
          id,
          name: id === "hemp" ? "Hemp" : "Knowledge Only",
          status: "published",
          category: "fiber",
        } as ReturnType<typeof dataSource.getFiberById>;
      }
      return undefined;
    });

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[
            { id: "hemp", name: "Hemp", category: "fiber" },
            { id: "knowledge-only-profile", name: "Knowledge Only", category: "fiber" },
          ]}
        />
      </div>,
    );

    expect(screen.getByText(/^2 profiles$/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /live profiles/i }).textContent).toContain("2");

    getFiberByIdSpy.mockRestore();
  });

  it("deletes a profile from context menu", () => {
    const onSelect = vi.fn();
    const removeSpy = vi.spyOn(dataSource, "deleteFiber").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <div style={{ height: 600 }}>
        <NodeSidebar
          selectedId={null}
          onSelect={onSelect}
          knowledgeFibers={[{ id: "alpaca", name: "Alpaca", category: "animal" }]}
        />
      </div>,
    );

    fireEvent.contextMenu(screen.getAllByTitle("Alpaca (animal)")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Delete Profile" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith("alpaca");

    removeSpy.mockRestore();
    confirmSpy.mockRestore();
  });
});
