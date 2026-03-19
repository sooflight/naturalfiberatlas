import type { GalleryImageEntry } from "../../data/fibers";
import LegacyImageScoutPanel from "./ImageScoutPanel";
import { AdminSettingsProvider } from "./runtime/AdminSettingsContext";
import type { AtlasMedia } from "@/types/atlas-media";

type ImageEntry = string | AtlasMedia;
type ImageMap = Record<string, ImageEntry | ImageEntry[]>;

interface ImageScoutPanelProps {
  profileId: string;
  existingImages: GalleryImageEntry[];
  allProfileIds?: string[];
  onRemoveExistingImage?: (index: number) => void;
  onMoveExistingImage?: (fromIndex: number, toIndex: number) => void;
  onAddImages: (
    images: GalleryImageEntry[],
    mode: "direct" | "upload",
    profileId?: string,
  ) => void | Promise<void>;
  profileImagesById?: Record<string, GalleryImageEntry[]>;
  profileTagsById?: Record<string, string[]>;
  profileEraById?: Record<string, string>;
  profileOriginsById?: Record<string, string>;
  profileScientificById?: Record<string, string>;
  queue?: string[];
  onQueueClose?: () => void;
}

function atlasMediaToGalleryEntry(entry: AtlasMedia): GalleryImageEntry {
  return {
    url: entry.url,
    title: entry.title,
    attribution: entry.attribution,
    provider: entry.provider,
    rights: entry.rights,
    licenseUrl: entry.licenseUrl,
    sourceManifest: entry.sourceManifest,
    tileSource: entry.tileSource,
    width: entry.width,
    height: entry.height,
    thumbUrl: entry.thumbUrl,
  };
}

function toImageMap(profileImagesById?: Record<string, GalleryImageEntry[]>): ImageMap {
  if (!profileImagesById) return {};
  const out: ImageMap = {};
  for (const [key, images] of Object.entries(profileImagesById)) {
    out[key] = images.map((img) => ({
      url: img.url,
      title: img.title,
      attribution: img.attribution,
      provider: img.provider,
      rights: img.rights,
      licenseUrl: img.licenseUrl,
      sourceManifest: img.sourceManifest,
      tileSource: img.tileSource,
      width: img.width,
      height: img.height,
      thumbUrl: img.thumbUrl,
    }));
  }
  return out;
}

export function ImageScoutPanel({
  profileId,
  existingImages,
  allProfileIds,
  onRemoveExistingImage,
  onMoveExistingImage,
  onAddImages,
  profileImagesById,
  profileTagsById,
  profileEraById,
  profileOriginsById,
  profileScientificById,
  queue,
  onQueueClose,
}: ImageScoutPanelProps) {
  const allProfileKeys = allProfileIds && allProfileIds.length > 0 ? allProfileIds : [profileId];
  const imagesMap = toImageMap(
    profileImagesById ?? {
      [profileId]: existingImages,
    },
  );

  return (
    <AdminSettingsProvider>
      <LegacyImageScoutPanel
        allProfileKeys={allProfileKeys}
        initialProfile={profileId}
        initialQuery={profileId.replace(/-/g, " ")}
        embedded
        queue={queue}
        onQueueClose={onQueueClose}
        images={imagesMap}
        tags={profileTagsById}
        era={profileEraById}
        origins={profileOriginsById}
        scientific={profileScientificById}
        onAddImages={async (targetProfile, urls, media) => {
          const nextImages = media?.length
            ? media.map(atlasMediaToGalleryEntry)
            : urls.map((url) => ({ url }));
          await Promise.resolve(onAddImages(nextImages, "direct", targetProfile));
        }}
        onRemoveImage={(targetProfile, idx) => {
          if (targetProfile === profileId) onRemoveExistingImage?.(idx);
        }}
        onReorderImages={(targetProfile, from, to) => {
          if (targetProfile === profileId) onMoveExistingImage?.(from, to);
        }}
        onClose={() => {}}
        onFlash={() => {}}
      />
    </AdminSettingsProvider>
  );
}

