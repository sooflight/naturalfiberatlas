import { describe, expect, it } from "vitest";
import { buildProfileCardCrossfadeImages, buildProfileCardCrossfadeLayers } from "./profile-card-images";

describe("buildProfileCardCrossfadeImages", () => {
  it("uses transformed primary image in slot 0", () => {
    const transform = (src: string | undefined, preset: string): string | undefined =>
      src ? `${src}?preset=${preset}` : undefined;
    const images = buildProfileCardCrossfadeImages("https://cdn.example.com/hero.jpg", [], transform);
    expect(images).toEqual(["https://cdn.example.com/hero.jpg?preset=grid"]);
  });

  it("adds only the first two transformed gallery images that are unique vs primary", () => {
    const transform = (src: string | undefined, preset: string): string | undefined =>
      src ? `${src}?preset=${preset}` : undefined;
    const images = buildProfileCardCrossfadeImages(
      "https://cdn.example.com/hero.jpg",
      [
        "https://cdn.example.com/hero.jpg",
        "https://cdn.example.com/g-1.jpg",
        "https://cdn.example.com/g-2.jpg",
        "https://cdn.example.com/g-3.jpg",
      ],
      transform,
    );
    expect(images).toEqual([
      "https://cdn.example.com/hero.jpg?preset=grid",
      "https://cdn.example.com/g-1.jpg?preset=grid",
      "https://cdn.example.com/g-2.jpg?preset=grid",
    ]);
  });

  it("drops gallery URLs whose grid transform returns empty", () => {
    const transform = (src: string | undefined, preset: string): string | undefined => {
      if (!src) return undefined;
      if (src.includes("bad")) return undefined;
      return `${src}?preset=${preset}`;
    };
    const images = buildProfileCardCrossfadeImages(
      "https://cdn.example.com/hero.jpg",
      [
        "https://cdn.example.com/bad-1.jpg",
        "https://cdn.example.com/g-1.jpg",
        "https://cdn.example.com/g-2.jpg",
      ],
      transform,
    );
    expect(images).toEqual([
      "https://cdn.example.com/hero.jpg?preset=grid",
      "https://cdn.example.com/g-1.jpg?preset=grid",
      "https://cdn.example.com/g-2.jpg?preset=grid",
    ]);
  });

  it("preserves incoming gallery order and skips transient blob URLs", () => {
    const transform = (src: string | undefined, preset: string): string | undefined =>
      src ? `${src}?preset=${preset}` : undefined;
    const images = buildProfileCardCrossfadeImages(
      "https://cdn.example.com/hero.jpg",
      [
        "blob:http://localhost:5173/preview-a",
        "https://cdn.example.com/ordered-2.jpg",
        "https://cdn.example.com/ordered-3.jpg",
        "https://cdn.example.com/ordered-4.jpg",
      ],
      transform,
    );
    expect(images).toEqual([
      "https://cdn.example.com/hero.jpg?preset=grid",
      "https://cdn.example.com/ordered-2.jpg?preset=grid",
      "https://cdn.example.com/ordered-3.jpg?preset=grid",
    ]);
  });
});

describe("buildProfileCardCrossfadeLayers", () => {
  const transform = (src: string | undefined, preset: string): string | undefined =>
    src ? `${src}?preset=${preset}` : undefined;

  it("mirrors URL order and attaches object-position from previewFocal", () => {
    const layers = buildProfileCardCrossfadeLayers(
      "https://cdn.example.com/hero.jpg",
      [
        { url: "https://cdn.example.com/hero.jpg", previewFocal: { x: 0.2, y: 0.8 } },
        { url: "https://cdn.example.com/g-1.jpg", previewFocal: { x: 0.5, y: 0.5 } },
        { url: "https://cdn.example.com/g-2.jpg" },
      ],
      transform,
    );
    expect(layers).toEqual([
      { url: "https://cdn.example.com/hero.jpg?preset=grid", objectPosition: "20% 80%" },
      { url: "https://cdn.example.com/g-1.jpg?preset=grid", objectPosition: "50% 50%" },
      { url: "https://cdn.example.com/g-2.jpg?preset=grid", objectPosition: undefined },
    ]);
  });

  it("omits objectPosition when no focal is set", () => {
    const layers = buildProfileCardCrossfadeLayers(
      "https://cdn.example.com/a.jpg",
      [{ url: "https://cdn.example.com/a.jpg" }],
      transform,
    );
    expect(layers).toEqual([{ url: "https://cdn.example.com/a.jpg?preset=grid", objectPosition: undefined }]);
  });

  it("matches hero focal when URL differs only by Shopify _600x suffix", () => {
    const layers = buildProfileCardCrossfadeLayers(
      "https://cdn.shopify.com/files/1/x_600x.jpg",
      [{ url: "https://cdn.shopify.com/files/1/x.jpg", previewFocal: { x: 0.1, y: 0.9 } }],
      transform,
    );
    expect(layers[0]).toEqual({
      url: "https://cdn.shopify.com/files/1/x_600x.jpg?preset=grid",
      objectPosition: "10% 90%",
    });
  });
});
