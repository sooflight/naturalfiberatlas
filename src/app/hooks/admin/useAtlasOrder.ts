import { useState, useCallback, useEffect, startTransition } from "react";
import {
  atlasNavigation,
  findNode,
  getParentLabel,
  type NavNode,
} from "../data/atlas-navigation";
import { adminRoute, authenticatedFetch } from "@/utils/adminRoutes";
import type { IndexSection, IndexItem } from "../types/index-surface";

// ── Types ─────────────────────────────────────────────────

export interface AtlasOrderData {
  sectionOrder: string[];
  cardOrder: Record<string, string[]>;
}

const DEFAULT_SECTION_ORDER = atlasNavigation.map((s) => s.id);

// ── Collect leaf node IDs in tree order (depth-first) ─────
function collectLeafIds(nodes: NavNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      ids.push(node.id);
    } else {
      ids.push(...collectLeafIds(node.children));
    }
  }
  return ids;
}

// ── Default card order per section (from static nav) ────────
function getDefaultCardOrder(): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const section of atlasNavigation) {
    const ids = collectLeafIds(section.children || []);
    order[section.id] = ids;
  }
  return order;
}

const DEFAULT_CARD_ORDER = getDefaultCardOrder();

// ── Merge overrides with defaults ─────────────────────────
function mergeOrder(
  overrides: AtlasOrderData | null
): { sectionOrder: string[]; cardOrder: Record<string, string[]> } {
  const sectionOrder =
    overrides?.sectionOrder && overrides.sectionOrder.length > 0
      ? overrides.sectionOrder.filter((id) =>
          atlasNavigation.some((s) => s.id === id)
        )
      : DEFAULT_SECTION_ORDER;

  // Ensure we have all sections (append any missing)
  const orderedSet = new Set(sectionOrder);
  const mergedSectionOrder = [
    ...sectionOrder,
    ...atlasNavigation
      .map((s) => s.id)
      .filter((id) => !orderedSet.has(id)),
  ];

  const cardOrder: Record<string, string[]> = {};
  for (const section of atlasNavigation) {
    const defaultIds = DEFAULT_CARD_ORDER[section.id] || [];
    const overrideIds = overrides?.cardOrder?.[section.id];
    if (overrideIds && overrideIds.length > 0) {
      // Merge: use override order, append any new nodes from default not in override
      const overrideSet = new Set(overrideIds);
      const extra = defaultIds.filter((id) => !overrideSet.has(id));
      cardOrder[section.id] = [...overrideIds, ...extra];
    } else {
      cardOrder[section.id] = defaultIds;
    }
  }
  return {
    sectionOrder: mergedSectionOrder,
    cardOrder,
  };
}

const SECTION_META: Record<string, string> = {
  fiber: "Fibers",
  textile: "Textiles",
  dyes: "Dyes",
};

export function buildSectionsFromOrder(
  sectionOrder: string[],
  cardOrder: Record<string, string[]>
): IndexSection[] {
  const sections: IndexSection[] = [];
  for (const sectionId of sectionOrder) {
    const section = atlasNavigation.find((s) => s.id === sectionId);
    if (!section) continue;
    const nodeIds = cardOrder[sectionId] || [];
    const items: IndexItem[] = [];
    for (const nodeId of nodeIds) {
      const node = findNode(atlasNavigation, nodeId);
      if (!node) continue;
      const parentLabel = getParentLabel(atlasNavigation, nodeId);
      items.push({
        node,
        sectionId,
        parentLabel: parentLabel ?? "",
        depth: 1,
      });
    }
    sections.push({
      sectionId,
      label: SECTION_META[sectionId] ?? section.label ?? sectionId,
      items,
    });
  }
  return sections;
}

// ── Hook ──────────────────────────────────────────────────

export function useAtlasOrder() {
  const [overrides, setOverrides] = useState<AtlasOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authenticatedFetch(adminRoute("/__admin/read-atlas-order"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setOverrides(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { sectionOrder, cardOrder } = mergeOrder(overrides ?? null);

  const saveOrder = useCallback(async (next: AtlasOrderData) => {
    const res = await authenticatedFetch(adminRoute("/__admin/save-atlas-order"), {
      method: "POST",
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error("Failed to save order");
    
    // Defer state update to avoid React Suspense sync-input warnings
    startTransition(() => {
      setOverrides(next);
    });
  }, []);

  const reorderCards = useCallback(
    (sectionId: string, fromIndex: number, toIndex: number) => {
      const ids = [...(cardOrder[sectionId] || [])];
      const [removed] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, removed);
      const next: AtlasOrderData = {
        sectionOrder,
        cardOrder: { ...cardOrder, [sectionId]: ids },
      };
      saveOrder(next);
    },
    [sectionOrder, cardOrder, saveOrder]
  );

  const reorderSections = useCallback(
    (fromIndex: number, toIndex: number) => {
      const ids = [...sectionOrder];
      const [removed] = ids.splice(fromIndex, 1);
      ids.splice(toIndex, 0, removed);
      saveOrder({ sectionOrder: ids, cardOrder });
    },
    [sectionOrder, cardOrder, saveOrder]
  );

  return {
    sectionOrder,
    cardOrder,
    loading,
    reorderCards,
    reorderSections,
    saveOrder,
  };
}
