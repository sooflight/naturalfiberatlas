import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { HomePage, mapNavToGridFilters } from "./home";

function renderHome(ui: ReactElement = <HomePage />) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

vi.mock("../components/grid-view", () => ({
  GridView: ({
    externalCategory,
    externalFiberSubcategory,
    externalSearch,
    onVisibleProfilesChange,
  }: {
    externalCategory?: string;
    externalFiberSubcategory?:
      | "plant"
      | "animal"
      | "regen"
      | "bast-fiber"
      | "bark-fiber"
      | "seed-fiber"
      | "leaf-fiber"
      | "grass-fiber"
      | "fruit-fiber"
      | "wool-fiber"
      | "silk-fiber"
      | "hair-fiber"
      | "specialty-protein"
      | null;
    externalSearch?: string;
    onVisibleProfilesChange?: (count: number) => void;
  }) => {
    onVisibleProfilesChange?.(7);
    return (
      <>
        <div data-testid="grid-search-prop">{externalSearch ?? ""}</div>
        <div data-testid="grid-category-prop">{externalCategory ?? ""}</div>
        <div data-testid="grid-fiber-subcategory-prop">{externalFiberSubcategory ?? ""}</div>
      </>
    );
  },
}));

vi.mock("../components/ui/use-mobile", () => ({
  useIsMobile: () => false,
}));

describe("HomePage search integration", () => {
  it("shows the visible profile count from GridView in TopNav", () => {
    renderHome();
    expect(screen.getByText("7 Profiles")).toBeInTheDocument();
  });

  it("propagates TopNav input to GridView externalSearch", async () => {
    renderHome();

    const input = screen.getByPlaceholderText("Search profiles...");
    const query = "zzzzzzzz-no-match";

    fireEvent.change(input, { target: { value: query } });

    expect(input).toHaveValue(query);
    await waitFor(() => {
      expect(screen.getByTestId("grid-search-prop")).toHaveTextContent(query);
    });
  });

  it("maps Layer 2 fiber nodes to fiber sub-filters", () => {
    expect(mapNavToGridFilters("plant")).toEqual({ category: "fiber", fiberSubcategory: "plant" });
    expect(mapNavToGridFilters("animal")).toEqual({ category: "fiber", fiberSubcategory: "animal" });
    expect(mapNavToGridFilters("regen")).toEqual({ category: "fiber", fiberSubcategory: "regen" });
  });

  it("maps Layer 3 fiber nodes to distinct sub-filters", () => {
    expect(mapNavToGridFilters("bast-fiber")).toEqual({ category: "fiber", fiberSubcategory: "bast-fiber" });
    expect(mapNavToGridFilters("bark-fiber")).toEqual({ category: "fiber", fiberSubcategory: "bark-fiber" });
    expect(mapNavToGridFilters("seed-fiber")).toEqual({ category: "fiber", fiberSubcategory: "seed-fiber" });
    expect(mapNavToGridFilters("leaf-fiber")).toEqual({ category: "fiber", fiberSubcategory: "leaf-fiber" });
    expect(mapNavToGridFilters("grass-fiber")).toEqual({ category: "fiber", fiberSubcategory: "grass-fiber" });
    expect(mapNavToGridFilters("fruit-fiber")).toEqual({ category: "fiber", fiberSubcategory: "fruit-fiber" });
  });

  it("maps Animal Layer 3 nodes to distinct sub-filters", () => {
    expect(mapNavToGridFilters("wool-fiber")).toEqual({ category: "fiber", fiberSubcategory: "wool-fiber" });
    expect(mapNavToGridFilters("silk-fiber")).toEqual({ category: "fiber", fiberSubcategory: "silk-fiber" });
    expect(mapNavToGridFilters("hair-fiber")).toEqual({ category: "fiber", fiberSubcategory: "hair-fiber" });
    expect(mapNavToGridFilters("specialty-protein")).toEqual({ category: "fiber", fiberSubcategory: "specialty-protein" });
  });

  it("applies Layer 2 click as a GridView fiber subcategory filter", async () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /Plant Plant/i }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("fiber");
      expect(screen.getByTestId("grid-fiber-subcategory-prop")).toHaveTextContent("plant");
    });
  });

  it("applies Layer 2 hover as preview and activates Layer 3 filtering", async () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /Plant Plant/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Bast Fiber/i })).toBeInTheDocument();
      expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("fiber");
      expect(screen.getByTestId("grid-fiber-subcategory-prop")).toHaveTextContent("plant");
    });

    fireEvent.click(screen.getByRole("button", { name: /Bast Fiber/i }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("fiber");
      expect(screen.getByTestId("grid-fiber-subcategory-prop")).toHaveTextContent("bast-fiber");
    });
  });

  it("applies Animal Layer 3 click as a specific filter", async () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: /Animal Animal/i }));
    fireEvent.click(screen.getByRole("button", { name: /Wool Wool/i }));

    await waitFor(() => {
      expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("fiber");
      expect(screen.getByTestId("grid-fiber-subcategory-prop")).toHaveTextContent("wool-fiber");
    });
  });

  it("debounces hover preview filter updates", async () => {
    renderHome();

    expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("all");

    fireEvent.mouseEnter(screen.getByRole("button", { name: /Plant Plant/i }));

    expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("all");

    await waitFor(() => {
      expect(screen.getByTestId("grid-category-prop")).toHaveTextContent("fiber");
      expect(screen.getByTestId("grid-fiber-subcategory-prop")).toHaveTextContent("plant");
    });
  });
});
