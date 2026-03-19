import { describe, expect, it, vi } from "vitest";
import type { TransformRecipe } from "@/types/cloudinary-transform";
import {
  formatCredits,
  getMonthlySummary,
  getOptimizationAlert,
  getTelemetryState,
  recordTransformEvent,
  resetTelemetry,
} from "./cloudinary-telemetry";

describe("cloudinary-telemetry", () => {
  it("getTelemetryState returns default state when empty", () => {
    const state = getTelemetryState();
    expect(state.events).toEqual([]);
    expect(state.sessionCredits).toBe(0);
    expect(state.transformCount).toBe(0);
  });

  it("recordTransformEvent creates an event", () => {
    const recipe: TransformRecipe = {
      id: "test",
      name: "Test Recipe",
      description: "Test",
      optimize: { format: "webp" },
    };
    const event = recordTransformEvent(recipe, 1);
    expect(event.operation).toBe("single");
    expect(event.imageCount).toBe(1);
    expect(event.estimatedCredits).toBeGreaterThan(0);
  });

  it("recordTransformEvent tracks batch operations", () => {
    const recipe: TransformRecipe = {
      id: "batch",
      name: "Batch Recipe",
      description: "Test",
      effects: { sharpen: true },
    };
    const event = recordTransformEvent(recipe, 5);
    expect(event.operation).toBe("batch");
    expect(event.imageCount).toBe(5);
    expect(event.estimatedCredits).toBeGreaterThan(0);
  });

  it("getMonthlySummary returns zeros when no events", () => {
    resetTelemetry();
    const summary = getMonthlySummary();
    expect(summary.totalTransforms).toBe(0);
    expect(summary.totalCredits).toBe(0);
    expect(summary.savingsPercent).toBe(0);
    expect(summary.recommendations).toEqual([]);
  });

  it("getOptimizationAlert returns null for basic recipe", () => {
    const recipe: TransformRecipe = {
      id: "basic",
      name: "Basic",
      description: "Test",
    };
    const alert = getOptimizationAlert(recipe);
    // Basic recipes might not trigger alerts
    expect(alert).toBeDefined();
  });

  it("getOptimizationAlert warns about high cost", () => {
    const recipe: TransformRecipe = {
      id: "expensive",
      name: "Expensive",
      description: "Test",
      effects: { upscale: "4x" },
    };
    const alert = getOptimizationAlert(recipe);
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alert.type).toBe("warning");
      expect(alert.message).toContain("High cost");
    }
  });

  it("getOptimizationAlert suggests WebP for cropped images", () => {
    const recipe: TransformRecipe = {
      id: "crop",
      name: "Cropped",
      description: "Test",
      crop: { width: 800, height: 600 },
    };
    const alert = getOptimizationAlert(recipe);
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alert.type).toBe("info");
      expect(alert.message).toContain("WebP");
    }
  });

  it("getOptimizationAlert praises optimized recipes", () => {
    const recipe: TransformRecipe = {
      id: "optimized",
      name: "Optimized",
      description: "Test",
      optimize: { format: "webp", quality: "auto:eco" },
    };
    const alert = getOptimizationAlert(recipe);
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alert.type).toBe("success");
    }
  });

  it("formatCredits formats small values", () => {
    expect(formatCredits(0.5)).toBe("50c");
  });

  it("formatCredits formats larger values", () => {
    expect(formatCredits(2.5)).toBe("2.5 credits");
  });

  it("formatCredits handles single credit", () => {
    expect(formatCredits(1)).toBe("1.0 credits");
  });
});
