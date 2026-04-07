export type PreviewFocalPoint = { x: number; y: number };

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

/** Maps stored focal to CSS `object-position` (percentages). */
export function previewFocalToObjectPosition(focal?: PreviewFocalPoint | null): string | undefined {
  if (!focal || !Number.isFinite(focal.x) || !Number.isFinite(focal.y)) return undefined;
  return `${clamp01(focal.x) * 100}% ${clamp01(focal.y) * 100}%`;
}
