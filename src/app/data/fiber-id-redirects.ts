/**
 * Legacy fiber ids merged into a canonical profile. URLs and lookups should
 * resolve to the canonical id (e.g. bookmarks to /fiber/angora → mohair).
 */
export const CANONICAL_FIBER_ID_REDIRECTS: Readonly<Record<string, string>> = {
  angora: "mohair",
  tussah: "tussar",
  "mulberry-silk": "silk",
  eri: "peace-silk",
  buriti: "chambira",
};

export function resolveCanonicalFiberId(id: string): string {
  return CANONICAL_FIBER_ID_REDIRECTS[id] ?? id;
}

/**
 * Groups of raw ids in `order` that map to the same canonical profile (e.g. both
 * `tussar` and `tussah`). Use to catch duplicate sidebar/grid slots; fiber-order and
 * image registries should list the canonical id only.
 */
export function fiberOrderIdsCollidingByRedirect(order: readonly string[]): string[][] {
  const byCanon = new Map<string, string[]>();
  for (const id of order) {
    const canon = resolveCanonicalFiberId(id);
    const list = byCanon.get(canon) ?? [];
    list.push(id);
    byCanon.set(canon, list);
  }
  return [...byCanon.values()].filter((ids) => ids.length > 1);
}
