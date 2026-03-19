export type GridTransform = (src: string | undefined, preset: string) => string | undefined;

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

