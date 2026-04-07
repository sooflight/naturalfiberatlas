import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnatomyPlate, CarePlate, WorldNamesPlate, getSupplementalProfileTags } from "./detail-plates";
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
  it("renders all anatomy metrics in a scrollable card", () => {
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
    expect(screen.getByText("Moisture")).toBeInTheDocument();
    expect(screen.getByText("Staple Len.")).toBeInTheDocument();
    expect(screen.queryByText(/additional metrics/)).not.toBeInTheDocument();
    anatomySpy.mockRestore();
  });
});

describe("getSupplementalProfileTags", () => {
  it("drops tags that match a full property value (case-insensitive)", () => {
    const fiber: FiberProfile = {
      ...baseFiber,
      category: "fiber",
      tags: ["Fiber", "Industrial"],
      profilePills: {
        ...baseFiber.profilePills,
        origin: "China",
        plantPart: "Stalk",
        handFeel: "Soft",
        fiberType: "Bast Fiber",
        era: "~1000 BCE",
      },
    };
    expect(getSupplementalProfileTags(fiber)).toEqual(["Industrial"]);
  });

  it("drops single-word tags that appear as a word in a property value", () => {
    const fiber: FiberProfile = {
      ...baseFiber,
      category: "fiber",
      tags: ["Bast", "Sustainable"],
      profilePills: {
        ...baseFiber.profilePills,
        origin: "Asia",
        plantPart: "Stalk",
        handFeel: "Coarse",
        fiberType: "Bast Fiber",
        era: "~8000 BCE",
      },
    };
    expect(getSupplementalProfileTags(fiber)).toEqual(["Sustainable"]);
  });

  it("keeps multi-word tags even when one word appears in a property value", () => {
    const fiber: FiberProfile = {
      ...baseFiber,
      category: "textile",
      tags: ["Satin Weave", "Fluid"],
      profilePills: {
        ...baseFiber.profilePills,
        origin: "France",
        plantPart: "Filament",
        handFeel: "Liquid-Smooth",
        fiberType: "Woven Silk Textile",
        era: "~1700s",
      },
    };
    expect(getSupplementalProfileTags(fiber)).toEqual(["Satin Weave", "Fluid"]);
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

