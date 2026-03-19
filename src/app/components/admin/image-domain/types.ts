export type ImageOrientation = "portrait" | "landscape";

export interface DomainImage {
  id: string;
  url: string;
  title?: string;
  attribution?: string;
  orientation?: ImageOrientation;
  provider?: string;
  rights?: string;
  licenseUrl?: string;
  sourceManifest?: string;
  tileSource?: string;
  width?: number;
  height?: number;
  thumbUrl?: string;
  tags?: string[];
}

export type ProfileImageMap = Record<string, DomainImage[]>;

export interface ProfileImageLinksExportEntry {
  profileKey: string;
  imageLinks: string[];
  imageCount: number;
}

export interface ProfileImageLinksExportPayload {
  exportedAt: string;
  profileCount: number;
  imageLinkCount: number;
  profiles: ProfileImageLinksExportEntry[];
}

export interface ImageImportStats {
  newProfiles: number;
  updatedProfiles: number;
  newImages: number;
}

export interface ImageImportMergeResult {
  merged: ProfileImageMap;
  stats: ImageImportStats;
}

