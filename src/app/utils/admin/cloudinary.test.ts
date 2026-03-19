import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildEffectUrl,
  buildGravityCropUrl,
  buildOptimizedUrl,
  buildTransformUrl,
  getCloudinarySignedStatus,
  requestCloudinaryUpscale,
  testCloudinaryConnection,
} from "./cloudinary";

describe("testCloudinaryConnection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts a probe upload to Cloudinary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ secure_url: "https://res.cloudinary.com/demo/image/upload/v1/probe.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await testCloudinaryConnection({
      cloudName: "demo",
      uploadPreset: "unsigned_preset",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cloudinary.com/v1_1/demo/image/upload",
      expect.objectContaining({
        method: "POST",
      })
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as { body?: FormData } | undefined;
    const form = requestInit?.body;
    expect(form).toBeInstanceOf(FormData);
    expect(form?.get("folder")).toBe("atlas/connection-probes");
  });

  it("throws when probe upload fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid upload preset" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      testCloudinaryConnection({
        cloudName: "demo",
        uploadPreset: "bad_preset",
      })
    ).rejects.toThrow("Invalid upload preset");
  });

  it("reads signed-tools status from admin endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        configured: true,
        cloudNameConfigured: true,
        apiKeyConfigured: true,
        apiSecretConfigured: true,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCloudinarySignedStatus()).resolves.toEqual({
      configured: true,
      cloudNameConfigured: true,
      apiKeyConfigured: true,
      apiSecretConfigured: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/cloudinary-signed-status",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("requests server-side Cloudinary upscale and returns secure URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        secureUrl: "https://res.cloudinary.com/demo/image/upload/v1/atlas/upscaled/sample.png",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestCloudinaryUpscale({
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/atlas/source.png",
        cloudName: "demo",
        scale: "2x",
      })
    ).resolves.toBe("https://res.cloudinary.com/demo/image/upload/v1/atlas/upscaled/sample.png");
    expect(fetchMock).toHaveBeenCalledWith(
      "/__admin/cloudinary-upscale",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("surfaces plain-string backend errors for upscale requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "Configured Cloudinary cloud name does not match server environment",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestCloudinaryUpscale({
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/atlas/source.png",
        cloudName: "wrong-cloud",
        scale: "2x",
      })
    ).rejects.toThrow("Configured Cloudinary cloud name does not match server environment");
  });
});

