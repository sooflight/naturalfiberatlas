import { previewFocalToObjectPosition, type PreviewFocalPoint } from "./preview-focal";

export type GridTransform = (src: string | undefined, preset: string) => string | undefined;

export type ProfileCardCrossfadeLayer = { url: string; objectPosition?: string };

function isStableCycleUrl(url: string): boolean {
  return !url.trim().toLowerCase().startsWith("blob:");
}

/**
 * Build the profile-card cycle image set according to Atlas spec:
 * slot 0 = transformed primary image, slots 1-2 = first transformed gallery
 * images that are valid and distinct from slot 0.
 */
export function buildProfileCardCrossfadeImages(
  primaryImage: string,
  galleryUrls: string[] | undefined,
  transform: GridTransform,
): string[] {
  const primaryTransformed = transform(primaryImage, "grid");
  if (!primaryTransformed) return [];

  const images = [primaryTransformed];
  const seen = new Set<string>([primaryTransformed]);

  for (const rawUrl of galleryUrls ?? []) {
    if (!rawUrl || !isStableCycleUrl(rawUrl)) continue;
    const transformed = transform(rawUrl, "grid");
    if (!transformed || seen.has(transformed)) continue;
    seen.add(transformed);
    images.push(transformed);
    if (images.length === 3) break;
  }

  return images;
}

export type GalleryPreviewLine = { url: string; previewFocal?: PreviewFocalPoint };

/**
 * Same URL ordering as {@link buildProfileCardCrossfadeImages}, plus optional
 * `object-position` from each gallery line’s `previewFocal`.
 */
export function buildProfileCardCrossfadeLayers(
  primaryImage: string,
  galleryLines: readonly GalleryPreviewLine[] | undefined,
  transform: GridTransform,
): ProfileCardCrossfadeLayer[] {
  const primaryTrim = primaryImage?.trim() ?? "";
  const primaryTransformed = transform(primaryTrim, "grid");
  if (!primaryTransformed) return [];

  const focalForPrimaryUrl = (): string | undefined => {
    const hit = galleryLines?.find((line) => line.url.trim() === primaryTrim);
    return previewFocalToObjectPosition(hit?.previewFocal);
  };

  const layers: ProfileCardCrossfadeLayer[] = [
    { url: primaryTransformed, objectPosition: focalForPrimaryUrl() },
  ];
  const seen = new Set<string>([primaryTransformed]);

  for (const line of galleryLines ?? []) {
    const rawUrl = line.url?.trim();
    if (!rawUrl || !isStableCycleUrl(rawUrl)) continue;
    const transformed = transform(rawUrl, "grid");
    if (!transformed || seen.has(transformed)) continue;
    seen.add(transformed);
    layers.push({
      url: transformed,
      objectPosition: previewFocalToObjectPosition(line.previewFocal),
    });
    if (layers.length === 3) break;
  }

  return layers;
}

