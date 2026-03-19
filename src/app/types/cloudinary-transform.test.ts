import { describe, expect, it } from "vitest";
import {
  createRecipe,
  estimateTransformCost,
  getPresetById,
  getPresetsByTag,
  TRANSFORM_PRESETS,
} from "./cloudinary-transform";

describe("TRANSFORM_PRESETS", () => {
  it("contains expected preset IDs", () => {
    const ids = TRANSFORM_PRESETS.map((p) => p.id);
    expect(ids).toContain("catalog-hero");
    expect(ids).toContain("catalog-thumb");
    expect(ids).toContain("detail-zoom");
    expect(ids).toContain("web-optimized");
    expect(ids).toContain("texture-study");
    expect(ids).toContain("social-share");
    expect(ids).toContain("print-quality");
    expect(ids).toContain("face-focus");
  });

  it("each preset has required fields", () => {
    TRANSFORM_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.id.length).toBeGreaterThan(0);
      expect(preset.name.length).toBeGreaterThan(0);
    });
  });

  it("catalog-hero has correct configuration", () => {
    const preset = getPresetById("catalog-hero");
    expect(preset).toBeDefined();
    expect(preset?.crop).toEqual({ width: 800, height: 600, gravity: "auto" });
    expect(preset?.optimize).toEqual({ quality: "auto:best" });
    expect(preset?.effects).toEqual({ sharpen: true });
    expect(preset?.tags).toContain("catalog");
    expect(preset?.tags).toContain("hero");
  });

  it("catalog-thumb uses webp format", () => {
    const preset = getPresetById("catalog-thumb");
    expect(preset?.optimize?.format).toBe("webp");
    expect(preset?.optimize?.quality).toBe("auto:eco");
  });

  it("detail-zoom has improve effect", () => {
    const preset = getPresetById("detail-zoom");
    expect(preset?.effects?.improve).toBe(true);
    expect(preset?.effects?.sharpen).toBe(true);
  });

  it("web-optimized has dimensions", () => {
    const preset = getPresetById("web-optimized");
    expect(preset?.optimize?.width).toBe(800);
    expect(preset?.optimize?.format).toBe("webp");
  });

  it("texture-study has all enhancement effects", () => {
    const preset = getPresetById("texture-study");
    expect(preset?.effects?.improve).toBe(true);
    expect(preset?.effects?.vibrance).toBe(true);
    expect(preset?.effects?.sharpen).toBe(true);
  });

  it("social-share has square crop", () => {
    const preset = getPresetById("social-share");
    expect(preset?.crop?.width).toBe(1200);
    expect(preset?.crop?.height).toBe(1200);
    expect(preset?.crop?.gravity).toBe("auto");
  });

  it("print-quality uses jpg format", () => {
    const preset = getPresetById("print-quality");
    expect(preset?.optimize?.format).toBe("jpg");
    expect(preset?.optimize?.quality).toBe(90);
  });

  it("face-focus uses face gravity", () => {
    const preset = getPresetById("face-focus");
    expect(preset?.crop?.gravity).toBe("face");
  });
});

describe("getPresetById", () => {
  it("returns preset for valid ID", () => {
    const preset = getPresetById("catalog-hero");
    expect(preset?.name).toBe("Catalog Hero");
  });

  it("returns undefined for invalid ID", () => {
    const preset = getPresetById("nonexistent");
    expect(preset).toBeUndefined();
  });
});

describe("getPresetsByTag", () => {
  it("returns catalog presets", () => {
    const presets = getPresetsByTag("catalog");
    expect(presets.length).toBe(2);
    expect(presets.map((p) => p.id)).toContain("catalog-hero");
    expect(presets.map((p) => p.id)).toContain("catalog-thumb");
  });

  it("returns empty array for unknown tag", () => {
    const presets = getPresetsByTag("nonexistent-tag");
    expect(presets).toEqual([]);
  });

  it("returns web presets", () => {
    const presets = getPresetsByTag("web");
    expect(presets.length).toBeGreaterThan(0);
  });
});

describe("createRecipe", () => {
  it("creates recipe with provided name", () => {
    const recipe = createRecipe("My Recipe", {});
    expect(recipe.name).toBe("My Recipe");
  });

  it("creates recipe with custom ID", () => {
    const recipe = createRecipe("Test", {});
    expect(recipe.id).toMatch(/^custom-\d+$/);
  });

  it("includes all provided options", () => {
    const recipe = createRecipe("Custom", {
      crop: { width: 100, height: 100 },
      optimize: { quality: "auto" },
      effects: { sharpen: true },
      description: "A custom recipe",
    });
    expect(recipe.crop).toEqual({ width: 100, height: 100 });
    expect(recipe.optimize).toEqual({ quality: "auto" });
    expect(recipe.effects).toEqual({ sharpen: true });
    expect(recipe.description).toBe("A custom recipe");
  });

  it("uses default description when not provided", () => {
    const recipe = createRecipe("Test", {});
    expect(recipe.description).toBe("Custom transform recipe");
  });
});

describe("estimateTransformCost", () => {
  it("estimates base cost for simple recipe", () => {
    const cost = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
    });
    expect(cost.credits).toBeGreaterThan(0);
  });

  it("adds cost for AI gravity", () => {
    const autoCrop = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      crop: { width: 100, height: 100, gravity: "auto" },
    });
    const faceCrop = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      crop: { width: 100, height: 100, gravity: "face" },
    });
    const basic = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      crop: { width: 100, height: 100 },
    });

    expect(autoCrop.credits).toBeGreaterThan(basic.credits);
    expect(faceCrop.credits).toBeGreaterThan(basic.credits);
  });

  it("adds significant cost for 4x upscale", () => {
    const upscale2x = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      effects: { upscale: "2x" },
    });
    const upscale4x = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      effects: { upscale: "4x" },
    });
    const basic = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
    });

    expect(upscale2x.credits).toBeGreaterThan(basic.credits);
    expect(upscale4x.credits).toBeGreaterThan(upscale2x.credits);
    expect(upscale4x.warnings).toContain("Upscale uses significant credits");
  });

  it("calculates bandwidth savings for webp", () => {
    const webp = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      optimize: { format: "webp" },
    });
    expect(webp.bandwidthSavings).toBe("~30-50%");
  });

  it("calculates bandwidth savings for eco quality", () => {
    const eco = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
      optimize: { quality: "auto:eco" },
    });
    expect(eco.bandwidthSavings).toBe("~20-30%");
  });

  it("calculates zero savings for no optimization", () => {
    const basic = estimateTransformCost({
      id: "test",
      name: "Test",
      description: "Test",
    });
    expect(basic.bandwidthSavings).toBe("0%");
  });
});
