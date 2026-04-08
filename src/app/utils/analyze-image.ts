/**
 * Core image analysis — shared between the reactive hook (use-image-brightness)
 * and the warmup system (image-warmup).
 *
 * Single source of truth for the canvas-based luminance + hue extraction.
 * Operates on an already-loaded HTMLImageElement (synchronous).
 *
 * Hue extraction favors stable “natural” plant/fiber tones: sqrt saturation
 * weighting and a smoothed hue histogram reduce JPEG/chroma-outlier skew
 * (e.g. tiny q_10 thumbs reading pure red from earth greens and browns).
 */

export interface ImageAnalysis {
  brightness: number; // 0 = black, 1 = white
  hue: number;        // 0-360 degrees
}

const SAMPLE_SIZE = 48;
const HUE_BINS = 72; // 5° resolution
/** When the image is effectively achromatic, tint ambient UI slightly botanical */
const NEUTRAL_NATURAL_HUE = 84;
const MIN_SATURATION = 0.055;

/** Load/analysis failure — matches achromatic path hue for consistent ambient defaults */
export const DEFAULT_IMAGE_ANALYSIS_FALLBACK: ImageAnalysis = {
  brightness: 0.5,
  hue: NEUTRAL_NATURAL_HUE,
};

function mixHueDegrees(h1: number, h2: number, t: number): number {
  const r1 = (h1 * Math.PI) / 180;
  const r2 = (h2 * Math.PI) / 180;
  const x = (1 - t) * Math.cos(r1) + t * Math.cos(r2);
  const y = (1 - t) * Math.sin(r1) + t * Math.sin(r2);
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Sample an image's average perceived brightness and dominant hue
 * by drawing to a tiny offscreen canvas and averaging pixel data.
 */
export function analyzeImageElement(img: HTMLImageElement): ImageAnalysis {
  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return DEFAULT_IMAGE_ANALYSIS_FALLBACK;

  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
  const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE;

  let totalLuminance = 0;
  let hueX = 0;
  let hueY = 0;
  let totalHueWeight = 0;
  const binWeights = new Float64Array(HUE_BINS);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) continue;

    const d = max - min;
    const l = (max + min) / 2;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (s < MIN_SATURATION) continue;

    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;

    const hueDeg = h * 360;
    // Prefer mid-tones (highlights/shadows often carry compression color cast)
    const midTone = 1 - 0.82 * (2 * l - 1) ** 2;
    const w = Math.pow(s, 0.62) * Math.max(0.18, midTone);

    const rad = (hueDeg * Math.PI) / 180;
    hueX += Math.cos(rad) * w;
    hueY += Math.sin(rad) * w;
    totalHueWeight += w;

    const bin = Math.min(HUE_BINS - 1, Math.floor((hueDeg / 360) * HUE_BINS));
    binWeights[bin] += w;
  }

  const brightness = totalLuminance / pixelCount;

  const chromaMag = Math.hypot(hueX, hueY);
  if (chromaMag < 1e-5 || totalHueWeight < 1e-5) {
    return { brightness, hue: NEUTRAL_NATURAL_HUE };
  }

  let vectorHue = (Math.atan2(hueY, hueX) * 180) / Math.PI;
  if (vectorHue < 0) vectorHue += 360;

  const smooth = new Float64Array(HUE_BINS);
  for (let b = 0; b < HUE_BINS; b++) {
    const prev = binWeights[(b - 1 + HUE_BINS) % HUE_BINS];
    const next = binWeights[(b + 1) % HUE_BINS];
    smooth[b] = binWeights[b] + 0.22 * (prev + next);
  }

  let peak = 0;
  let peakBin = 0;
  let smoothSum = 0;
  for (let b = 0; b < HUE_BINS; b++) {
    smoothSum += smooth[b];
    if (smooth[b] > peak) {
      peak = smooth[b];
      peakBin = b;
    }
  }

  const histHue = ((peakBin + 0.5) / HUE_BINS) * 360;
  const peakRatio = smoothSum > 0 ? peak / smoothSum : 0;

  // Strong single-mode hue → trust histogram; flat → trust vector mean
  const histTrust = Math.max(0, Math.min(1, (peakRatio - 0.14) / 0.28));
  const hue = mixHueDegrees(vectorHue, histHue, histTrust);

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
    img.onerror = () => resolve(DEFAULT_IMAGE_ANALYSIS_FALLBACK);
  });
}
