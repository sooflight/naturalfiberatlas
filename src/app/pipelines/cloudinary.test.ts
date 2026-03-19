import { describe, expect, it } from "vitest";
import { CloudinaryPipeline } from "./cloudinary";

describe("CloudinaryPipeline", () => {
  const pipeline = new CloudinaryPipeline();

  it("passes through non-cloudinary URLs unchanged", () => {
    const url = "https://example.com/images/fiber.jpg";
    expect(pipeline.transform(url, "grid")).toBe(url);
  });

  it("applies the expected transform for known presets", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v123/atlas/fiber.jpg";
    const out = pipeline.transform(src, "grid");
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_320,h_427,c_fill,f_auto,q_auto/v123/atlas/fiber.jpg",
    );
  });

  it("does not double-apply transforms", () => {
    const transformed =
      "https://res.cloudinary.com/demo/image/upload/w_320,h_427,c_fill,f_auto,q_auto/v123/atlas/fiber.jpg";
    expect(pipeline.transform(transformed, "grid")).toBe(transformed);
  });

  it("passes through unknown presets unchanged", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v123/atlas/fiber.jpg";
    expect(pipeline.transform(src, "unknown-preset")).toBe(src);
  });
});
