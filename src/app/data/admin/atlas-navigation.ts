import type { AtlasNode } from "../../types/atlas-domain";

export type NavNode = AtlasNode;

// Optional text overrides passed to helper functions
interface NodeOpts {
  shortLabel?: string;
  description?: string;
}

// Helper to create nodes concisely
function n(id: string, label: string, optsOrChildren?: NavNode[] | NodeOpts, children?: NavNode[]): NavNode {
  if (Array.isArray(optsOrChildren)) {
    return { id, label, children: optsOrChildren };
  }
  if (optsOrChildren) {
    return { id, label, ...optsOrChildren, ...(children ? { children } : {}) };
  }
  return { id, label };
}

function ni(id: string, label: string, iconName: string, optsOrChildren?: NavNode[] | NodeOpts, children?: NavNode[]): NavNode {
  if (Array.isArray(optsOrChildren)) {
    return { id, label, iconName, children: optsOrChildren };
  }
  if (optsOrChildren) {
    return { id, label, iconName, ...optsOrChildren, ...(children ? { children } : {}) };
  }
  return { id, label, iconName };
}

export const atlasNavigation: NavNode[] = [

  // ══════════════════════════════════════════════
  // 01 — FIBER
  // ══════════════════════════════════════════════
  ni("fiber", "Fiber", "leaf", { shortLabel: "Fiber", description: "The complete taxonomy of natural fibers — plant cellulose, animal protein, and regenerated." }, [

    n("plant-cellulose", "Plant", { shortLabel: "Plant", description: "Plant-based cellulose fibers — bast, seed, leaf, grass, and fruit." }, [

      n("bast-fibers", "Bast Fiber", { description: "Strong fibers from the inner bark of plants." }, [
        n("hemp", "Hemp"),
        n("flax-linen", "Flax Linen"),
        n("jute", "Jute"),
        n("ramie", "Ramie"),
        n("nettle", "Nettle"),
        n("kenaf", "Kenaf"),
        n("roselle", "Roselle (Hibiscus Fiber)"),
      ]),

      n("bark-fibers", "Bark Fiber", { description: "Fibers and strips sourced from outer bark layers." }, [
        n("paper-mulberry", "Paper Mulberry"),
      ]),

      n("seed-fibers", "Seed Fiber", { description: "Fibers that grow as part of plant seeds." }, [
        n("cotton", "Cotton", [
          n("pima", "Pima"),
          n("upland", "Upland"),
          n("sea-island", "Sea Island"),
          n("organic-cotton", "Organic Cotton"),
          n("regenerative-cotton", "Regenerative Cotton"),
        ]),
        n("kapok", "Kapok"),
        n("milkweed", "Milkweed"),
      ]),

      n("leaf-fibers", "Leaf Fiber", { description: "Fibers extracted from the leaves of tropical plants." }, [
        n("sisal", "Sisal"),
        n("abaca", "Abaca"),
        n("henequen", "Henequen"),
        n("pineapple-pina", "Pineapple / Piña"),
      ]),

      n("grass-fibers", "Grass Fiber", [
        n("bamboo", "Bamboo"),
        n("esparto", "Esparto"),
        n("igusa", "Igusa"),
      ]),

      n("fruit-fibers", "Fruit Fiber", [
        n("coir-coconut", "Coir (Coconut)"),
        n("banana", "Banana"),
      ]),
    ]),

    n("animal-protein", "Animal", { shortLabel: "Animal", description: "Animal-derived protein fibers — wool, hair, and silk." }, [
      n("wool-fiber", "Wool", { description: "Wool-bearing animal fibers and breeds." }, [
        n("sheep-wool", "Sheep Wool", { description: "The world's most widely used animal fiber, with diversity across breeds." }, [
          n("merino", "Merino"),
          n("rambouillet", "Rambouillet"),
          n("columbia", "Columbia"),
          n("corriedale", "Corriedale"),
          n("romney", "Romney"),
          n("lincoln", "Lincoln"),
          n("navajo-churro", "Navajo-Churro"),
        ]),
        n("alpaca", "Alpaca", [
          n("huacaya", "Huacaya"),
          n("suri", "Suri"),
        ]),
      ]),

      n("hair-fiber", "Hair", { description: "Animal hair fibers used in textiles." }, [
        n("mohair", "Mohair"),
        n("cashmere", "Cashmere"),
        n("llama", "Llama"),
        n("camel", "Camel"),
        n("yak", "Yak"),
        n("bison", "Bison"),
        n("qiviut", "Qiviut"),
        n("horsehair", "Horsehair"),
      ]),

      n("silk-fiber", "Silk", { description: "Silk fibers and silkworm-derived variants." }, [
        n("silk", "Silk", { description: "The only natural continuous-filament fiber, produced by silkworms." }, [
          n("tussar", "Tussah"),
          n("peace-silk", "Peace Silk"),
        ]),
      ]),

    ]),

    n("mineral-regenerated", "Regenerated", { shortLabel: "Rayon", description: "Regenerated cellulosic fibers made from natural sources through chemical processing." }, [
      n("lyocell-tencel", "Lyocell / Tencel"),
      n("modal", "Modal"),
      n("viscose-rayon", "Viscose / Rayon"),
      n("cupro", "Cupro"),
      n("bamboo-viscose", "Bamboo Viscose"),
    ]),
  ]),

  // ══════════════════════════════════════════════
  // 02 — TEXTILE
  // ══════════════════════════════════════════════
  ni("textile", "Textile", "layers", { shortLabel: "Textile", description: "Fabric profiles — yarn, woven, knit, nonwoven, lace, and finishing." }, [

    n("yarn", "Yarn", { description: "Yarn-making processes and structures — spinning, plying, weight, twist, and texture." }, [
      n("spinning", "Spinning"),
      n("plying", "Plying"),
      n("yarn-weight", "Yarn Weight"),
      n("twist", "Twist / TPI"),
      n("texture-yarn", "Textured Yarn"),
    ]),

    n("woven", "Woven", { description: "Fabrics created by interlacing warp and weft yarns." }, [
      n("plain-weave", "Plain Weave"),
      n("twill", "Twill"),
      n("satin", "Satin"),
      n("complex-weave", "Complex Weaves", { description: "Multi-shaft weaves — jacquard, dobby, tapestry, brocade, damask." }, [
        n("dobby", "Dobby"),
        n("jacquard", "Jacquard"),
        n("tapestry", "Tapestry"),
      ]),
      n("specialty-weave", "Specialty Weaves", { description: "Gauze, leno, double cloth, pile, basket, and crepe weave structures." }, [
        n("denim", "Denim"),
        n("canvas-fabric", "Canvas"),
        n("flannel", "Flannel"),
        n("gabardine", "Gabardine"),
        n("muslin", "Muslin"),
        n("broadcloth", "Broadcloth"),
      ]),
    ]),

    n("knit", "Knit", { description: "Fabrics formed by interlocking loops of yarn." }, [
      n("stockinette", "Stockinette / Jersey"),
      n("ribbing", "Ribbing / Rib Knit"),
      n("cable-knit", "Cable Knit"),
      n("lace-knit", "Lace Knitting"),
      n("colorwork-knit", "Colorwork / Stranded"),
      n("interlock", "Interlock"),
      n("double-knit", "Double Knit"),
    ]),

    n("nonwoven", "Nonwoven", { description: "Fabrics bonded without weaving or knitting." }, [
      n("felt", "Felt / Felting"),
      n("spunbond", "Spunbond / Meltblown"),
      n("airlaid", "Airlaid"),
      n("tufted", "Tufted"),
      n("braided", "Braided / Plaited"),
    ]),

    n("lace", "Lace", { description: "Open-work fabrics made by looping, twisting, or knitting threads." }, [
      n("bobbin-lace", "Bobbin Lace"),
      n("needle-lace", "Needle Lace"),
      n("crochet", "Crochet"),
    ]),

    n("finishing", "Finishing", { description: "Processes that transform raw fabric into finished textile — dyeing, printing, chemical and mechanical treatments." }, [
      n("mercerization", "Mercerization"),
      n("dyeing", "Dyeing"),
      n("printing", "Textile Printing"),
      n("finishing-chemical", "Chemical Finishing"),
      n("finishing-mechanical", "Mechanical Finishing"),
    ]),
  ]),

  // ══════════════════════════════════════════════
  // 03 — DYES
  // ══════════════════════════════════════════════
  ni("dyes", "Dyes", "palette", { shortLabel: "Dye", description: "Natural colorants — plant, animal, and mineral dye profiles." }, [

    n("plant-based-dyes", "Plant Dyes", { shortLabel: "Plant", description: "Colorants derived from roots, wood, bark, leaves, flowers, fruits, and fungi." }, [

      n("dye-roots", "Roots", [
        n("madder", "Madder"),
        n("bloodroot", "Bloodroot"),
        n("yellow-dock", "Yellow Dock"),
        n("turmeric", "Turmeric"),
      ]),

      n("dye-wood", "Wood", [
        n("logwood", "Logwood"),
        n("brazilwood", "Brazilwood"),
        n("osage-orange", "Osage Orange"),
        n("fustic", "Fustic"),
      ]),

      n("dye-bark", "Bark", [
        n("black-walnut", "Black Walnut"),
        n("oak-bark", "Oak"),
        n("alder", "Alder"),
      ]),

      n("dye-leaves", "Leaves", [
        n("indigo", "Indigo", [
          n("japanese-indigo", "Japanese Indigo"),
          n("true-indigo", "True Indigo"),
          n("woad", "Woad"),
        ]),
        n("weld", "Weld"),
        n("tea-dye", "Tea"),
      ]),

      n("dye-flowers", "Flowers", [
        n("coreopsis", "Coreopsis"),
        n("marigold", "Marigold"),
        n("dahlia", "Dahlia"),
        n("safflower", "Safflower"),
      ]),

      n("dye-fruits-berries", "Fruits & Berries", [
        n("elderberry", "Elderberry"),
        n("blackberry", "Blackberry"),
        n("pomegranate", "Pomegranate"),
        n("avocado-dye", "Avocado"),
      ]),

      n("lichens-fungi", "Lichens & Fungi", [
        n("usnea", "Usnea"),
        n("mushroom-dyes", "Mushroom Dyes"),
      ]),
    ]),

    n("animal-based-dyes", "Animal Dyes", { shortLabel: "Animal", description: "Colorants sourced from insects and mollusks." }, [
      n("cochineal", "Cochineal"),
      n("lac", "Lac"),
      n("mollusk-purple", "Mollusk Purple"),
    ]),

    n("mineral-based-dyes", "Mineral Dyes", { shortLabel: "Mineral", description: "Earth pigments and mineral-based colorants." }, [
      n("ochre", "Ochre"),
      n("iron-oxide", "Iron Oxide"),
      n("clay-pigments", "Clay Pigments"),
    ]),
  ]),

];

