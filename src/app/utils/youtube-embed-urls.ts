import type { FiberProfile } from "../data/fibers";
import { youtubeVideoIdFromUrl } from "./youtube-embed";

export type YoutubeEmbedCarrier = Pick<FiberProfile, "youtubeEmbedUrl" | "youtubeEmbedUrls">;

/**
 * Raw rows for editors — preserves order, may include empty strings while adding a row.
 * Prefer `youtubeEmbedUrls` when set (including []); else legacy single URL.
 */
export function getYoutubeEmbedUrlRowsForEdit(fiber: YoutubeEmbedCarrier): string[] {
  if (fiber.youtubeEmbedUrls !== undefined) {
    return fiber.youtubeEmbedUrls.slice();
  }
  const legacy = fiber.youtubeEmbedUrl?.trim();
  return legacy ? [legacy] : [];
}

/** Trimmed, de-duplicated URLs (no empties). */
export function getCommittedYoutubeEmbedUrls(fiber: YoutubeEmbedCarrier): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of getYoutubeEmbedUrlRowsForEdit(fiber)) {
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function getValidYoutubeEmbedEntries(fiber: YoutubeEmbedCarrier): Array<{
  url: string;
  videoId: string;
  watchUrl: string;
}> {
  const entries: Array<{ url: string; videoId: string; watchUrl: string }> = [];
  const seenIds = new Set<string>();
  for (const url of getCommittedYoutubeEmbedUrls(fiber)) {
    const videoId = youtubeVideoIdFromUrl(url);
    if (!videoId || seenIds.has(videoId)) continue;
    seenIds.add(videoId);
    entries.push({
      url,
      videoId,
      watchUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
    });
  }
  return entries;
}

export function hasAnyValidYoutubeEmbed(fiber: YoutubeEmbedCarrier): boolean {
  return getValidYoutubeEmbedEntries(fiber).length > 0;
}
