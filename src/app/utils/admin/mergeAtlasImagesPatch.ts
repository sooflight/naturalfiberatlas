/**
 * Merge client Image Base patches into atlas-data.json `images` without dropping
 * disk-only keys. Used by the Vite admin sync route and unit-tested in isolation.
 */

function trimUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/** Collect display URLs from a single atlas `images` map value (JSON-shaped). */
export function collectUrlsFromAtlasImageValue(value: unknown): string[] {
  if (value == null) return [];
  const s = trimUrl(value);
  if (s) return [s];
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        const u = trimUrl(item);
        if (u) out.push(u);
        continue;
      }
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const u = trimUrl((item as { url?: unknown }).url);
        if (u) out.push(u);
      }
    }
    return out;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const u = trimUrl((value as { url?: unknown }).url);
    return u ? [u] : [];
  }
  return [];
}

/**
 * Apply a partial image map from the client: keys present in `patch` update or
 * remove (when no URLs remain) entries in `diskImages`. Keys only on disk are kept.
 */
export function mergeAtlasImagesFromClientPatch(
  diskImages: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...diskImages };
  for (const key of Object.keys(patch)) {
    const urls = collectUrlsFromAtlasImageValue(patch[key]);
    if (urls.length === 0) {
      delete next[key];
    } else {
      next[key] = patch[key];
    }
  }
  return next;
}

export interface NewImagesProfileRow {
  profileKey: string;
  imageLinks: string[];
}

/**
 * Merge incoming Image Base export into an existing `new-images.json` payload.
 * - Rows in `incoming.profiles` replace the same profileKey or remove it when empty.
 * - Profile keys that only exist on disk are preserved when absent from `incoming`.
 */
export function mergeNewImagesJsonPayload(
  disk: { profiles?: unknown },
  incoming: { exportedAt: string; profiles: NewImagesProfileRow[] },
): {
  exportedAt: string;
  profileCount: number;
  imageLinkCount: number;
  profiles: Array<{ profileKey: string; imageLinks: string[]; imageCount: number }>;
} {
  const byKey = new Map<string, { profileKey: string; imageLinks: string[]; imageCount: number }>();

  for (const p of Array.isArray(disk.profiles) ? disk.profiles : []) {
    if (!p || typeof p !== "object" || typeof (p as { profileKey?: unknown }).profileKey !== "string") {
      continue;
    }
    const row = p as { profileKey: string; imageLinks?: unknown };
    const links = Array.isArray(row.imageLinks)
      ? row.imageLinks.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : [];
    if (links.length === 0) continue;
    byKey.set(row.profileKey, {
      profileKey: row.profileKey,
      imageLinks: links,
      imageCount: links.length,
    });
  }

  for (const p of incoming.profiles) {
    if (!p?.profileKey) continue;
    const links = Array.isArray(p.imageLinks)
      ? p.imageLinks.filter((u) => typeof u === "string" && u.trim().length > 0)
      : [];
    if (links.length === 0) {
      byKey.delete(p.profileKey);
    } else {
      byKey.set(p.profileKey, {
        profileKey: p.profileKey,
        imageLinks: links,
        imageCount: links.length,
      });
    }
  }

  const profiles = [...byKey.values()].sort((a, b) => a.profileKey.localeCompare(b.profileKey));
  const imageLinkCount = profiles.reduce((sum, pr) => sum + pr.imageLinks.length, 0);

  return {
    exportedAt: incoming.exportedAt,
    profileCount: profiles.length,
    imageLinkCount,
    profiles,
  };
}
