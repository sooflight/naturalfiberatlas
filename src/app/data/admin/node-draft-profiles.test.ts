import { describe, expect, it } from "vitest";
import {
  buildNodeDraftProfiles,
  flattenNavigationNodes,
} from "./node-draft-profiles";
import { atlasNavigation } from "./atlas-navigation";
import type { FiberProfile } from "@/types/fiber-profile";

describe("node-draft-profiles", () => {
  describe("flattenNavigationNodes", () => {
    it("returns all node ids and labels from the navigation tree", () => {
      const flat = flattenNavigationNodes(atlasNavigation);
      expect(flat.length).toBeGreaterThan(50);
      expect(flat.some((n) => n.id === "fiber" && n.label === "Fiber")).toBe(true);
      expect(flat.some((n) => n.id === "hemp" && n.label === "Hemp")).toBe(true);
      expect(flat.some((n) => n.id === "plant-cellulose" && n.label === "Plant")).toBe(true);
    });
  });

  describe("buildNodeDraftProfiles", () => {
    it("creates a draft profile for every navigation node", () => {
      const fibers: FiberProfile[] = [];
      const overrides: Record<string, string[]> = {};
      const profiles = buildNodeDraftProfiles(atlasNavigation, fibers, overrides);

      expect(profiles.length).toBe(flattenNavigationNodes(atlasNavigation).length);

      const hemp = profiles.find((p) => p.id === "hemp");
      expect(hemp).toBeDefined();
      expect(hemp?.name).toBe("Hemp");
      expect(hemp?.isFiberProfile).toBe(false);
      expect(hemp?.image).toBe("");
      expect(hemp?.galleryImages).toEqual([]);
    });

    it("uses fiber data when node has a fiber profile", () => {
      const fibers: FiberProfile[] = [
        {
          id: "hemp",
          name: "Hemp",
          category: "fiber",
          image: "https://example.com/hemp.jpg",
          galleryImages: [],
        } as FiberProfile,
      ];
      const overrides: Record<string, string[]> = {};
      const profiles = buildNodeDraftProfiles(atlasNavigation, fibers, overrides);

      const hemp = profiles.find((p) => p.id === "hemp");
      expect(hemp).toBeDefined();
      expect(hemp?.isFiberProfile).toBe(true);
      expect(hemp?.image).toBe("https://example.com/hemp.jpg");
      expect(hemp?.galleryImages).toEqual([{ url: "https://example.com/hemp.jpg" }]);
    });

    it("uses navParentImageOverrides for category nodes without fiber profile", () => {
      const fibers: FiberProfile[] = [];
      const overrides: Record<string, string[]> = {
        "plant-cellulose": ["https://example.com/plant.jpg"],
      };
      const profiles = buildNodeDraftProfiles(atlasNavigation, fibers, overrides);

      const plant = profiles.find((p) => p.id === "plant-cellulose");
      expect(plant).toBeDefined();
      expect(plant?.isFiberProfile).toBe(false);
      expect(plant?.image).toBe("https://example.com/plant.jpg");
      expect(plant?.galleryImages).toEqual([{ url: "https://example.com/plant.jpg" }]);
    });

    it("resolves legacy node ids to canonical fiber ids", () => {
      const fibers: FiberProfile[] = [
        {
          id: "pineapple",
          name: "Pineapple",
          category: "fiber",
          image: "https://example.com/pineapple.jpg",
          galleryImages: [{ url: "https://example.com/pineapple-2.jpg" }],
        } as FiberProfile,
      ];
      const overrides: Record<string, string[]> = {};

      const profiles = buildNodeDraftProfiles(atlasNavigation, fibers, overrides);
      const pina = profiles.find((p) => p.id === "pineapple-pina");

      expect(pina).toBeDefined();
      expect(pina?.isFiberProfile).toBe(true);
      expect(pina?.name).toBe("Pineapple");
      expect(pina?.image).toBe("https://example.com/pineapple.jpg");
      expect(pina?.galleryImages).toEqual([
        { url: "https://example.com/pineapple.jpg" },
        { url: "https://example.com/pineapple-2.jpg" },
      ]);
    });
  });
});
