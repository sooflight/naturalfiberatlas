/**
 * Node draft profiles — hidden draft profiles for every node in the multi-layer
 * navigation system. Used by Admin to edit thumbnail images for navigation nodes.
 *
 * These profiles are "hidden" in that they are not shown as public profile pages;
 * they exist solely for Admin thumbnail editing in the Image Base.
 */

import type { NavNode } from "./atlas-navigation";
import { getCategoryForNavNode } from "./atlas-navigation";
import type { FiberProfile } from "@/types/fiber-profile";

const LEGACY_TO_CANONICAL_FIBER_ID: Record<string, string> = {
  "coir-coconut": "coir",
  "lyocell-tencel": "lyocell",
  "pineapple-pina": "pineapple",
  cotton: "organic-cotton",
};

export interface NodeDraftProfile {
  id: string;
  name: string;
  label: string;
  category: string;
  image: string;
  galleryImages: Array<{ url: string }>;
  /** True if this node has a full fiber profile; false for category-only nodes */
  isFiberProfile: boolean;
}

function getFiberImageUrls(fiber: { image?: string; galleryImages?: Array<{ url?: string }> }): string[] {
  const urls: string[] = [];
  if (fiber.image?.trim()) urls.push(fiber.image.trim());
  (fiber.galleryImages ?? []).forEach((g) => {
    const u = g?.url?.trim();
    if (u && !urls.includes(u)) urls.push(u);
  });
  return urls;
}

/**
 * Flatten the navigation tree into a list of { id, label } for every node.
 */
export function flattenNavigationNodes(nodes: NavNode[]): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  const walk = (items: NavNode[]) => {
    items.forEach((node) => {
      result.push({ id: node.id, label: node.label });
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return result;
}

/**
 * Build hidden draft profiles for every node in the navigation tree.
 * - For nodes that have a fiber profile: use fiber image/galleryImages.
 * - For nodes without a fiber profile: use navParentImageOverrides (Admin-edited thumbnails).
 * - Category nodes (e.g. plant-cellulose, bast-fibers) are always non-fiber and use overrides.
 */
export function buildNodeDraftProfiles(
  navNodes: NavNode[],
  fibers: FiberProfile[],
  navParentImageOverrides: Record<string, string[]>,
): NodeDraftProfile[] {
  const fiberById = new Map(fibers.map((f) => [f.id, f]));
  const flatNodes = flattenNavigationNodes(navNodes);

  return flatNodes.map(({ id, label }) => {
    const canonicalId = LEGACY_TO_CANONICAL_FIBER_ID[id] ?? id;
    const fiber = fiberById.get(id) ?? fiberById.get(canonicalId);
    const isFiberProfile = !!fiber;

    if (fiber) {
      const urls = getFiberImageUrls(fiber);
      return {
        id,
        name: fiber.name,
        label,
        category: fiber.category ?? "fiber",
        image: urls[0] ?? "",
        galleryImages: urls.map((url) => ({ url })),
        isFiberProfile: true,
      };
    }

    const navImages = navParentImageOverrides[id] ?? [];
    const category = getCategoryForNavNode(navNodes, id);
    return {
      id,
      name: label,
      label,
      category,
      image: navImages[0] ?? "",
      galleryImages: navImages.map((url) => ({ url })),
      isFiberProfile: false,
    };
  });
}
