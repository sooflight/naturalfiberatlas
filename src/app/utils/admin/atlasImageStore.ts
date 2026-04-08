import { adminRoute, authenticatedFetch } from "@/utils/adminRoutes";
import type { ImageEntry } from "@/types/atlas-media";

export type ImageMap = Record<string, ImageEntry | ImageEntry[]>;

export interface AtlasDiskDataRead {
  images: ImageMap;
  full: Record<string, unknown>;
  revision: string | null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readAtlasDiskData(): Promise<AtlasDiskDataRead | null> {
  try {
    const res = await authenticatedFetch(adminRoute("/__admin/read-atlas-data"));
    if (!res.ok) return null;
    const payload = (await res.json()) as unknown;
    if (!isObjectRecord(payload)) return null;
    // Proxies or misconfigured routes sometimes return { error } with a 2xx body — do not treat as atlas.
    if (typeof payload.error === "string" && payload.error.trim().length > 0 && !isObjectRecord(payload.data)) {
      return null;
    }
    if (isObjectRecord(payload.data)) {
      const revision = typeof payload.revision === "string" ? payload.revision : null;
      return {
        images: (payload.data.images ?? {}) as ImageMap,
        full: payload.data as Record<string, unknown>,
        revision,
      };
    }
    const data = payload;
    return { images: (data.images ?? {}) as ImageMap, full: data, revision: null };
  } catch {
    return null;
  }
}

export interface AtlasWriteOptions {
  expectedRevision?: string | null;
}

export interface AtlasWriteResult {
  ok: boolean;
  conflict: boolean;
  revision: string | null;
}

export async function writeAtlasDiskData(
  full: unknown,
  options?: AtlasWriteOptions,
): Promise<AtlasWriteResult> {
  try {
    const res = await authenticatedFetch(adminRoute("/__admin/save-atlas-data"), {
      method: "POST",
      body: JSON.stringify({
        data: full,
        expectedRevision: options?.expectedRevision ?? null,
      }),
    });
    const payload = (await res.json().catch(() => null)) as { revision?: unknown } | null;
    const revision = typeof payload?.revision === "string" ? payload.revision : null;
    if (res.status === 409) return { ok: false, conflict: true, revision };
    return { ok: res.ok, conflict: false, revision };
  } catch {
    return { ok: false, conflict: false, revision: null };
  }
}

export async function atomicImageUpdate(
  mutate: (diskImages: ImageMap) => ImageMap
): Promise<ImageMap | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const disk = await readAtlasDiskData();
    if (!disk) return null;
    const updated = mutate(disk.images);
    disk.full.images = updated;
    const write = await writeAtlasDiskData(disk.full, {
      expectedRevision: disk.revision,
    });
    if (write.ok) return updated;
    if (!write.conflict) return null;
  }
  return null;
}

export function normalizeImageEntries(
  current: ImageEntry | ImageEntry[] | undefined
): ImageEntry[] {
  if (!current) return [];
  return Array.isArray(current) ? current : [current];
}
