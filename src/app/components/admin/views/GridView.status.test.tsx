/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { GridView } from "./GridView";

const baseItem = {
  id: "hemp",
  imageCount: 3,
  completeness: 80,
  mappedFields: 4,
  totalFields: 5,
  status: "archived" as const,
  lastModified: new Date("2026-03-16T00:00:00.000Z"),
};

describe("GridView status switch", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a switch and calls onToggleStatus", () => {
    const onToggleStatus = vi.fn();

    render(
      <GridView
        items={[baseItem]}
        selectedId={null}
        onSelect={() => {}}
        onToggleStatus={onToggleStatus}
      />,
    );

    const statusSwitch = screen.getByRole("switch", { name: /set profile status to live/i });
    expect(statusSwitch.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(statusSwitch);
    expect(onToggleStatus).toHaveBeenCalledWith("hemp");
  });

  it("renders status circle with correct color for live", () => {
    render(
      <GridView
        items={[{ ...baseItem, status: "published" as const }]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    const statusSwitch = screen.getByTestId("grid-status-circle-hemp");
    expect(statusSwitch.className).toContain("bg-emerald-500");
  });

  it("renders status circle with archived color when item is archived", () => {
    render(
      <GridView
        items={[{ ...baseItem, status: "archived" as const }]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );

    const statusSwitch = screen.getByTestId("grid-status-circle-hemp");
    expect(statusSwitch.className).toContain("bg-amber-300");
  });

  it("disables status switch while saving", () => {
    const onToggleStatus = vi.fn();

    render(
      <GridView
        items={[{ ...baseItem, status: "published" as const }]}
        selectedId={null}
        onSelect={() => {}}
        onToggleStatus={onToggleStatus}
        statusSavingById={{ hemp: true }}
      />,
    );

    const statusSwitch = screen.getAllByRole("switch", { name: /set profile status to archived/i })[0];
    expect(statusSwitch.hasAttribute("disabled")).toBe(true);
    fireEvent.click(statusSwitch);
    expect(onToggleStatus).not.toHaveBeenCalled();
  });

  it("uses a consistent 5:7 aspect frame for each grid tile", () => {
    render(
      <GridView
        items={[
          { ...baseItem, heroImage: { id: "hemp-hero", url: "https://example.com/hemp.jpg" } },
          { ...baseItem, id: "flax", heroImage: { id: "flax-hero", url: "https://example.com/flax.jpg" } },
        ]}
        selectedId={null}
        onSelect={() => {}}
        onReorder={() => {}}
      />,
    );

    const tiles = screen.getAllByTestId("compact-profile-tile");
    const firstTile = tiles[tiles.length - 1];
    expect(firstTile.className).toContain("aspect-[5/7]");
    expect(firstTile.getAttribute("draggable")).toBe("true");
  });
});
