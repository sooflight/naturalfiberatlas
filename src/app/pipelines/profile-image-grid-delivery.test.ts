import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeFiberGalleryWithFallback } from "../data/atlas-data";
import { getBundledActiveFibers } from "../data/data-provider";
import { buildProfileCardCrossfadeLayers } from "../utils/profile-card-images";
import { CloudinaryPipeline } from "./cloudinary";

/** Must match {@link PRESET_TRANSFORMS.grid} in cloudinary.ts */
const GRID_TRANSFORM = "w_320,h_427,c_fill,f_auto,q_auto";
/** Must match {@link PRESET_TRANSFORMS.lightbox} in cloudinary.ts */
const LIGHTBOX_TRANSFORM = "w_1400,f_auto,q_auto";

function gridUrlIsResized(url: string): boolean {
  if (!url.startsWith("http")) return true;
  if (url.includes("/image/fetch/") && url.includes(GRID_TRANSFORM)) return true;
  return url.includes("res.cloudinary.com") && url.includes(GRID_TRANSFORM);
}

function lightboxUrlIsResized(url: string): boolean {
  if (!url.startsWith("http")) return true;
  if (url.includes("/image/fetch/") && url.includes(LIGHTBOX_TRANSFORM)) return true;
  return url.includes("res.cloudinary.com") && url.includes(LIGHTBOX_TRANSFORM);
}

describe("profile image grid delivery audit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ENABLE_ADMIN", "true");
  });

  it("bundled profile card crossfade layers use Cloudinary grid sizing (upload or fetch)", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "true");
    const pipeline = new CloudinaryPipeline();
    const transform = pipeline.transform.bind(pipeline) as (
      src: string | undefined,
      preset: string,
    ) => string | undefined;
    const fibers = getBundledActiveFibers();
    const failures: string[] = [];

    for (const fiber of fibers) {
      const gallery = mergeFiberGalleryWithFallback(fiber.id, fiber);
      const layers = buildProfileCardCrossfadeLayers(fiber.image, gallery, transform);
      layers.forEach((layer, i) => {
        if (!layer.url || !gridUrlIsResized(layer.url)) {
          failures.push(`${fiber.id} layer[${i}]: ${layer.url ?? "(missing)"}`);
        }
      });
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("bundled primary images use Cloudinary lightbox sizing for remote URLs", () => {
    vi.stubEnv("VITE_CLOUDINARY_FETCH_REMOTE", "true");
    const pipeline = new CloudinaryPipeline();
    const fibers = getBundledActiveFibers();
    const failures: string[] = [];

    for (const fiber of fibers) {
      const raw = fiber.image?.trim();
      if (!raw) continue;
      const url = pipeline.transform(raw, "lightbox");
      if (!url || !lightboxUrlIsResized(url)) {
        failures.push(`${fiber.id}: ${url ?? "(missing)"}`);
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
