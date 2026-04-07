import type { PlateType } from "../data/atlas-data";

/** Single state machine for detail slot CSS (maps to theme.css modifiers). */
export type DetailInhalePhase =
  | "idle"
  | "pre_raster"
  | "revealing"
  | "backdrop_on"
  | "settled";

/**
 * Class suffix for `detail-card-slot` wrappers (leading space for concatenation).
 * Keeps grid-view free of boolean algebra.
 */
export function getDetailSlotClassSuffix(phase: DetailInhalePhase): string {
  switch (phase) {
    case "idle":
      return "";
    case "pre_raster":
      return " render-before-reveal backdrop-deferred";
    case "revealing":
      return " detail-primed backdrop-deferred";
    case "backdrop_on":
      return " detail-primed";
    case "settled":
      return " detail-settled";
    default:
      return "";
  }
}

export function computeDetailGridRenderPlan(
  filteredLength: number,
  plateAssignments: Map<number, PlateType>,
  isDetailMode: boolean,
): { renderCellCount: number; indices: number[] } {
  const maxAssignedIndex = plateAssignments.size > 0 ? Math.max(...plateAssignments.keys()) : -1;
  const renderCellCount =
    isDetailMode && maxAssignedIndex >= 0
      ? Math.max(filteredLength, maxAssignedIndex + 1)
      : filteredLength;
  const indices = Array.from({ length: renderCellCount }, (_, i) => i);
  return { renderCellCount, indices };
}
