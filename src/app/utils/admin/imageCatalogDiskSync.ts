import type { ImageMap } from "@/types/atlas-media";
import { adminRoute, authenticatedFetch } from "./adminRoutes";
import { toUrlArray } from "./imageUrl";

export interface ProfileImageLinksDiskPayload {
  exportedAt: string;
  profileCount: number;
  imageLinkCount: number;
  profiles: Array<{ profileKey: string; imageLinks: string[]; imageCount: number }>;
}

export function buildProfileImageLinksDiskPayload(
  imageMap: ImageMap,
  exportedAt: string = new Date().toISOString(),
): ProfileImageLinksDiskPayload {
  const profiles = Object.keys(imageMap)
    .sort((a, b) => a.localeCompare(b))
    .map((profileKey) => {
      const imageLinks = toUrlArray(imageMap[profileKey]);
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

function imageMapSyncFingerprint(map: ImageMap): string {
  const keys = Object.keys(map).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const urls = toUrlArray(map[k]);
    parts.push(`${k}:${urls.join("\u001e")}`);
  }
  return parts.join("\u001f");
}

let lastSuccessfulSyncFingerprint = "";

export type ImageCatalogDiskSyncResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; atlasBytes: number; newImagesBytes: number }
  | { ok: false; error: string };

/**
 * Persists the Image Base map into `atlas-data.json` (merged `images`) and
 * `new-images.json` (gallery URL manifest) via the Vite dev admin API.
 * No-ops when the payload matches the last successful sync fingerprint.
 */
export async function syncImageCatalogToDisk(imageMap: ImageMap): Promise<ImageCatalogDiskSyncResult> {
  const fingerprint = imageMapSyncFingerprint(imageMap);
  if (fingerprint === lastSuccessfulSyncFingerprint) {
    return { ok: true, skipped: true };
  }

  const newImagesPayload = buildProfileImageLinksDiskPayload(imageMap);

  try {
    const res = await authenticatedFetch(adminRoute("/__admin/sync-image-catalog"), {
      method: "POST",
      body: JSON.stringify({
        images: imageMap,
        newImages: newImagesPayload,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { error?: string } | null;
      const msg = body?.error ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const json = (await res.json()) as { atlasBytes?: number; newImagesBytes?: number };
    lastSuccessfulSyncFingerprint = fingerprint;
    return {
      ok: true,
      skipped: false,
      atlasBytes: json.atlasBytes ?? 0,
      newImagesBytes: json.newImagesBytes ?? 0,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    return { ok: false, error: message };
  }
}

/** Test hook: reset dedupe state */
export function resetImageCatalogDiskSyncFingerprintForTests(): void {
  lastSuccessfulSyncFingerprint = "";
}
