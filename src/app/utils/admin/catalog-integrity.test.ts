import { describe, it, expect } from "vitest";
import atlasOrderFile from "../../data/admin/atlas-order.json";
import { atlasNavigation } from "../../data/admin/atlas-navigation";
import { fibers } from "../../data/fibers";
import fiberOrderFile from "../../data/fiber-order.json";
import { fiberOrderIdsCollidingByRedirect } from "../../data/fiber-id-redirects";
import type { NavNode } from "../../types/atlas-domain";

function collectNavIds(nodes: NavNode[], into: Set<string>) {
  for (const n of nodes) {
    into.add(n.id);
    if (n.children?.length) collectNavIds(n.children, into);
  }
}

/**
 * `fiber-order.json` `global` drives mixed navigation (fibers, textile cards, dye topics, stubs).
 * Valid ids are those that exist in bundled profiles, atlas card order, the nav tree, or the
 * explicit allowlist below (atlas editorial keys not yet wired into those sources).
 */
const ORDER_ALLOWLIST = new Set([
  "Imagery",
  "alum",
  "baobab",
  "comparisons",
  "copper",
  "dye",
  "dye-gardens",
  "fabric",
  "industrial-looms",
  "iron-modifier",
  "lac-dye-lake",
  "looming",
  "looms",
  "mills",
  "myrobalan",
  "natural-dyes",
  "plant-fiber",
  "regenerated",
  "rugs",
  "specialty-yarns",
  "spinning-systems",
  "tilfi",
  "tyrian-purple",
  "weave-structures",
  "weaving-process",
]);

describe("catalog integrity (Tier A)", () => {
  it("fiber-order.json global lists only known atlas / navigation ids", () => {
    const fiberIds = new Set(fibers.map((f) => f.id));
    const cardIds = new Set<string>();
    const cardOrder = atlasOrderFile.cardOrder as Record<string, string[]> | undefined;
    if (cardOrder) {
      for (const ids of Object.values(cardOrder)) {
        for (const id of ids) cardIds.add(id);
      }
    }
    const navIds = new Set<string>();
    collectNavIds(atlasNavigation, navIds);

    const allowed = new Set([...fiberIds, ...cardIds, ...navIds, ...ORDER_ALLOWLIST]);

    const fo = fiberOrderFile as { global?: string[] };
    for (const id of fo.global ?? []) {
      expect(allowed.has(id), `fiber-order.json unknown id: ${id}`).toBe(true);
    }
  });

  it("fiber-order global does not list both a legacy id and its canonical (duplicate Live slots)", () => {
    const fo = fiberOrderFile as { global?: string[] };
    const collisions = fiberOrderIdsCollidingByRedirect(fo.global ?? []);
    expect(
      collisions,
      `Same profile listed twice under different ids: ${collisions.map((g) => g.join(" | ")).join("; ")}`,
    ).toEqual([]);
  });
});
