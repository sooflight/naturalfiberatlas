import { describe, expect, it } from "vitest";
import type { FiberProfile } from "../../../data/fibers";
import { createImageDomainActions } from "./actions";

function makeFiber(id: string, images: string[]): FiberProfile {
  return {
    id,
    name: id,
    image: images[0] ?? "",
    category: "fiber",
    subtitle: "",
    about: "",
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
    galleryImages: images.map((url) => ({ url })),
    schemaVersion: 1,
  };
}

describe("image-domain actions", () => {
  it("reorders and promotes hero image while syncing profile image field", () => {
    const fibers = new Map<string, FiberProfile>();
    fibers.set("hemp", makeFiber("hemp", ["a.jpg", "b.jpg"]));

    const actions = createImageDomainActions({
      getFiberById: (id) => fibers.get(id),
      updateFiber: (id, patch) => {
        const current = fibers.get(id);
        if (!current) return;
        fibers.set(id, { ...current, ...patch });
      },
    });

    actions.reorderImage("hemp", 1, 0);
    expect(fibers.get("hemp")?.galleryImages[0].url).toBe("b.jpg");
    expect(fibers.get("hemp")?.image).toBe("b.jpg");

    actions.addImage("hemp", { id: "x", url: "c.jpg" });
    actions.promoteHero("hemp", 2);
    expect(fibers.get("hemp")?.galleryImages[0].url).toBe("c.jpg");

    const toRemove = fibers.get("hemp")?.galleryImages[0].url ?? "";
    const id = `0:${toRemove}`;
    actions.removeImage("hemp", id);
    expect(fibers.get("hemp")?.galleryImages.some((img) => img.url === "c.jpg")).toBe(
      false,
    );
  });
});
