/**
 * Core image analysis — shared between the reactive hook (use-image-brightness)
 * and the warmup system (image-warmup).
 *
 * Single source of truth for the canvas-based luminance + hue extraction.
 * Operates on an already-loaded HTMLImageElement (synchronous).
 */

export interface ImageAnalysis {
  brightness: number; // 0 = black, 1 = white
  hue: number;        // 0-360 degrees
}

const SAMPLE_SIZE = 32;
const FALLBACK: ImageAnalysis = { brightness: 0.5, hue: 0 };

/**
 * Sample an image's average perceived brightness and dominant hue
 * by drawing to a tiny offscreen canvas and averaging pixel data.
 */
export function analyzeImageElement(img: HTMLImageElement): ImageAnalysis {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK;

  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE;

  let totalLuminance = 0;
  let hueX = 0;
  let hueY = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    // Perceived luminance (ITU-R BT.709)
    totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // RGB → HSL for weighted hue accumulation
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max !== min) {
      const d = max - min;
      const l = (max + min) / 2;
      const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      let h = 0;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      const rad = (h * 360 * Math.PI) / 180;
      hueX += Math.cos(rad) * s;
      hueY += Math.sin(rad) * s;
    }
  }

  const brightness = totalLuminance / pixelCount;
  let hue = (Math.atan2(hueY, hueX) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return { brightness, hue };
}

/**
 * Analyse an image URL asynchronously.
 * Loads the image, then delegates to analyzeImageElement.
 */
export function analyzeImageUrl(src: string): Promise<ImageAnalysis> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => resolve(analyzeImageElement(img));
    img.onerror = () => resolve(FALLBACK);
  });
}
