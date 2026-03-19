import { buildOptimizedUrl, isCloudinaryUrl } from "@/utils/cloudinary";

export type PreviewPreset = "compact-cards" | "compact-grid" | "list-expanded";
export type LayoutMode = "cards" | "grid" | "list";

const PRESET_WIDTHS: Record<PreviewPreset, number> = {
  "compact-cards": 640,
  "compact-grid": 420,
  "list-expanded": 560,
};

const PRESET_HEIGHTS: Partial<Record<PreviewPreset, number>> = {
  "compact-cards": 400,
  "compact-grid": 420,
  "list-expanded": 420,
};

const PRESET_QUALITY: Record<PreviewPreset, "auto" | "auto:best" | "auto:eco"> = {
  "compact-cards": "auto",
  "compact-grid": "auto:eco",
  "list-expanded": "auto",
};

function getPresetWidth(preset: PreviewPreset): number {
  return PRESET_WIDTHS[preset];
}

function getPresetHeight(preset: PreviewPreset): number | undefined {
  return PRESET_HEIGHTS[preset];
}

export function isTransformableImageHost(url: string): boolean {
  return isCloudinaryUrl(url);
}

export function buildPreviewImageSrc(url: string, preset: PreviewPreset): string {
  if (!isTransformableImageHost(url)) return url;
  return buildOptimizedUrl(url, {
    width: getPresetWidth(preset),
    height: getPresetHeight(preset),
    quality: PRESET_QUALITY[preset],
    format: "auto",
  });
}

export function buildPreviewSrcSet(url: string, preset: PreviewPreset): string | undefined {
  if (!isTransformableImageHost(url)) return undefined;
  const base = getPresetWidth(preset);
  const widths = [Math.round(base * 0.66), base, Math.round(base * 1.33)];
  const unique = Array.from(new Set(widths.filter((value) => value > 0))).sort((a, b) => a - b);
  return unique
    .map((width) => {
      const transformed = buildOptimizedUrl(url, {
        width,
        quality: PRESET_QUALITY[preset],
        format: "auto",
      });
      return `${transformed} ${width}w`;
    })
    .join(", ");
}

export function getPreviewSizes(layoutMode: LayoutMode, zoom: number): string {
  if (layoutMode === "grid") {
    return "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 20vw";
  }
  if (layoutMode === "cards") {
    return "(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw";
  }
  const bounded = Math.max(160, Math.min(720, Math.round(zoom)));
  return `${bounded}px`;
}

export function getPreviewPreset(layoutMode: LayoutMode): PreviewPreset {
  if (layoutMode === "grid") return "compact-grid";
  if (layoutMode === "cards") return "compact-cards";
  return "list-expanded";
}