// Utility: find a node by id, return path of ids
export function findNodePath(nodes: NavNode[], targetId: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    const currentPath = [...path, node.id];
    if (node.id === targetId) return currentPath;
    if (node.children) {
      const found = findNodePath(node.children, targetId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

// Utility: find a node by id
export function findNode(nodes: NavNode[], targetId: string): NavNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNode(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

// Utility: get all ancestor ids for a given node id
export function getAncestorIds(nodes: NavNode[], targetId: string): Set<string> {
  const path = findNodePath(nodes, targetId);
  if (!path) return new Set();
  return new Set(path.slice(0, -1));
}

// Icon mapping for top-level items
export const iconMap: Record<string, string> = {
  fiber: "leaf",
  textile: "layers",
  dyes: "palette",
};

export function getParentLabel(
  tree: NavNode[],
  nodeId: string
): string | undefined {
  const path = findNodePath(tree, nodeId);
  if (!path || path.length < 2) return undefined;
  const parentId = path[path.length - 2];
  return findNode(tree, parentId)?.label;
}

/** Derive category from nav tree: nodes under "textile" → textile, under "dyes" → dye, else fiber */
export function getCategoryForNavNode(navTree: NavNode[], nodeId: string): string {
  const path = findNodePath(navTree, nodeId);
  const rootId = path?.[0];
  if (rootId === "textile") return "textile";
  if (rootId === "dyes") return "dye";
  return "fiber";
}
