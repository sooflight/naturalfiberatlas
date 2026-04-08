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

export function mapNavToGridFilters(nodeId: string | null): {
  category: string;
  fiberSubcategory: GridFiberSubcategory | null;
} {
  if (!nodeId || nodeId === "home") return { category: "all", fiberSubcategory: null };

  if (["fiber", "textile", "dye"].includes(nodeId)) {
    return { category: nodeId, fiberSubcategory: null };
  }

  if (nodeId === "plant") {
    return { category: "fiber", fiberSubcategory: "plant" };
  }

  if (["bast-fiber", "bark-fiber", "seed-fiber", "leaf-fiber", "grass-fiber", "fruit-fiber"].includes(nodeId)) {
    return { category: "fiber", fiberSubcategory: nodeId as GridFiberSubcategory };
  }

  if (nodeId === "animal") {
    return { category: "fiber", fiberSubcategory: "animal" };
  }

  if (["wool-fiber", "silk-fiber", "hair-fiber", "specialty-protein"].includes(nodeId)) {
    return { category: "fiber", fiberSubcategory: nodeId as GridFiberSubcategory };
  }

  if (nodeId === "regen") {
    return { category: "fiber", fiberSubcategory: "regen" };
  }

  if (["woven", "knit", "nonwoven"].includes(nodeId)) {
    return { category: "textile", fiberSubcategory: null };
  }

  if (["natural-dye", "synthetic-dye", "bio-dye"].includes(nodeId)) {
    return { category: "dye", fiberSubcategory: null };
  }

  return { category: "all", fiberSubcategory: null };
}
