import { estimateTransformCost } from "../../types/cloudinary-transform";
import type { TransformRecipe } from "../../types/cloudinary-transform";

/**
 * Cloudinary Telemetry - Track transform usage and costs
 */

interface TransformEvent {
  id: string;
  timestamp: string;
  operation: "single" | "batch";
  recipe: TransformRecipe;
  imageCount: number;
  estimatedCredits: number;
}

interface TelemetryState {
  events: TransformEvent[];
  sessionCredits: number;
  transformCount: number;
}

const STORAGE_KEY = "atlas-cloudinary-telemetry";

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem("__test__", "test");
    localStorage.removeItem("__test__");
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current telemetry state from localStorage
 */
export function getTelemetryState(): TelemetryState {
  if (!isLocalStorageAvailable()) {
    return { events: [], sessionCredits: 0, transformCount: 0 };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { events: [], sessionCredits: 0, transformCount: 0 };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return { events: [], sessionCredits: 0, transformCount: 0 };
  }
}

/**
 * Save telemetry state to localStorage
 */
function saveTelemetryState(state: TelemetryState): void {
  if (!isLocalStorageAvailable()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Record a transform event
 */
export function recordTransformEvent(
  recipe: TransformRecipe,
  imageCount: number = 1
): TransformEvent {
  const cost = estimateTransformCost(recipe);
  const event: TransformEvent = {
    id: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    operation: imageCount > 1 ? "batch" : "single",
    recipe,
    imageCount,
    estimatedCredits: cost.credits * imageCount,
  };

  const state = getTelemetryState();
  state.events.unshift(event);
  state.sessionCredits += event.estimatedCredits;
  state.transformCount += imageCount;

  // Keep only last 100 events
  if (state.events.length > 100) {
    state.events = state.events.slice(0, 100);
  }

  saveTelemetryState(state);
  return event;
}

/**
 * Get monthly usage summary
 */
export function getMonthlySummary(): {
  totalTransforms: number;
  totalCredits: number;
  savingsPercent: number;
  recommendations: string[];
} {
  const state = getTelemetryState();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthEvents = state.events.filter(
    (e) => new Date(e.timestamp) >= monthStart
  );

  const totalTransforms = monthEvents.reduce((sum, e) => sum + e.imageCount, 0);
  const totalCredits = monthEvents.reduce((sum, e) => sum + e.estimatedCredits, 0);

  // Calculate potential savings
  let webpCount = 0;
  let avifCount = 0;
  let ecoCount = 0;

  monthEvents.forEach((e) => {
    const recipe = e.recipe;
    if (recipe.optimize?.format === "webp") webpCount += e.imageCount;
    if (recipe.optimize?.format === "avif") avifCount += e.imageCount;
    if (recipe.optimize?.quality === "auto:eco") ecoCount += e.imageCount;
  });

  const optimizedCount = webpCount + avifCount + ecoCount;
  const savingsPercent = totalTransforms > 0 ? (optimizedCount / totalTransforms) * 30 : 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (webpCount < totalTransforms * 0.5 && totalTransforms > 10) {
    recommendations.push("Consider using WebP format for 30-50% bandwidth savings");
  }

  if (ecoCount < totalTransforms * 0.3 && totalTransforms > 20) {
    recommendations.push("Try 'eco' quality for thumbnails to reduce file sizes");
  }

  if (totalCredits > 50) {
    recommendations.push("High usage detected - consider reviewing transform recipes for efficiency");
  }

  return {
    totalTransforms,
    totalCredits,
    savingsPercent: Math.round(savingsPercent),
    recommendations,
  };
}

/**
 * Get optimization alert for a recipe
 */
export function getOptimizationAlert(recipe: TransformRecipe): {
  type: "info" | "warning" | "success";
  message: string;
  savings?: string;
} | null {
  const cost = estimateTransformCost(recipe);

  // High cost warning
  if (cost.credits > 3) {
    return {
      type: "warning",
      message: `High cost transform (~${cost.credits} credits)`,
      savings: "Consider simpler effects",
    };
  }

  // Bandwidth optimization suggestion
  if (!recipe.optimize?.format && recipe.crop) {
    return {
      type: "info",
      message: "Add WebP format for 30% smaller files",
      savings: "~30% bandwidth",
    };
  }

  // Good optimization
  if (recipe.optimize?.format === "webp" && cost.credits < 1) {
    return {
      type: "success",
      message: "Optimized transform - efficient settings",
      savings: cost.bandwidthSavings,
    };
  }

  return null;
}

/**
 * Reset telemetry data
 */
export function resetTelemetry(): void {
  if (!isLocalStorageAvailable()) return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Format credit count for display
 */
export function formatCredits(credits: number): string {
  if (credits < 1) {
    return `${(credits * 100).toFixed(0)}c`;
  }
  return `${credits.toFixed(1)} credits`;
}
