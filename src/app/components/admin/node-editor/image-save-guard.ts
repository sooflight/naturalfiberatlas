type ImageLike = string | { url?: unknown; [key: string]: unknown };

function toImageArray(value: unknown): ImageLike[] {
  if (Array.isArray(value)) return value as ImageLike[];
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return [value as ImageLike];
  return [];
}

function extractUrl(entry: ImageLike): string | null {
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (!entry || typeof entry !== "object") return null;
  const raw = entry.url;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Prevent accidental gallery truncation when a save payload only includes
 * newly added image(s). Existing images are preserved and incoming entries
 * are appended when they introduce new URLs.
 */
export function mergePreservingExistingImages(
  existingValue: unknown,
  incomingValue: unknown,
): ImageLike[] {
  const existing = toImageArray(existingValue);
  const incoming = toImageArray(incomingValue);

  if (existing.length === 0) return incoming;
  if (incoming.length === 0) return [];

  const merged: ImageLike[] = [...existing];
  const seenUrls = new Set(
    existing
      .map((entry) => extractUrl(entry))
      .filter((url): url is string => !!url),
  );

  for (const entry of incoming) {
    const url = extractUrl(entry);
    if (!url) continue;
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    merged.push(entry);
  }

  return merged;
}
