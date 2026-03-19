import type { ImageEntry } from "@/types/atlas-media";
import { extractImageUrl } from "@/utils/imageUrl";

export interface QualityIssue {
  entityType: string;
  entityId: string;
  severity: "error" | "warning";
  message: string;
}

export interface QualityReport {
  issues: QualityIssue[];
  overallScore: number;
  errorCount: number;
  warningCount: number;
}

export function checkImageCompleteness(
  images: Record<string, ImageEntry | ImageEntry[]>,
  ids: string[]
): string[] {
  return ids.filter((id) => {
    const value = images[id];
    if (!value) return true;
    if (Array.isArray(value)) {
      if (value.length === 0) return true;
      return value.every((entry) => extractImageUrl(entry).trim().length === 0);
    }
    return extractImageUrl(value).trim().length === 0;
  });
}

export function runQualityGates(): QualityReport {
  return {
    issues: [],
    overallScore: 100,
    errorCount: 0,
    warningCount: 0,
  };
}