describe("buildOptimizedUrl", () => {
  const baseUrl = "https://res.cloudinary.com/demo/image/upload/v1/atlas/sample.jpg";

  it("returns original URL for non-Cloudinary URLs", () => {
    const nonCloudinaryUrl = "https://example.com/image.jpg";
    expect(buildOptimizedUrl(nonCloudinaryUrl, { quality: "auto" })).toBe(nonCloudinaryUrl);
  });

  it("applies auto quality", () => {
    expect(buildOptimizedUrl(baseUrl, { quality: "auto" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_auto/v1/atlas/sample.jpg"
    );
  });

  it("applies auto:best quality", () => {
    expect(buildOptimizedUrl(baseUrl, { quality: "auto:best" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_auto:best/v1/atlas/sample.jpg"
    );
  });

  it("applies auto:eco quality", () => {
    expect(buildOptimizedUrl(baseUrl, { quality: "auto:eco" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_auto:eco/v1/atlas/sample.jpg"
    );
  });

  it("applies numeric quality and clamps to 1-100 range", () => {
    expect(buildOptimizedUrl(baseUrl, { quality: 85 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_85/v1/atlas/sample.jpg"
    );
    expect(buildOptimizedUrl(baseUrl, { quality: 150 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_100/v1/atlas/sample.jpg"
    );
    expect(buildOptimizedUrl(baseUrl, { quality: 0 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_1/v1/atlas/sample.jpg"
    );
  });

  it("applies webp format", () => {
    expect(buildOptimizedUrl(baseUrl, { format: "webp" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_webp/v1/atlas/sample.jpg"
    );
  });

  it("applies auto format", () => {
    expect(buildOptimizedUrl(baseUrl, { format: "auto" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto/v1/atlas/sample.jpg"
    );
  });

  it("applies width resize with c_fit", () => {
    expect(buildOptimizedUrl(baseUrl, { width: 800 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fit,w_800/v1/atlas/sample.jpg"
    );
  });

  it("applies width and height resize with c_fit", () => {
    expect(buildOptimizedUrl(baseUrl, { width: 800, height: 600 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fit,w_800,h_600/v1/atlas/sample.jpg"
    );
  });

  it("combines multiple optimization options", () => {
    expect(buildOptimizedUrl(baseUrl, { quality: "auto:eco", format: "webp", width: 400 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fit,w_400,q_auto:eco,f_webp/v1/atlas/sample.jpg"
    );
  });

  it("returns original URL when no options provided", () => {
    expect(buildOptimizedUrl(baseUrl, {})).toBe(baseUrl);
  });

  it("returns original URL when opts is undefined", () => {
    expect(buildOptimizedUrl(baseUrl, undefined)).toBe(baseUrl);
  });
});

describe("buildEffectUrl", () => {
  const baseUrl = "https://res.cloudinary.com/demo/image/upload/v1/atlas/sample.jpg";

  it("returns original URL for non-Cloudinary URLs", () => {
    const nonCloudinaryUrl = "https://example.com/image.jpg";
    expect(buildEffectUrl(nonCloudinaryUrl, { sharpen: true })).toBe(nonCloudinaryUrl);
  });

  it("applies default sharpen effect", () => {
    expect(buildEffectUrl(baseUrl, { sharpen: true })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen/v1/atlas/sample.jpg"
    );
  });

  it("applies sharpen with strength", () => {
    expect(buildEffectUrl(baseUrl, { sharpen: 500 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen:500/v1/atlas/sample.jpg"
    );
  });

  it("clamps sharpen strength to valid range", () => {
    expect(buildEffectUrl(baseUrl, { sharpen: 50 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen:100/v1/atlas/sample.jpg"
    );
    expect(buildEffectUrl(baseUrl, { sharpen: 3000 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen:2000/v1/atlas/sample.jpg"
    );
  });

  it("applies improve effect", () => {
    expect(buildEffectUrl(baseUrl, { improve: true })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_improve/v1/atlas/sample.jpg"
    );
  });

  it("applies auto_brightness effect", () => {
    expect(buildEffectUrl(baseUrl, { autoBrightness: true })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_auto_brightness/v1/atlas/sample.jpg"
    );
  });

  it("applies default vibrance effect", () => {
    expect(buildEffectUrl(baseUrl, { vibrance: true })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_vibrance/v1/atlas/sample.jpg"
    );
  });

  it("applies vibrance with strength", () => {
    expect(buildEffectUrl(baseUrl, { vibrance: 50 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_vibrance:50/v1/atlas/sample.jpg"
    );
    expect(buildEffectUrl(baseUrl, { vibrance: -30 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_vibrance:-30/v1/atlas/sample.jpg"
    );
  });

  it("clamps vibrance to valid range", () => {
    expect(buildEffectUrl(baseUrl, { vibrance: -150 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_vibrance:-100/v1/atlas/sample.jpg"
    );
    expect(buildEffectUrl(baseUrl, { vibrance: 150 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_vibrance:100/v1/atlas/sample.jpg"
    );
  });

  it("combines multiple effects", () => {
    expect(buildEffectUrl(baseUrl, { sharpen: true, improve: true, vibrance: 30 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen,e_improve,e_vibrance:30/v1/atlas/sample.jpg"
    );
  });

  it("returns original URL when no effects provided", () => {
    expect(buildEffectUrl(baseUrl, {})).toBe(baseUrl);
  });
});

describe("buildGravityCropUrl", () => {
  const baseUrl = "https://res.cloudinary.com/demo/image/upload/v1/atlas/sample.jpg";

  it("returns original URL for non-Cloudinary URLs", () => {
    const nonCloudinaryUrl = "https://example.com/image.jpg";
    expect(buildGravityCropUrl(nonCloudinaryUrl, { width: 800, height: 600 })).toBe(nonCloudinaryUrl);
  });

  it("applies basic crop with width and height", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600/v1/atlas/sample.jpg"
    );
  });

  it("applies auto gravity crop", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600, gravity: "auto" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_auto/v1/atlas/sample.jpg"
    );
  });

  it("applies face gravity crop", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600, gravity: "face" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_face/v1/atlas/sample.jpg"
    );
  });

  it("applies faces gravity crop", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600, gravity: "faces" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_faces/v1/atlas/sample.jpg"
    );
  });

  it("does not add gravity for center (default)", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600, gravity: "center" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600/v1/atlas/sample.jpg"
    );
  });

  it("applies custom gravity with coordinates", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800, height: 600, gravity: "custom", x: 100, y: 50 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_custom,x_100,y_50/v1/atlas/sample.jpg"
    );
  });

  it("clamps dimensions to minimum of 1", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 0, height: -10 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_1,h_1/v1/atlas/sample.jpg"
    );
  });

  it("rounds dimensions to integers", () => {
    expect(buildGravityCropUrl(baseUrl, { width: 800.7, height: 600.3 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_801,h_600/v1/atlas/sample.jpg"
    );
  });
});

describe("buildTransformUrl", () => {
  const baseUrl = "https://res.cloudinary.com/demo/image/upload/v1/atlas/sample.jpg";

  it("returns original URL for non-Cloudinary URLs", () => {
    const nonCloudinaryUrl = "https://example.com/image.jpg";
    expect(buildTransformUrl(nonCloudinaryUrl, { optimize: { quality: "auto" } })).toBe(nonCloudinaryUrl);
  });

  it("applies only optimization", () => {
    expect(buildTransformUrl(baseUrl, { optimize: { quality: "auto:eco", format: "webp" } })).toBe(
      "https://res.cloudinary.com/demo/image/upload/q_auto:eco,f_webp/v1/atlas/sample.jpg"
    );
  });

  it("applies only effects", () => {
    expect(buildTransformUrl(baseUrl, { effects: { sharpen: true, improve: true } })).toBe(
      "https://res.cloudinary.com/demo/image/upload/e_sharpen,e_improve/v1/atlas/sample.jpg"
    );
  });

  it("applies only crop", () => {
    expect(buildTransformUrl(baseUrl, { crop: { width: 800, height: 600, gravity: "auto" } })).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_auto/v1/atlas/sample.jpg"
    );
  });

  it("combines crop, effects, and optimization in correct order", () => {
    expect(
      buildTransformUrl(baseUrl, {
        crop: { width: 800, height: 600, gravity: "auto" },
        effects: { sharpen: true },
        optimize: { quality: "auto:eco", format: "webp" },
      })
    ).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_crop,w_800,h_600,g_auto/e_sharpen/q_auto:eco,f_webp/v1/atlas/sample.jpg"
    );
  });

  it("handles empty recipe", () => {
    expect(buildTransformUrl(baseUrl, {})).toBe(baseUrl);
  });
});
