import { adminRoute, authenticatedFetch } from "@/utils/adminRoutes";
import type { ImageEntry } from "@/types/atlas-media";

export type ImageMap = Record<string, ImageEntry | ImageEntry[]>;

export async function readAtlasDiskData(): Promise<{ images: ImageMap; full: Record<string, unknown> } | null> {
  try {
    const res = await authenticatedFetch(adminRoute("/__admin/read-atlas-data"));
    if (!res.ok) return null;
    const data = await res.json();
    return { images: (data.images ?? {}) as ImageMap, full: data as Record<string, unknown> };
  } catch {
    return null;
  }
}

export async function writeAtlasDiskData(full: unknown): Promise<boolean> {
  try {
    const res = await authenticatedFetch(adminRoute("/__admin/save-atlas-data"), {
      method: "POST",
      body: JSON.stringify(full, null, 2),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function atomicImageUpdate(
  mutate: (diskImages: ImageMap) => ImageMap
): Promise<ImageMap | null> {
  const disk = await readAtlasDiskData();
  if (!disk) return null;
  const updated = mutate(disk.images);
  disk.full.images = updated;
  const ok = await writeAtlasDiskData(disk.full);
  return ok ? updated : null;
}

export function normalizeImageEntries(
  current: ImageEntry | ImageEntry[] | undefined
): ImageEntry[] {
  if (!current) return [];
  return Array.isArray(current) ? current : [current];
}
