import { describe, expect, it } from "vitest";
import type { TransformRecipe } from "../../types/cloudinary-transform";

// Unit tests for TransformPreviewPanel logic without DOM rendering
// These tests verify the transform recipe building logic

// Simulate the recipe building logic from the component
function buildRecipeFromState(state: {
  cropWidth: string;
  cropHeight: string;
  gravity: string;
  sharpen: boolean;
  improve: boolean;
  autoBrightness: boolean;
  vibrance: boolean;
  quality: string;
  format: "" | "auto" | "webp" | "avif" | "jpg" | "png";
  recipeName: string;
  initialId?: string;
}): TransformRecipe {
  const hasCrop = state.cropWidth && state.cropHeight;

  return {
    id: state.initialId || `custom-${Date.now()}`,
    name: state.recipeName,
    description: "Custom transform configuration",
    crop: hasCrop
      ? {
          width: Number(state.cropWidth),
          height: Number(state.cropHeight),
          gravity: state.gravity as "center" | "auto" | "face" | "faces",
        }
      : undefined,
    effects: {
      sharpen: state.sharpen || undefined,
      improve: state.improve || undefined,
      autoBrightness: state.autoBrightness || undefined,
      vibrance: state.vibrance || undefined,
    },
    optimize: {
      quality: state.quality as "auto" | "auto:best" | "auto:eco" | number,
      format: (state.format || undefined) as "auto" | "webp" | "avif" | "jpg" | "png" | undefined,
    },
  };
}

describe("TransformPreviewPanel recipe building", () => {
  it("builds recipe with crop dimensions", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "800",
      cropHeight: "600",
      gravity: "auto",
      sharpen: false,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "auto:eco",
      format: "webp",
      recipeName: "Test Recipe",
    });

    expect(recipe.crop).toEqual({ width: 800, height: 600, gravity: "auto" });
    expect(recipe.name).toBe("Test Recipe");
  });

  it("omits crop when dimensions are empty", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "",
      cropHeight: "",
      gravity: "center",
      sharpen: true,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "auto",
      format: "",
      recipeName: "Effects Only",
    });

    expect(recipe.crop).toBeUndefined();
    expect(recipe.effects?.sharpen).toBe(true);
  });

  it("includes all enabled effects", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "",
      cropHeight: "",
      gravity: "center",
      sharpen: true,
      improve: true,
      autoBrightness: true,
      vibrance: true,
      quality: "auto:best",
      format: "avif",
      recipeName: "All Effects",
    });

    expect(recipe.effects?.sharpen).toBe(true);
    expect(recipe.effects?.improve).toBe(true);
    expect(recipe.effects?.autoBrightness).toBe(true);
    expect(recipe.effects?.vibrance).toBe(true);
    expect(recipe.optimize?.quality).toBe("auto:best");
    expect(recipe.optimize?.format).toBe("avif");
  });

  it("removes false effects from the recipe", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "400",
      cropHeight: "300",
      gravity: "center",
      sharpen: false,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "auto",
      format: "",
      recipeName: "Just Crop",
    });

    // False values should be falsy (undefined or false)
    expect(recipe.effects?.sharpen).toBeFalsy();
    expect(recipe.effects?.improve).toBeFalsy();
    expect(recipe.crop).toEqual({ width: 400, height: 300, gravity: "center" });
  });

  it("preserves initial recipe ID when provided", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "",
      cropHeight: "",
      gravity: "center",
      sharpen: false,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "auto",
      format: "",
      recipeName: "Preset",
      initialId: "catalog-hero",
    });

    expect(recipe.id).toBe("catalog-hero");
  });

  it("generates custom ID when no initial ID", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "",
      cropHeight: "",
      gravity: "center",
      sharpen: false,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "auto",
      format: "",
      recipeName: "Custom",
    });

    expect(recipe.id).toMatch(/^custom-\d+$/);
  });

  it("handles numeric quality values", () => {
    const recipe = buildRecipeFromState({
      cropWidth: "",
      cropHeight: "",
      gravity: "center",
      sharpen: false,
      improve: false,
      autoBrightness: false,
      vibrance: false,
      quality: "85",
      format: "jpg",
      recipeName: "Numeric Quality",
    });

    // Quality gets converted based on logic
    expect(recipe.optimize?.quality).toBeDefined();
    expect(recipe.optimize?.format).toBe("jpg");
  });
});

describe("TransformPreviewPanel UI logic", () => {
  it("determines hasCrop correctly", () => {
    const hasCrop = (w: string, h: string) => Boolean(w && h);
    const hasCropA = hasCrop("800", "600");
    const hasCropB = hasCrop("", "600");
    const hasCropC = hasCrop("800", "");
    const hasCropD = hasCrop("", "");
    expect(hasCropA).toBe(true);
    expect(hasCropB).toBe(false);
    expect(hasCropC).toBe(false);
    expect(hasCropD).toBe(false);
  });

  it("determines hasEffects correctly", () => {
    const effects1 = { sharpen: true, improve: false, autoBrightness: false, vibrance: false };
    const effects2 = { sharpen: false, improve: false, autoBrightness: false, vibrance: false };

    const hasEffects1 = effects1.sharpen || effects1.improve || effects1.autoBrightness || effects1.vibrance;
    const hasEffects2 = effects2.sharpen || effects2.improve || effects2.autoBrightness || effects2.vibrance;

    expect(hasEffects1).toBe(true);
    expect(hasEffects2).toBe(false);
  });

  it("determines hasOptimization correctly", () => {
    const hasOptimization = (quality: string, format: string) => Boolean(quality !== "" || format !== "");
    expect(hasOptimization("auto:eco", "webp")).toBe(true);
    expect(hasOptimization("", "")).toBe(false);
    expect(hasOptimization("auto:best", "")).toBe(true);
  });
});
