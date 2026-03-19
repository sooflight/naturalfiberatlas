import data from "./atlas-data.json";

// Ignore HMR updates for the static data file to prevent the admin page 
// from violently reloading while the user is actively saving node edits.
if (import.meta.hot) {
  import.meta.hot.accept("./atlas-data.json", () => {
    // Intentionally left blank. The admin context handles its own mutations.
  });
}

import type { ImageMap, VideoEntry, EmbedEntry, LinkEntry } from "../../types/atlas-media";

export const ATLAS_IMAGES: ImageMap = data.images;
export const ATLAS_TAGS: Record<string, string[]> = data.tags as Record<string, string[]>;
export const PROFILE_ERA: Record<string, string> = data.era;
export const PROFILE_ORIGINS: Record<string, string> = data.origins;
export const SCIENTIFIC_NAMES: Record<string, string> = data.scientific;
export const ATLAS_VIDEOS: Record<string, VideoEntry[]> = (data as any).videos ?? {};
export const ATLAS_EMBEDS: Record<string, EmbedEntry[]> = (data as any).embeds ?? {};
export const ATLAS_LINKS: Record<string, LinkEntry[]> = (data as any).links ?? {};
export const DELETED_PROFILES = new Set<string>();

export type { ImageMap, AtlasMedia, ImageEntry, VideoEntry, EmbedEntry, LinkEntry } from "../../types/atlas-media";

// Re-export image URL utilities from unified location
// These are now deprecated - import directly from '@/utils/imageUrl' for new code
export {
  extractImageUrl as mediaUrl,
  extractThumbUrl as mediaThumbUrl,
  toUrlArray,
  toEntryArray,
} from "../../utils/admin/imageUrl";
