import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FiberProfile } from "../data/atlas-data";

vi.mock("./map-helpers", () => ({
  resolveRegionDots: () => [
    { x: 10, y: 20, label: "India" },
    { x: 40, y: 50, label: "Peru" },
  ],
  InteractiveWorldMap: ({ highlightIndex }: { highlightIndex?: number | null }) => (
    <div data-testid="mock-world-map">highlight:{String(highlightIndex ?? null)}</div>
  ),
  SustainabilityRadar: () => null,
  getSustainabilityMetrics: () => [],
}));

import { RegionsPlate } from "./detail-plates";

const baseFiber: FiberProfile = {
  id: "hemp",
  name: "Hemp",
  image: "https://example.com/hemp.jpg",
  category: "fiber",
  subtitle: "test",
  about: "test about",
  tags: [],
  regions: ["India", "Peru"],
  seasonality: "",
  priceRange: { raw: "" },
  translationCount: 0,
  typicalMOQ: { quantity: 0, unit: "kg" },
  leadTime: { minWeeks: 0, maxWeeks: 0 },
  profilePills: {
    scientificName: "",
    plantPart: "",
    handFeel: "",
    fiberType: "",
    era: "",
    origin: "",
  },
  sustainability: {
    environmentalRating: 1,
    waterUsage: 1,
    carbonFootprint: 1,
    chemicalProcessing: 1,
    circularity: 1,
    biodegradable: true,
    recyclable: true,
    certifications: [],
  },
  seeAlso: [],
  galleryImages: [],
  schemaVersion: 1,
};

describe("RegionsPlate", () => {
  it("renders region chips and links chip hover to map highlight", () => {
    render(<RegionsPlate fiber={baseFiber} />);

    const indiaChip = screen.getByRole("button", { name: "India" });
    expect(indiaChip).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Peru" })).toBeInTheDocument();
    expect(screen.getByTestId("mock-world-map")).toHaveTextContent("highlight:null");

    fireEvent.mouseEnter(indiaChip);
    expect(screen.getByTestId("mock-world-map")).toHaveTextContent("highlight:0");

    fireEvent.mouseLeave(indiaChip);
    expect(screen.getByTestId("mock-world-map")).toHaveTextContent("highlight:null");
  });
});

