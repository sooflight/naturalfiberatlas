import { describe, expect, it } from "vitest";
import {
  buildPreviewImageSrc,
  buildPreviewSrcSet,
  getPreviewPreset,
  getPreviewSizes,
  isTransformableImageHost,
} from "./image-preview-utils";

describe("image-preview-utils", () => {
  it("detects cloudinary as transformable", () => {
    expect(isTransformableImageHost("https://res.cloudinary.com/demo/image/upload/v1/atlas/hemp.jpg")).toBe(true);
    expect(isTransformableImageHost("https://images.example.com/hemp.jpg")).toBe(false);
  });

  it("builds optimized preview URL for transformable hosts", () => {
    const src = buildPreviewImageSrc(
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/hemp.jpg",
      "compact-grid",
    );
    expect(src).toContain("/image/upload/");
    expect(src).toContain("w_420");
    expect(src).toContain("q_auto:eco");
    expect(src).toContain("f_auto");
  });

  it("falls back to original URL for non-transformable hosts", () => {
    const original = "https://images.example.com/hemp.jpg";
    expect(buildPreviewImageSrc(original, "compact-cards")).toBe(original);
    expect(buildPreviewSrcSet(original, "compact-cards")).toBeUndefined();
  });

  it("builds srcset entries for transformable URLs", () => {
    const srcSet = buildPreviewSrcSet(
      "https://res.cloudinary.com/demo/image/upload/v1/atlas/hemp.jpg",
      "compact-cards",
    );
    expect(srcSet).toBeTruthy();
    expect(srcSet).toContain("w_422");
    expect(srcSet).toContain("w_640");
    expect(srcSet).toContain("w_851");
  });

  it("returns layout-appropriate sizes and presets", () => {
    expect(getPreviewPreset("cards")).toBe("compact-cards");
    expect(getPreviewPreset("grid")).toBe("compact-grid");
    expect(getPreviewPreset("list")).toBe("list-expanded");
    expect(getPreviewSizes("grid", 180)).toContain("50vw");
    expect(getPreviewSizes("cards", 180)).toContain("100vw");
    expect(getPreviewSizes("list", 200)).toBe("200px");
  });
});
