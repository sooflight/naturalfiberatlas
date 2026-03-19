import type { GalleryImageEntry } from "../data/atlas-data";

export interface RelatedImageCandidate {
  index: number;
  score: number;
}

function imageArea(image: GalleryImageEntry): number {
  if (typeof image.width !== "number" || typeof image.height !== "number") return 0;
  return Math.max(0, image.width) * Math.max(0, image.height);
}

function metadataScore(image: GalleryImageEntry): number {
  let score = 0;
  if (image.title?.trim()) score += 8;
  if (image.attribution?.trim()) score += 5;
  if (image.provider?.trim()) score += 3;
  if (image.rights?.trim()) score += 2;
  if (image.licenseUrl?.trim()) score += 2;
  return score;
}

function computeHeroScore(image: GalleryImageEntry): number {
  // Area dominates; metadata acts as tie-breaker for similarly sized images.
  return imageArea(image) + metadataScore(image);
}

export function rankHeroImage(images: GalleryImageEntry[]): number {
  if (images.length === 0) return -1;

  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!image) continue;

    const score = computeHeroScore(image);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function relatedSimilarityScore(image: GalleryImageEntry, hero: GalleryImageEntry): number {
  let score = 0;

  const heroTags = new Set((hero.tags ?? []).map((tag) => tag.toLowerCase()));
  const imageTags = (image.tags ?? []).map((tag) => tag.toLowerCase());
  const sharedTags = imageTags.filter((tag) => heroTags.has(tag)).length;
  score += sharedTags * 10;

  if (hero.provider?.trim() && image.provider?.trim() === hero.provider.trim()) score += 4;
  if (hero.attribution?.trim() && image.attribution?.trim() === hero.attribution.trim()) score += 2;

  const heroArea = imageArea(hero);
  const areaGap = Math.abs(imageArea(image) - heroArea);
  const areaSimilarity = heroArea > 0 ? 1 / (1 + areaGap / heroArea) : 0;

  return score + areaSimilarity;
}

export function buildRelatedImageCandidates(
  images: GalleryImageEntry[],
  heroIndex: number,
  limit = 6,
): RelatedImageCandidate[] {
  if (images.length <= 1 || limit <= 0) return [];

  const safeHeroIndex = Math.max(0, Math.min(heroIndex, images.length - 1));
  const hero = images[safeHeroIndex];
  if (!hero) return [];

  const candidates: RelatedImageCandidate[] = [];

  for (let index = 0; index < images.length; index += 1) {
    if (index === safeHeroIndex) continue;
    const image = images[index];
    if (!image) continue;

    candidates.push({
      index,
      score: relatedSimilarityScore(image, hero),
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  const cappedLimit = images.length <= 3 ? 1 : limit;
  return candidates.slice(0, cappedLimit);
}
