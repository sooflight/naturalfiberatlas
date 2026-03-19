export interface NavNode {
  id: string;
  label: string;
  shortLabel?: string;
  children?: NavNode[];
}

const n = (id: string, label: string, children?: NavNode[], shortLabel?: string): NavNode => ({
  id,
  label,
  shortLabel,
  children,
});

export const atlasNavigation: NavNode[] = [
  n("plant", "Plant", [
    n("bast-fiber", "Bast Fiber", undefined, "Bast"),
    n("bark-fiber", "Bark Fiber", undefined, "Bark"),
    n("seed-fiber", "Seed Fiber", undefined, "Seed"),
    n("leaf-fiber", "Leaf Fiber", undefined, "Leaf"),
    n("grass-fiber", "Grass Fiber", undefined, "Grass"),
    n("fruit-fiber", "Fruit Fiber", undefined, "Fruit"),
  ]),
  n("animal", "Animal", [
    n("wool-fiber", "Wool"),
    n("silk-fiber", "Silk"),
    n("hair-fiber", "Hair"),
  ]),
  n("regen", "Regen"),
];

export const archivedNavigation: NavNode[] = [
  n("textile", "Textile", [
    n("woven", "Woven"),
    n("knit", "Knit"),
    n("nonwoven", "Nonwoven"),
  ]),
  n("dye", "Dye", [
    n("natural-dye", "Natural"),
    n("synthetic-dye", "Synthetic"),
    n("bio-dye", "Bio"),
  ]),
];

export function findNode(nodes: NavNode[], targetId: string): NavNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children?.length) {
      const found = findNode(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findNodePath(nodes: NavNode[], targetId: string): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [node.id];
    if (node.children?.length) {
      const childPath = findNodePath(node.children, targetId);
      if (childPath) return [node.id, ...childPath];
    }
  }
  return null;
}
