import { describe, expect, it, vi } from "vitest";
import { isPortraitFromDimensions, detectYoutubeVideoOrientation } from "./youtube-orientation";

describe("isPortraitFromDimensions", () => {
  it("returns false for landscape 16:9", () => {
    expect(isPortraitFromDimensions(1280, 720)).toBe(false);
  });

  it("returns true for portrait 9:16", () => {
    expect(isPortraitFromDimensions(720, 1280)).toBe(true);
  });

  it("returns false when nearly square", () => {
    expect(isPortraitFromDimensions(1000, 1020)).toBe(false);
  });
});

describe("detectYoutubeVideoOrientation", () => {
  it("reads oEmbed dimensions when fetch succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ width: 270, height: 480 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(detectYoutubeVideoOrientation("abc")).resolves.toBe("vertical");

    vi.unstubAllGlobals();
  });

  it("falls back to horizontal when oEmbed has no dimensions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );

    const ImageMock = vi.fn(function ImageMock(this: {
      onload: (() => void) | null;
      onerror: (() => void) | null;
      src: string;
    }) {
      queueMicrotask(() => {
        Object.defineProperty(this, "naturalWidth", { value: 1280 });
        Object.defineProperty(this, "naturalHeight", { value: 720 });
        this.onload?.();
      });
      return this;
    }) as unknown as typeof Image;

    vi.stubGlobal("Image", ImageMock);

    await expect(detectYoutubeVideoOrientation("xyz")).resolves.toBe("horizontal");

    vi.unstubAllGlobals();
  });
});
