import { atlasNavigation } from "./atlas-navigation";
import { atlasNavigation as adminAtlasNavigation } from "./admin/atlas-navigation";
import { fibers } from "./fibers";

export const NAVIGATION_PARENT_CATEGORY = "navigation-parent";
export const NAVIGATION_PARENT_LABEL = "Navigation Nodes";

function collectNavigationNodeIds(nodes: typeof atlasNavigation): string[] {
  const ids: string[] = [];
  const walk = (items: typeof atlasNavigation) => {
    items.forEach((node) => {
      ids.push(node.id);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

const TEXTILE_DYE_IDS = new Set(["textile", "dyes"]);

/** Collect category node IDs from admin tree (nodes with children that aren't fiber profiles). Fiber branch only; textile and dyes excluded for now. */
function collectAdminCategoryNodeIds(
  nodes: typeof adminAtlasNavigation,
  fiberIds: Set<string>,
): string[] {
  const ids: string[] = [];
  const walk = (items: typeof adminAtlasNavigation) => {
    items.forEach((node) => {
      if (TEXTILE_DYE_IDS.has(node.id)) return;
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isFiberProfile = fiberIds.has(node.id);
      if (hasChildren && !isFiberProfile) {
        ids.push(node.id);
      }
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

/** Depth-first order of nav node IDs matching frontend display. Fiber branch only; textile and dyes excluded for now. */
function collectNavigationNodeDisplayOrder(
  nodes: typeof adminAtlasNavigation,
  fiberIds: Set<string>,
): string[] {
  const ids: string[] = [];
  const walk = (items: typeof adminAtlasNavigation) => {
    items.forEach((node) => {
      if (TEXTILE_DYE_IDS.has(node.id)) return;
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isFiberProfile = fiberIds.has(node.id);
      if (hasChildren && !isFiberProfile) {
        ids.push(node.id);
      }
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return ids;
}

const FIBER_IDS = new Set(fibers.map((f) => f.id));
const ADMIN_CATEGORY_IDS = collectAdminCategoryNodeIds(adminAtlasNavigation, FIBER_IDS);

/** Canonical display order for navigation nodes (matches frontend structure). Fiber only. */
const NAV_NODE_DISPLAY_ORDER = [
  ...collectNavigationNodeIds(atlasNavigation),
  ...collectNavigationNodeDisplayOrder(adminAtlasNavigation, FIBER_IDS),
];

const ROOT_NAV_IDS = new Set<string>([
  ...collectNavigationNodeIds(atlasNavigation),
  ...ADMIN_CATEGORY_IDS,
]);

export function isNavigationParentProfileId(id: string): boolean {
  return ROOT_NAV_IDS.has(id);
}

export function classifyProfileCategory(id: string, category: string): string {
  if (isNavigationParentProfileId(id)) return NAVIGATION_PARENT_CATEGORY;
  return category;
}

/** Map category string to color type. Check textile before fiber so "Fiber Textiles" → textile. */
export function getCategoryColorType(category: string): "fiber" | "textile" | "dye" | "navigation-parent" | "default" {
  const key = category?.toLowerCase() ?? "";
  if (key === NAVIGATION_PARENT_CATEGORY) return "navigation-parent";
  if (key.includes("textile")) return "textile";
  if (key.includes("fiber")) return "fiber";
  if (key.includes("dye")) return "dye";
  return "default";
}

/** Tailwind classes for category pill/badge. */
export function getCategoryColorClasses(category: string): string {
  switch (getCategoryColorType(category)) {
    case "textile":
      return "bg-blue-400/10 text-blue-400/60 border-blue-400/15";
    case "fiber":
      return "bg-emerald-400/10 text-emerald-400/60 border-emerald-400/15";
    case "dye":
      return "bg-purple-400/10 text-purple-400/60 border-purple-400/15";
    case "navigation-parent":
      return "bg-amber-400/10 text-amber-400/60 border-amber-400/15";
    default:
      return "bg-white/[0.04] text-white/30 border-white/[0.06]";
  }
}

/** Inline style values for sidebar accent bar and chips. */
export function getCategoryTone(category: string): { accent: string; chipBg: string; chipText: string } {
  switch (getCategoryColorType(category)) {
    case "navigation-parent":
      return { accent: "rgba(251,146,60,0.65)", chipBg: "rgba(251,146,60,0.16)", chipText: "#fdba74" };
    case "textile":
      return { accent: "rgba(59,130,246,0.6)", chipBg: "rgba(59,130,246,0.14)", chipText: "#93c5fd" };
    case "fiber":
      return { accent: "rgba(16,185,129,0.6)", chipBg: "rgba(16,185,129,0.14)", chipText: "#86efac" };
    case "dye":
      return { accent: "rgba(168,85,247,0.6)", chipBg: "rgba(168,85,247,0.14)", chipText: "#d8b4fe" };
    default:
      return { accent: "rgba(148,163,184,0.6)", chipBg: "rgba(148,163,184,0.14)", chipText: "#cbd5e1" };
  }
}

export function sortProfileIdsByCanonicalOrder(
  ids: string[],
  canonicalOrder: string[],
): string[] {
  if (canonicalOrder.length === 0) return [...ids].sort((a, b) => a.localeCompare(b));

  const canonicalIndex = new Map<string, number>();
  canonicalOrder.forEach((id, index) => {
    canonicalIndex.set(id, index);
  });

  const known: Array<{ id: string; index: number }> = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const index = canonicalIndex.get(id);
    if (index === undefined) unknown.push(id);
    else known.push({ id, index });
  }

  known.sort((a, b) => a.index - b.index);
  unknown.sort((a, b) => a.localeCompare(b));
  return [...known.map((item) => item.id), ...unknown];
}

export function partitionByNavigationParent(ids: string[]): {
  regular: string[];
  navigationParents: string[];
} {
  const regular: string[] = [];
  const navigationParents: string[] = [];
  for (const id of ids) {
    if (isNavigationParentProfileId(id)) navigationParents.push(id);
    else regular.push(id);
  }
  return { regular, navigationParents };
}

/** Returns nav node IDs in the order they appear on the frontend (for sidebar display). */
export function getNavigationNodeDisplayOrder(): string[] {
  return [...NAV_NODE_DISPLAY_ORDER];
}
