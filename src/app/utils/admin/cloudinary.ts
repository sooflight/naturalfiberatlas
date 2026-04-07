import { authenticatedFetch } from "./adminRoutes";
import { isCloudinaryUrl as isCloudinaryUrlBase, stripCloudinaryTransform as stripCloudinaryTransformBase } from "./imageUrl";

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
}

export interface CloudinarySignedStatus {
  configured: boolean;
  cloudNameConfigured: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
}

interface CropOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface UploadOptions {
  folder?: string;
}

interface CloudinaryUpscaleRequest {
  imageUrl: string;
  cloudName: string;
  scale?: "2x" | "4x";
}

function buildUploadUrl(cloudName: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

function getCloudinaryErrorMessage(status: number, body: unknown, fallbackPrefix: string): string {
  const direct =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : "";
  const message =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: unknown }).error === "object" &&
    (body as { error?: { message?: unknown } }).error?.message &&
    typeof (body as { error?: { message?: unknown } }).error?.message === "string"
      ? (body as { error: { message: string } }).error.message
      : "";
  return direct || message || `${fallbackPrefix} (${status})`;
}

// Re-export from unified imageUrl utility for backward compatibility
export const isCloudinaryUrl = isCloudinaryUrlBase;
export const stripCropTransform = stripCloudinaryTransformBase;

/** True when we can splice a c_crop into the delivery URL (upload or fetch). */
export function canApplyCloudinaryCrop(url: string): boolean {
  if (!isCloudinaryUrl(url)) return false;
  return url.includes("/image/upload/") || url.includes("/image/fetch/");
}

export function buildCropUrl(url: string, opts: CropOptions): string {
  if (!isCloudinaryUrl(url)) return url;
  const transform = [
    "c_crop",
    opts.width ? `w_${Math.max(1, Math.round(opts.width))}` : "",
    opts.height ? `h_${Math.max(1, Math.round(opts.height))}` : "",
    typeof opts.x === "number" ? `x_${Math.round(opts.x)}` : "",
    typeof opts.y === "number" ? `y_${Math.round(opts.y)}` : "",
  ]
    .filter(Boolean)
    .join(",");
  if (!transform) return url;
  if (url.includes("/image/upload/")) {
    return url.replace("/image/upload/", `/image/upload/${transform}/`);
  }
  if (url.includes("/image/fetch/")) {
    return url.replace("/image/fetch/", `/image/fetch/${transform}/`);
  }
  return url;
}

// Optimization transforms for auto-quality and auto-format
export interface OptimizeOptions {
  quality?: "auto" | "auto:best" | "auto:eco" | "auto:low" | number;
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  width?: number;
  height?: number;
}

