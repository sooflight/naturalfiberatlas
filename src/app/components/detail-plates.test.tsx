import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnatomyPlate, CarePlate, WorldNamesPlate } from "./detail-plates";
import { dataSource } from "../data/data-provider";
import type { FiberProfile } from "../data/atlas-data";

const baseFiber: FiberProfile = {
  id: "hemp",
  name: "Hemp",
  image: "https://example.com/hemp.jpg",
  category: "fiber",
  subtitle: "test",
  about: "test about",
  tags: [],
  regions: [],
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

describe("CarePlate", () => {
  it("renders safely when care data omits commonUses", () => {
    const careSpy = vi.spyOn(dataSource, "getCareData").mockReturnValue({
      hemp: {
        washTemp: "cold",
        dryMethod: "line dry",
        ironTemp: "low",
        specialNotes: "none",
      } as never,
    });

    expect(() => render(<CarePlate fiber={baseFiber} />)).not.toThrow();
    expect(screen.getByText("Care & Use")).toBeInTheDocument();
    careSpy.mockRestore();
  });
});

describe("AnatomyPlate", () => {
  it("renders visible raw values and disclosure for overflow anatomy metrics", () => {
    const anatomySpy = vi.spyOn(dataSource, "getAnatomyData").mockReturnValue({
      hemp: {
        diameter: { raw: "16-50 μm" },
        crossSection: "Polygonal",
        surfaceTexture: "Rough",
        length: { raw: "5-55 mm" },
        tensileStrength: { raw: "550-900 MPa" },
        moistureRegain: { raw: "12%", percentage: 12 },
      } as never,
    });

    expect(() => render(<AnatomyPlate fiber={baseFiber} />)).not.toThrow();
    expect(screen.getByText("550-900 MPa")).toBeInTheDocument();
    expect(screen.getByText("+2 additional metrics")).toBeInTheDocument();
    anatomySpy.mockRestore();
  });
});

describe("WorldNamesPlate", () => {
  it("renders a language label for every world name (none empty)", () => {
    const worldNamesSpy = vi.spyOn(dataSource, "getWorldNames").mockReturnValue({
      hemp: ["Hemp", "大麻 (Dàmá)", "Hanf", "Chanvre", "Pamuk", "Randu", "China Grass"],
    });

    render(<WorldNamesPlate fiber={baseFiber} />);
    expect(screen.getByText("World Names")).toBeInTheDocument();
    expect(screen.getByText("Chinese (Mandarin)")).toBeInTheDocument();
    expect(screen.getByText("German")).toBeInTheDocument();
    expect(screen.getByText("French")).toBeInTheDocument();
    expect(screen.getByText("Turkish")).toBeInTheDocument();
    expect(screen.getByText("Indonesian")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    worldNamesSpy.mockRestore();
  });
});

