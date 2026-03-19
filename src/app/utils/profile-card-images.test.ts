import { describe, expect, it } from "vitest";
import { buildProfileCardCrossfadeImages } from "./profile-card-images";

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
