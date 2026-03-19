import type { GalleryImageEntry } from "../../../data/fibers";
import type {
  DomainImage,
  ImageImportMergeResult,
  ProfileImageLinksExportPayload,
  ProfileImageMap,
} from "./types";

function makeImageId(url: string, index: number): string {
  return `${index}:${url}`;
}

export function toDomainImages(images: GalleryImageEntry[]): DomainImage[] {
  return images.map((image, index) => ({
    id: makeImageId(image.url, index),
    url: image.url,
    title: image.title,
    attribution: image.attribution,
    orientation: image.orientation,
    provider: image.provider,
    rights: image.rights,
    licenseUrl: image.licenseUrl,
    sourceManifest: image.sourceManifest,
    tileSource: image.tileSource,
    width: image.width,
    height: image.height,
    thumbUrl: image.thumbUrl,
    tags: image.tags,
  }));
}

export function toGalleryImages(images: DomainImage[]): GalleryImageEntry[] {
  return images.map((image) => ({
    url: image.url,
    title: image.title,
    attribution: image.attribution,
    orientation: image.orientation,
    provider: image.provider,
    rights: image.rights,
    licenseUrl: image.licenseUrl,
    sourceManifest: image.sourceManifest,
    tileSource: image.tileSource,
    width: image.width,
    height: image.height,
    thumbUrl: image.thumbUrl,
    tags: image.tags,
  }));
}

export function promoteHeroImage(images: DomainImage[], index: number): DomainImage[] {
  if (index < 0 || index >= images.length || index === 0) {
    return images;
  }
  const next = [...images];
  const [hero] = next.splice(index, 1);
  next.unshift(hero);
  return next;
}

export function buildProfileImageLinksExport(
  imageMap: ProfileImageMap,
  exportedAt: string = new Date().toISOString(),
): ProfileImageLinksExportPayload {
  const profiles = Object.keys(imageMap)
    .sort((a, b) => a.localeCompare(b))
    .map((profileKey) => {
      const imageLinks = imageMap[profileKey].map((image) => image.url);
      return {
        profileKey,
        imageLinks,
        imageCount: imageLinks.length,
      };
    });

  const imageLinkCount = profiles.reduce((sum, profile) => sum + profile.imageCount, 0);
  return {
    exportedAt,
    profileCount: profiles.length,
    imageLinkCount,
    profiles,
  };
}

export function safeMergeImageImport(
  current: ProfileImageMap,
  incoming: ProfileImageMap,
): ImageImportMergeResult {
  const merged: ProfileImageMap = { ...current };
  let newProfiles = 0;
  let updatedProfiles = 0;
  let newImages = 0;

  for (const [profileKey, incomingImages] of Object.entries(incoming)) {
    const existing = merged[profileKey];
    if (!existing) {
      merged[profileKey] = [...incomingImages];
      newProfiles += 1;
      newImages += incomingImages.length;
      continue;
    }

    const existingUrls = new Set(existing.map((image) => image.url));
    const deduped = [...existing];
    let addedToProfile = 0;
    for (const candidate of incomingImages) {
      if (existingUrls.has(candidate.url)) {
        continue;
      }
      deduped.push(candidate);
      existingUrls.add(candidate.url);
      addedToProfile += 1;
    }

    if (addedToProfile > 0) {
      merged[profileKey] = deduped;
      updatedProfiles += 1;
      newImages += addedToProfile;
    }
  }

  return {
    merged,
    stats: {
      newProfiles,
      updatedProfiles,
      newImages,
    },
  };
}

