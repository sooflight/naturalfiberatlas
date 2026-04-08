// src/app/data/cotton-enhancement.test.ts
import { describe, it, expect } from "vitest";
import { fibers } from "./fibers";
import { processData, anatomyData, careData, quoteData, worldNames } from "./atlas-data";

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

describe("Process Data", () => {
  const cottonProcess = processData["organic-cotton"];

  it("should have 8 process steps defined", () => {
    expect(cottonProcess).toBeDefined();
    expect(cottonProcess).toHaveLength(8);
  });

  it("should have correct step sequence", () => {
    expect(cottonProcess[0].name).toBe("Planting");
    expect(cottonProcess[1].name).toBe("Growth & Cultivation");
    expect(cottonProcess[2].name).toBe("Flowering & Boll Formation");
    expect(cottonProcess[3].name).toBe("Harvesting");
    expect(cottonProcess[4].name).toBe("Ginning");
    expect(cottonProcess[5].name).toBe("Cleaning & Grading");
    expect(cottonProcess[6].name).toBe("Baling & Storage");
    expect(cottonProcess[7].name).toBe("Spinning Preparation");
  });

  it("should have detailed descriptions for each step", () => {
    cottonProcess.forEach((step) => {
      expect(step.name).toBeTruthy();
      expect(step.detail).toBeTruthy();
      expect(step.detail.length).toBeGreaterThan(30);
    });
  });

  it("should include organic-specific details", () => {
    expect(cottonProcess[0].detail).toContain("non-GMO");
    expect(cottonProcess[1].detail).toContain("beneficial insects");
  });
});

describe("Anatomy Data", () => {
  const cottonAnatomy = anatomyData["organic-cotton"];

  it("should have anatomy data defined", () => {
    expect(cottonAnatomy).toBeDefined();
  });

  it("should have correct diameter range", () => {
    expect(cottonAnatomy.diameter.raw).toBe("12-22 µm");
    expect(cottonAnatomy.diameter.minUm).toBe(12);
    expect(cottonAnatomy.diameter.maxUm).toBe(22);
  });

  it("should describe kidney-bean cross section", () => {
    expect(cottonAnatomy.crossSection).toContain("Kidney-bean");
    expect(cottonAnatomy.crossSection).toContain("collapsed lumen");
  });

  it("should describe twisted ribbon texture", () => {
    expect(cottonAnatomy.surfaceTexture).toContain("Twisted ribbon");
    expect(cottonAnatomy.surfaceTexture).toContain("convolutions");
  });

  it("should have Upland organic staple length", () => {
    expect(cottonAnatomy.length.raw).toContain("20-40 mm");
    expect(cottonAnatomy.length.minMm).toBe(20);
    expect(cottonAnatomy.length.maxMm).toBe(40);
  });

  it("should have tensile strength range", () => {
    expect(cottonAnatomy.tensileStrength.raw).toContain("287-597 MPa");
    expect(cottonAnatomy.tensileStrength.minMPa).toBe(287);
    expect(cottonAnatomy.tensileStrength.maxMPa).toBe(597);
  });

  it("should have moisture regain specification", () => {
    expect(cottonAnatomy.moistureRegain.raw).toBe("8.5% (at 65% RH, 70°F)");
    expect(cottonAnatomy.moistureRegain.percentage).toBe(8.5);
  });
});

describe("Care Data", () => {
  const cottonCare = careData["organic-cotton"];

  it("should have care data defined", () => {
    expect(cottonCare).toBeDefined();
  });

  it("should have washing instructions", () => {
    expect(cottonCare.washing).toBeDefined();
    expect(cottonCare.washing).toContain("60-90°F");
    expect(cottonCare.washing).toContain("Machine wash");
  });

  it("should have drying instructions", () => {
    expect(cottonCare.drying).toBeDefined();
    expect(cottonCare.drying).toContain("Tumble dry low");
    expect(cottonCare.drying).toContain("line dry");
  });

  it("should have ironing instructions", () => {
    expect(cottonCare.ironing).toBeDefined();
    expect(cottonCare.ironing).toContain("380°F");
    expect(cottonCare.ironing).toContain("steam");
  });

  it("should have stain removal guidance", () => {
    expect(cottonCare.stainRemoval).toBeDefined();
    expect(cottonCare.stainRemoval).toContain("oxygen bleach");
  });

  it("should have storage instructions", () => {
    expect(cottonCare.storage).toBeDefined();
    expect(cottonCare.storage).toContain("breathable");
  });

  it("should have special considerations", () => {
    expect(cottonCare.specialConsiderations).toBeDefined();
    expect(cottonCare.specialConsiderations).toContain("shrinkage");
    expect(cottonCare.specialConsiderations).toContain("3-5%");
  });
});

describe("Quote Data", () => {
  const cottonQuotes = quoteData["organic-cotton"];

  it("should have 4 quotes defined", () => {
    expect(cottonQuotes).toBeDefined();
    expect(cottonQuotes).toHaveLength(4);
  });

  it("should have industry/historical perspective", () => {
    const attributions = cottonQuotes.map((q) => q.attribution);
    expect(attributions).toContain("Cotton Incorporated");
    expect(attributions).toContain("Eric Hobsbawm, British historian");
    expect(attributions).toContain("Sven Beckert, 'Empire of Cotton' (2014)");
    expect(attributions).toContain("Textile Exchange, 2025 Organic Cotton Market Report");
  });

  it("should have context for each quote", () => {
    cottonQuotes.forEach((quote) => {
      expect(quote.text).toBeTruthy();
      expect(quote.attribution).toBeTruthy();
      expect(quote.context).toBeTruthy();
    });
  });

  it("should include Hobsbawm's Industrial Revolution quote", () => {
    const hobsbawmQuote = cottonQuotes.find((q) => q.attribution.includes("Hobsbawm"));
    expect(hobsbawmQuote?.text).toContain("Industrial Revolution");
  });
});

describe("World Names", () => {
  const cottonNames = worldNames["organic-cotton"];

  it("should have expanded translation count", () => {
    expect(cottonNames).toBeDefined();
    expect(cottonNames.length).toBeGreaterThanOrEqual(24);
  });

  it("should include new Greek translation", () => {
    expect(cottonNames).toContain("Βαμβάκι (Vamváki)");
  });

  it("should include new Polish translation", () => {
    expect(cottonNames).toContain("Bawełna Organiczna");
  });

  it("should include new Swedish translation", () => {
    expect(cottonNames).toContain("bomull");
  });

  it("should include regional Indian languages", () => {
    expect(cottonNames).toContain("कापूस (Kāpūs)"); // Marathi
    expect(cottonNames).toContain("పంట (Patti)"); // Telugu
    expect(cottonNames).toContain("કપાસ (Kapās)"); // Gujarati
  });

  it("should retain existing translations", () => {
    expect(cottonNames).toContain("Organic Cotton");
    expect(cottonNames).toContain("棉花 (Miánhua)");
    expect(cottonNames).toContain("Coton Bio");
  });
});
