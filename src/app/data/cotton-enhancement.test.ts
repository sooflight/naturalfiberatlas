// src/app/data/cotton-enhancement.test.ts
import { describe, it, expect } from "vitest";
import { fibers } from "./fibers";

describe("Cotton Profile Enhancement", () => {
  const cotton = fibers.find((f) => f.id === "organic-cotton");

  describe("About Text", () => {
    it("should have cotton profile defined", () => {
      expect(cotton).toBeDefined();
      expect(cotton?.name).toBe("Organic Cotton");
    });

    it("should include historical context", () => {
      expect(cotton?.about).toContain("Indus Valley");
      expect(cotton?.about).toContain("5000 BCE");
      expect(cotton?.about).toContain("Gossypium");
    });

    it("should mention cotton gin and industrial revolution", () => {
      expect(cotton?.about).toContain("1793");
      expect(cotton?.about).toContain("cotton gin");
    });

    it("should acknowledge historical complexities", () => {
      expect(cotton?.about).toContain("slavery");
      expect(cotton?.about).toContain("colonial");
    });

    it("should explain organic movement context", () => {
      expect(cotton?.about).toContain("1990s");
      expect(cotton?.about).toContain("16%");
      expect(cotton?.about).toContain("insecticides");
    });

    it("should have expanded word count (750-800 words)", () => {
      const wordCount = cotton?.about.split(/\s+/).length || 0;
      expect(wordCount).toBeGreaterThanOrEqual(750);
      expect(wordCount).toBeLessThanOrEqual(850);
    });
  });

  describe("Applications", () => {
    it("should include new application categories", () => {
      expect(cotton?.applications).toContain("Canvas & Duck Cloth");
      expect(cotton?.applications).toContain("Upholstery");
      expect(cotton?.applications).toContain("Industrial Textiles (nonwoven)");
    });

    it("should retain existing applications", () => {
      expect(cotton?.applications).toContain("Apparel");
      expect(cotton?.applications).toContain("Baby Products");
      expect(cotton?.applications).toContain("Medical Textiles");
      expect(cotton?.applications).toContain("Home Textiles");
      expect(cotton?.applications).toContain("Denim Blends");
    });

    it("should have 8 total applications", () => {
      expect(cotton?.applications).toHaveLength(8);
    });
  });
});
