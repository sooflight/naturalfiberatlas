import { dataSource } from "../../data/data-provider";
import {
  atlasNavigation as runtimeAtlasNavigation,
  type NavNode as RuntimeNavNode,
  getCategoryForNavNode,
} from "../../data/admin/atlas-navigation";
import { classifyProfileCategory } from "../../data/profile-sequencing";
import { resolveCanonicalFiberId } from "../../data/fiber-id-redirects";

type KnowledgeFiber = { id: string; name: string; category: string; image?: string };

function flattenRuntimeNavigationNodes(nodes: RuntimeNavNode[]): Array<{ id: string; label: string }> {
  const flat: Array<{ id: string; label: string }> = [];
  const walk = (items: RuntimeNavNode[]) => {
    items.forEach((node) => {
      flat.push({ id: node.id, label: node.label });
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return flat;
}

export function buildKnowledgeFibers(
  fiberIndex: KnowledgeFiber[],
  contentItems: Array<{
    id: string;
    nodeData?: { category?: unknown } | null;
    passport?: { category?: unknown } | null;
    images?: Array<string | { url?: string }>;
  }>,
  navigationNodes: RuntimeNavNode[] = runtimeAtlasNavigation,
  getImageForId?: (id: string) => string | undefined,
): KnowledgeFiber[] {
  const byId = new Map(fiberIndex.map((fiber) => [fiber.id, fiber]));
  const contentById = new Map(contentItems.map((item) => [item.id, item]));
  const canonicalIds = fiberIndex.map((fiber) => fiber.id);
  const navNodeEntries = flattenRuntimeNavigationNodes(navigationNodes);
  const navLabelById = new Map(navNodeEntries.map((entry) => [entry.id, entry.label]));

  const contentOnlyIds: string[] = [];
  const seen = new Set<string>();
  for (const item of contentItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (!byId.has(item.id)) contentOnlyIds.push(item.id);
  }

  const navOnlyIds: string[] = [];
  navNodeEntries.forEach(({ id }) => {
    if (seen.has(id) || byId.has(id)) return;
    seen.add(id);
    navOnlyIds.push(id);
  });

  const mergedRaw = [...canonicalIds, ...contentOnlyIds, ...navOnlyIds].filter(
    (id) => !dataSource.isFiberDeleted(id),
  );
  /* One sidebar row per catalog profile: legacy ids (e.g. tussah → tussar) must not duplicate Live. */
  const seenCanonical = new Set<string>();
  const orderedIds: string[] = [];
  for (const id of mergedRaw) {
    const canon = resolveCanonicalFiberId(id);
    if (seenCanonical.has(canon)) continue;
    seenCanonical.add(canon);
    orderedIds.push(canon);
  }
  return orderedIds.map((id) => {
    const match = byId.get(id);
    if (match) {
      return {
        ...match,
        category: classifyProfileCategory(match.id, match.category),
      };
    }
    const navLabel = navLabelById.get(id);
    if (navLabel) {
      const image =
        getImageForId?.(id) ??
        (() => {
          const item = contentById.get(id);
          const imgs = item?.images;
          if (!imgs?.length) return undefined;
          const first = imgs[0];
          return typeof first === "string" ? first : first?.url;
        })();
      const category = getCategoryForNavNode(navigationNodes, id);
      return {
        id,
        name: navLabel,
        category: classifyProfileCategory(id, category),
        image,
      };
    }
    const contentItem = contentById.get(id);
    const fallbackCategory = (() => {
      const nodeCategory = contentItem?.nodeData?.category;
      if (typeof nodeCategory === "string" && nodeCategory.trim().length > 0) return nodeCategory;
      const passportCategory = contentItem?.passport?.category;
      if (typeof passportCategory === "string" && passportCategory.trim().length > 0) return passportCategory;
      return "fiber";
    })();
    const image =
      getImageForId?.(id) ??
      (() => {
        const imgs = contentItem?.images;
        if (!imgs?.length) return undefined;
        const first = imgs[0];
        return typeof first === "string" ? first : first?.url;
      })();
    return {
      id,
      name: id,
      category: classifyProfileCategory(id, fallbackCategory),
      image,
    };
  });
}
