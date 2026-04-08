import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudinaryPipeline } from "./cloudinary";

describe("CloudinaryPipeline", () => {
  const pipeline = new CloudinaryPipeline();

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes through non-cloudinary URLs when remote fetch is disabled", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "false");
    const url = "https://example.com/images/fiber.jpg";
    expect(pipeline.transform(url, "grid")).toBe(url);
  });

  it("VITE_CLOUDINARY_FETCH_REMOTE=false forces passthrough regardless of build mode", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "false");
    const url = "https://example.com/images/large-hero.jpg";
    expect(pipeline.transform(url, "lightbox")).toBe(url);
  });

  it("wraps remote https URLs when VITE_CLOUDINARY_FETCH_REMOTE is true", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "true");
    const url = "https://example.com/images/fiber.jpg";
    const out = pipeline.transform(url, "grid");
    expect(out).toMatch(
      /^https:\/\/res\.cloudinary\.com\/dawxvzlte\/image\/fetch\/w_320,h_427,c_fill,f_auto,q_auto\/https%3A%2F%2Fexample\.com%2Fimages%2Ffiber\.jpg$/,
    );
  });

  it("does not double-wrap fetch URLs", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "true");
    const once = pipeline.transform("https://example.com/x.jpg", "grid")!;
    expect(pipeline.transform(once, "grid")).toBe(once);
  });

  it("applies grid transforms to stored canonical fetch URLs (no inline transforms)", () => {
    const src =
      "https://res.cloudinary.com/demo/image/fetch/https%3A%2F%2Fexample.com%2Fx.jpg";
    expect(pipeline.transform(src, "grid")).toBe(
      "https://res.cloudinary.com/demo/image/fetch/w_320,h_427,c_fill,f_auto,q_auto/https%3A%2F%2Fexample.com%2Fx.jpg",
    );
  });

  it("replaces stale inline transforms on fetch URLs when preset changes", () => {
    const withOld =
      "https://res.cloudinary.com/demo/image/fetch/w_10,h_10,c_fill,f_auto,q_auto/https%3A%2F%2Fexample.com%2Fx.jpg";
    expect(pipeline.transform(withOld, "lightbox")).toBe(
      "https://res.cloudinary.com/demo/image/fetch/w_1400,f_auto,q_auto/https%3A%2F%2Fexample.com%2Fx.jpg",
    );
  });

  it("applies the expected transform for known presets", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v123/atlas/fiber.jpg";
    const out = pipeline.transform(src, "grid");
    expect(out).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_320,h_427,c_fill,f_auto,q_auto/v123/atlas/fiber.jpg",
    );
  });

  it("applies contactSheet as a square thumb for dense grids", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v123/atlas/fiber.jpg";
    expect(pipeline.transform(src, "contactSheet")).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_320,h_320,c_fill,f_auto,q_auto/v123/atlas/fiber.jpg",
    );
  });

  it("applies lightboxHi for large fullscreen hero delivery", () => {
    const src = "https://res.cloudinary.com/demo/image/upload/v123/atlas/fiber.jpg";
    expect(pipeline.transform(src, "lightboxHi")).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_2200,f_auto,q_auto/v123/atlas/fiber.jpg",
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
