import { adminIdToFrontend } from "./navigation-id-registry";

export type GridFiberSubcategory =
  | "plant"
  | "animal"
  | "regen"
  | "bast-fiber"
  | "bark-fiber"
  | "seed-fiber"
  | "leaf-fiber"
  | "grass-fiber"
  | "fruit-fiber"
  | "wool-fiber"
  | "silk-fiber"
  | "hair-fiber"
  | "specialty-protein";

const PLANT_SUBCATEGORIES: ReadonlySet<string> = new Set([
  "bast-fiber", "bark-fiber", "seed-fiber", "leaf-fiber", "grass-fiber", "fruit-fiber",
]);

const ANIMAL_SUBCATEGORIES: ReadonlySet<string> = new Set([
  "wool-fiber", "silk-fiber", "hair-fiber", "specialty-protein",
]);

const TOP_LEVEL_CATEGORIES: ReadonlySet<string> = new Set([
  "fiber", "textile", "dye",
]);

/**
 * Maps a navigation node ID to the grid filter parameters it implies.
 * Accepts both frontend IDs ("bast-fiber") and admin IDs ("bast-fibers") —
 * admin IDs are translated via the registry before matching.
 */
export function mapNavToGridFilters(nodeId: string | null): {
  category: string;
  fiberSubcategory: GridFiberSubcategory | null;
} {
  if (!nodeId || nodeId === "home") return { category: "all", fiberSubcategory: null };

  const resolved = adminIdToFrontend(nodeId);

  if (TOP_LEVEL_CATEGORIES.has(resolved)) {
    return { category: resolved, fiberSubcategory: null };
  }

  if (resolved === "plant" || PLANT_SUBCATEGORIES.has(resolved)) {
    return { category: "fiber", fiberSubcategory: resolved as GridFiberSubcategory };
  }

  if (resolved === "animal" || ANIMAL_SUBCATEGORIES.has(resolved)) {
    return { category: "fiber", fiberSubcategory: resolved as GridFiberSubcategory };
  }

  if (resolved === "regen") {
    return { category: "fiber", fiberSubcategory: "regen" };
  }

  if (["natural-dye", "synthetic-dye", "bio-dye"].includes(resolved)) {
    return { category: "dye", fiberSubcategory: null };
  }

  return { category: "all", fiberSubcategory: null };
}
