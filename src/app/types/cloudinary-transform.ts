import type { EffectOptions, GravityCropOptions, OptimizeOptions } from "../utils/cloudinary";

/**
 * Transform Recipe - A reusable configuration for Cloudinary image transformations
 * Recipes can be saved, shared, and applied to multiple images
 */
export interface TransformRecipe {
  id: string;
  name: string;
  description: string;
  crop?: GravityCropOptions;
  optimize?: OptimizeOptions;
  effects?: EffectOptions;
  tags?: string[]; // For categorizing recipes (e.g., ["catalog", "hero", "texture"])
}

/**
 * Media Variant - Represents a specific transformed version of an image
 * with a semantic role (hero, thumb, detail, etc.)
 */
export interface MediaVariant {
  role: "original" | "hero" | "thumb" | "detail" | "zoom" | "social" | "print";
  recipeId: string;
  url: string;
  width: number;
  height: number;
  bytes?: number; // File size for telemetry
  createdAt: string;
}

/**
 * Transform History Entry - Records a transformation operation for audit/rollback
 */
export interface TransformHistoryEntry {
  id: string;
  recipe: TransformRecipe;
  appliedAt: string;
  appliedBy: string; // User identifier
  resultUrl: string;
  previousUrl: string;
  variantRole?: MediaVariant["role"];
}

/**
 * Extended AtlasMedia with variant and history support
 */
export interface AtlasMediaWithVariants {
  id: string;
  url: string;
  variants: MediaVariant[];
  primaryRole?: MediaVariant["role"];
  transformHistory: TransformHistoryEntry[];
  metadata?: {
    originalWidth?: number;
    originalHeight?: number;
    originalFormat?: string;
    originalBytes?: number;
  };
}

/**
 * Batch Transform Job - Tracks multi-image transform operations
 */
export interface BatchTransformJob {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  imageCount: number;
  completedCount: number;
  failedCount: number;
  recipe: TransformRecipe;
  startedAt?: string;
  completedAt?: string;
  errors: Array<{ index: number; error: string }>;
}

/**
 * Predefined Transform Presets
 * Ready-to-use recipes for common use cases
 */
export const TRANSFORM_PRESETS: TransformRecipe[] = [
  {
    id: "catalog-hero",
    name: "Catalog Hero",
    description: "High-quality hero image for catalog display",
    crop: { width: 800, height: 600, gravity: "auto" },
    optimize: { quality: "auto:best" },
    effects: { sharpen: true },
    tags: ["catalog", "hero"],
  },
  {
    id: "catalog-thumb",
    name: "Catalog Thumb",
    description: "Compact thumbnail for grid views",
    crop: { width: 400, height: 300, gravity: "auto" },
    optimize: { quality: "auto:eco", format: "webp" },
    tags: ["catalog", "thumb"],
  },
  {
    id: "detail-zoom",
    name: "Detail Zoom",
    description: "High-resolution detail view for close inspection",
    crop: { width: 1200, height: 900 },
    optimize: { quality: "auto:best" },
    effects: { sharpen: true, improve: true },
    tags: ["detail", "zoom"],
  },
  {
    id: "web-optimized",
    name: "Web Optimized",
    description: "General web use with optimal file size",
    optimize: { quality: "auto:eco", format: "webp", width: 800 },
    tags: ["web", "general"],
  },
  {
    id: "texture-study",
    name: "Texture Study",
    description: "Enhanced texture visualization for material analysis",
    effects: { improve: true, vibrance: true, sharpen: true },
    optimize: { quality: "auto:best" },
    tags: ["texture", "analysis"],
  },
  {
    id: "social-share",
    name: "Social Share",
    description: "Optimized for social media sharing (1:1 ratio)",
    crop: { width: 1200, height: 1200, gravity: "auto" },
    optimize: { quality: "auto:eco", format: "webp" },
    effects: { vibrance: 20 },
    tags: ["social", "share"],
  },
  {
    id: "print-quality",
    name: "Print Quality",
    description: "High resolution for print applications",
    optimize: { quality: 90, format: "jpg" },
    tags: ["print", "high-res"],
  },
  {
    id: "face-focus",
    name: "Face Focus",
    description: "Optimized for portraits with face detection",
    crop: { width: 600, height: 600, gravity: "face" },
    optimize: { quality: "auto:best" },
    effects: { improve: true },
    tags: ["portrait", "face"],
  },
];

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): TransformRecipe | undefined {
  return TRANSFORM_PRESETS.find((p) => p.id === id);
}

/**
 * Get presets by tag
 */
export function getPresetsByTag(tag: string): TransformRecipe[] {
  return TRANSFORM_PRESETS.filter((p) => p.tags?.includes(tag));
}

/**
 * Create a custom recipe from partial options
 */
export function createRecipe(
  name: string,
  options: {
    crop?: GravityCropOptions;
    optimize?: OptimizeOptions;
    effects?: EffectOptions;
    description?: string;
  }
): TransformRecipe {
  return {
    id: `custom-${Date.now()}`,
    name,
    description: options.description || "Custom transform recipe",
    crop: options.crop,
    optimize: options.optimize,
    effects: options.effects,
  };
}

/**
 * Estimate Cloudinary credits for a transform recipe
 * Note: These are rough estimates based on Cloudinary's pricing tiers
 */
export function estimateTransformCost(recipe: TransformRecipe): {
  credits: number;
  bandwidthSavings: string;
  warnings: string[];
} {
  let credits = 0.5; // Base transform cost
  const warnings: string[] = [];

  // Crop operations
  if (recipe.crop) {
    credits += 0.3;
    if (recipe.crop.gravity === "auto" || recipe.crop.gravity === "face") {
      credits += 0.5; // AI-powered gravity costs more
    }
  }

  // Effects
  if (recipe.effects) {
    if (recipe.effects.upscale) {
      credits += recipe.effects.upscale === "4x" ? 4 : 2;
      warnings.push("Upscale uses significant credits");
    }
    if (recipe.effects.sharpen) credits += 0.2;
    if (recipe.effects.improve) credits += 0.5;
    if (recipe.effects.autoBrightness) credits += 0.2;
    if (recipe.effects.vibrance) credits += 0.2;
  }

  // Calculate bandwidth savings hint
  let bandwidthSavings = "0%";
  if (recipe.optimize?.format === "webp" || recipe.optimize?.format === "avif") {
    bandwidthSavings = "~30-50%";
  } else if (recipe.optimize?.quality === "auto:eco") {
    bandwidthSavings = "~20-30%";
  }

  return {
    credits: Math.round(credits * 10) / 10,
    bandwidthSavings,
    warnings,
  };
}