export function buildOptimizedUrl(url: string, opts?: OptimizeOptions): string {
  if (!isCloudinaryUrl(url)) return url;

  const transforms: string[] = [];

  // Add resize if dimensions specified
  if (opts?.width || opts?.height) {
    const w = opts.width ? `w_${Math.max(1, Math.round(opts.width))}` : "";
    const h = opts.height ? `h_${Math.max(1, Math.round(opts.height))}` : "";
    transforms.push(["c_fit", w, h].filter(Boolean).join(","));
  }

  // Add quality (check for undefined, not falsy, to handle quality: 0)
  if (opts?.quality !== undefined) {
    if (typeof opts.quality === "number") {
      transforms.push(`q_${Math.max(1, Math.min(100, Math.round(opts.quality)))}`);
    } else {
      transforms.push(`q_${opts.quality}`);
    }
  }

  // Add format
  if (opts?.format) {
    transforms.push(`f_${opts.format}`);
  }

  if (transforms.length === 0) return url;

  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

// Effect transforms for AI enhancements
export interface EffectOptions {
  sharpen?: boolean | number; // true for default, or 100-2000 for strength
  improve?: boolean;
  autoBrightness?: boolean;
  vibrance?: boolean | number; // true for default, or -100 to 100
  upscale?: "2x" | "4x";
}

export function buildEffectUrl(url: string, opts: EffectOptions): string {
  if (!isCloudinaryUrl(url)) return url;

  const effects: string[] = [];

  if (opts.sharpen) {
    if (typeof opts.sharpen === "number") {
      effects.push(`e_sharpen:${Math.max(100, Math.min(2000, Math.round(opts.sharpen)))}`);
    } else {
      effects.push("e_sharpen");
    }
  }

  if (opts.improve) {
    effects.push("e_improve");
  }

  if (opts.autoBrightness) {
    effects.push("e_auto_brightness");
  }

  if (opts.vibrance) {
    if (typeof opts.vibrance === "number") {
      effects.push(`e_vibrance:${Math.max(-100, Math.min(100, Math.round(opts.vibrance)))}`);
    } else {
      effects.push("e_vibrance");
    }
  }

  if (opts.upscale) {
    effects.push(`e_upscale`);
  }

  if (effects.length === 0) return url;

  return url.replace("/upload/", `/upload/${effects.join(",")}/`);
}

// Smart crop with gravity options
export interface GravityCropOptions {
  width: number;
  height: number;
  gravity?: "auto" | "face" | "faces" | "center" | "custom";
  x?: number;
  y?: number;
}

export function buildGravityCropUrl(url: string, opts: GravityCropOptions): string {
  if (!isCloudinaryUrl(url)) return url;

  const transforms: string[] = [];

  // Build crop transform
  const cropParts = [
    "c_crop",
    `w_${Math.max(1, Math.round(opts.width))}`,
    `h_${Math.max(1, Math.round(opts.height))}`,
  ];

  // Add gravity if specified
  if (opts.gravity && opts.gravity !== "center") {
    cropParts.push(`g_${opts.gravity}`);
  }

  // Add custom coordinates for manual cropping
  if (opts.gravity === "custom" && typeof opts.x === "number" && typeof opts.y === "number") {
    cropParts.push(`x_${Math.round(opts.x)}`, `y_${Math.round(opts.y)}`);
  }

  transforms.push(cropParts.join(","));

  return url.replace("/upload/", `/upload/${transforms.join(",")}/`);
}

// Combined transform builder for complex recipes
export interface TransformRecipe {
  crop?: GravityCropOptions;
  optimize?: OptimizeOptions;
  effects?: EffectOptions;
}

function insertTransformSegment(url: string, segment: string): string {
  // Insert the transform segment right after /upload/
  return url.replace("/upload/", `/upload/${segment}/`);
}

export function buildTransformUrl(url: string, recipe: TransformRecipe): string {
  if (!isCloudinaryUrl(url)) return url;

  // Build transform segments in correct order: crop -> effects -> optimize
  const segments: string[] = [];

  // Crop segment
  if (recipe.crop) {
    const cropParts = [
      "c_crop",
      `w_${Math.max(1, Math.round(recipe.crop.width))}`,
      `h_${Math.max(1, Math.round(recipe.crop.height))}`,
    ];
    if (recipe.crop.gravity && recipe.crop.gravity !== "center") {
      cropParts.push(`g_${recipe.crop.gravity}`);
    }
    if (recipe.crop.gravity === "custom" && typeof recipe.crop.x === "number" && typeof recipe.crop.y === "number") {
      cropParts.push(`x_${Math.round(recipe.crop.x)}`, `y_${Math.round(recipe.crop.y)}`);
    }
    segments.push(cropParts.join(","));
  }

  // Effects segment
  if (recipe.effects && Object.keys(recipe.effects).length > 0) {
    const effects: string[] = [];
    if (recipe.effects.sharpen) {
      if (typeof recipe.effects.sharpen === "number") {
        effects.push(`e_sharpen:${Math.max(100, Math.min(2000, Math.round(recipe.effects.sharpen)))}`);
      } else {
        effects.push("e_sharpen");
      }
    }
    if (recipe.effects.improve) {
      effects.push("e_improve");
    }
    if (recipe.effects.autoBrightness) {
      effects.push("e_auto_brightness");
    }
    if (recipe.effects.vibrance) {
      if (typeof recipe.effects.vibrance === "number") {
        effects.push(`e_vibrance:${Math.max(-100, Math.min(100, Math.round(recipe.effects.vibrance)))}`);
      } else {
        effects.push("e_vibrance");
      }
    }
    if (recipe.effects.upscale) {
      effects.push("e_upscale");
    }
    if (effects.length > 0) {
      segments.push(effects.join(","));
    }
  }

  // Optimization segment (always last)
  if (recipe.optimize && Object.keys(recipe.optimize).length > 0) {
    const optimizeParts: string[] = [];
    if (recipe.optimize.width || recipe.optimize.height) {
      const w = recipe.optimize.width ? `w_${Math.max(1, Math.round(recipe.optimize.width))}` : "";
      const h = recipe.optimize.height ? `h_${Math.max(1, Math.round(recipe.optimize.height))}` : "";
      optimizeParts.push(["c_fit", w, h].filter(Boolean).join(","));
    }
    if (recipe.optimize.quality !== undefined) {
      if (typeof recipe.optimize.quality === "number") {
        optimizeParts.push(`q_${Math.max(1, Math.min(100, Math.round(recipe.optimize.quality)))}`);
      } else {
        optimizeParts.push(`q_${recipe.optimize.quality}`);
      }
    }
    if (recipe.optimize.format) {
      optimizeParts.push(`f_${recipe.optimize.format}`);
    }
    if (optimizeParts.length > 0) {
      segments.push(optimizeParts.join(","));
    }
  }

  if (segments.length === 0) return url;

  return insertTransformSegment(url, segments.join("/"));
}

export async function testCloudinaryConnection(config: CloudinaryConfig): Promise<void> {
  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("Cloudinary cloudName and uploadPreset are required");
  }
  const form = new FormData();
  // Tiny transparent GIF probe keeps payload minimal.
  form.append("file", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==");
  form.append("upload_preset", config.uploadPreset);
  form.append("folder", "atlas/connection-probes");
  form.append("tags", "atlas_connection_probe");

  const res = await fetch(buildUploadUrl(config.cloudName), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getCloudinaryErrorMessage(res.status, body, "Cloudinary connection test failed"));
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) {
    throw new Error("Cloudinary connection test returned no secure_url");
  }
}

