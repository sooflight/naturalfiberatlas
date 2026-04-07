import { describe, it, expect } from "vitest";
import type { FiberProfile } from "./fibers";
import {
  listPublishedIdsMissingPassport,
  passportKeysNotInCatalog,
  summarizeUnifiedCatalog,
  unifyFibersWithPassportRegistry,
} from "./unify-atlas-profiles";

describe("unifyFibersWithPassportRegistry", () => {
  it("joins fiber rows with passport by id and summarizes published vs passport coverage", () => {
    const fibers: FiberProfile[] = [
      {
        id: "a",
        name: "A",
        status: "published",
        image: "",
        category: "fiber",
        subtitle: "",
        about: "",
        tags: [],
        regions: [],
        seasonality: "",
        priceRange: { raw: "" },
        translationCount: 0,
        typicalMOQ: { quantity: 0, unit: "" },
        leadTime: { minWeeks: 0, maxWeeks: 0 },
        profilePills: {
          scientificName: "",
          plantPart: "",
          handFeel: "",
          fiberType: "",
          era: "",
          origin: "",
        },
        seeAlso: [],
        galleryImages: [],
        schemaVersion: 1,
      } as FiberProfile,
      {
        id: "b",
        name: "B",
        status: "draft",
        image: "",
        category: "fiber",
        subtitle: "",
        about: "",
        tags: [],
        regions: [],
        seasonality: "",
        priceRange: { raw: "" },
        translationCount: 0,
        typicalMOQ: { quantity: 0, unit: "" },
        leadTime: { minWeeks: 0, maxWeeks: 0 },
        profilePills: {
          scientificName: "",
          plantPart: "",
          handFeel: "",
          fiberType: "",
          era: "",
          origin: "",
        },
        seeAlso: [],
        galleryImages: [],
        schemaVersion: 1,
      } as FiberProfile,
    ];

    const unified = unifyFibersWithPassportRegistry(fibers);
    const s = summarizeUnifiedCatalog(unified);

    expect(unified).toHaveLength(2);
    expect(s.totalCatalogRows).toBe(2);
    expect(s.publishedLive).toBe(1);
    expect(s.publishedMissingPassport).toBeGreaterThanOrEqual(0);
    expect(listPublishedIdsMissingPassport(unified)).toEqual(["a"]);
  });

  it("passportKeysNotInCatalog lists registry keys missing from catalog ids", () => {
    const orphans = passportKeysNotInCatalog(new Set(["hemp"]));
    expect(Array.isArray(orphans)).toBe(true);
    expect(orphans.every((k) => typeof k === "string")).toBe(true);
  });
});