export async function uploadToCloudinary(
  file: Blob,
  config: CloudinaryConfig,
  options?: UploadOptions
): Promise<string> {
  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("Cloudinary cloudName and uploadPreset are required");
  }
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", config.uploadPreset);
  if (options?.folder) form.append("folder", options.folder);

  const res = await fetch(buildUploadUrl(config.cloudName), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getCloudinaryErrorMessage(res.status, body, "Cloudinary upload failed"));
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }
  return json.secure_url;
}

export async function uploadFromUrl(
  url: string,
  config: CloudinaryConfig,
  options?: UploadOptions
): Promise<string> {
  if (!config.cloudName || !config.uploadPreset) {
    throw new Error("Cloudinary cloudName and uploadPreset are required");
  }
  const form = new FormData();
  form.append("file", url);
  form.append("upload_preset", config.uploadPreset);
  if (options?.folder) form.append("folder", options.folder);

  const res = await fetch(buildUploadUrl(config.cloudName), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getCloudinaryErrorMessage(res.status, body, "Cloudinary upload-by-url failed"));
  }
  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) {
    throw new Error("Cloudinary response missing secure_url");
  }
  return json.secure_url;
}

export async function getCloudinarySignedStatus(): Promise<CloudinarySignedStatus> {
  const res = await authenticatedFetch("/__admin/cloudinary-signed-status", {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getCloudinaryErrorMessage(res.status, body, "Cloudinary signed tools check failed"));
  }
  return (await res.json()) as CloudinarySignedStatus;
}

export async function requestCloudinaryUpscale(input: CloudinaryUpscaleRequest): Promise<string> {
  if (!input.imageUrl) throw new Error("imageUrl is required");
  if (!input.cloudName) throw new Error("cloudName is required");
  const res = await authenticatedFetch("/__admin/cloudinary-upscale", {
    method: "POST",
    body: JSON.stringify({
      imageUrl: input.imageUrl,
      cloudName: input.cloudName,
      scale: input.scale || "2x",
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(getCloudinaryErrorMessage(res.status, body, "Cloudinary upscale failed"));
  }
  const json = (await res.json()) as { secureUrl?: string };
  if (!json.secureUrl) {
    throw new Error("Cloudinary upscale response missing secureUrl");
  }
  return json.secureUrl;
}
