/**
 * navigation-id-registry.ts — Single source of truth for admin ↔ frontend
 * navigation ID equivalences AND fiber ↔ nav-leaf aliases.
 *
 * Two kinds of ID mismatches exist:
 *
 *  1) Category nodes: frontend uses legacy IDs ("bast-fiber"), admin uses
 *     taxonomic IDs ("bast-fibers").
 *
 *  2) Leaf profiles: fibers.ts uses short canonical IDs ("coir"), while the
 *     admin nav tree uses compound leaf IDs ("coir-coconut").
 *
 * Both are registered here so every consumer (parity tests, thumbnail
 * resolution, grid filtering, new-images alias resolution) imports from
 * one place.
 */

export interface NavIdMapping {
  /** ID used in the public frontend navigation tree */
  frontendId: string;
  /** Equivalent ID used in the admin navigation tree */
  adminId: string;
  /** Candidate IDs for thumbnail resolution (admin IDs checked first, then frontend) */
  thumbCandidates: string[];
}

const REGISTRY: NavIdMapping[] = [
  { frontendId: "plant",       adminId: "plant-cellulose",      thumbCandidates: ["plant-cellulose", "plant"] },
  { frontendId: "bast-fiber",  adminId: "bast-fibers",          thumbCandidates: ["bast-fibers", "bast-fiber"] },
  { frontendId: "bark-fiber",  adminId: "bark-fibers",          thumbCandidates: ["bark-fibers", "bark-fiber"] },
  { frontendId: "seed-fiber",  adminId: "seed-fibers",          thumbCandidates: ["seed-fibers", "seed-fiber"] },
  { frontendId: "leaf-fiber",  adminId: "leaf-fibers",          thumbCandidates: ["leaf-fibers", "leaf-fiber"] },
  { frontendId: "grass-fiber", adminId: "grass-fibers",         thumbCandidates: ["grass-fibers", "grass-fiber"] },
  { frontendId: "fruit-fiber", adminId: "fruit-fibers",         thumbCandidates: ["fruit-fibers", "fruit-fiber"] },
  { frontendId: "animal",      adminId: "animal-protein",       thumbCandidates: ["animal-protein", "animal"] },
  { frontendId: "regen",       adminId: "mineral-regenerated",  thumbCandidates: ["mineral-regenerated", "regen"] },
  { frontendId: "textile",     adminId: "textile",              thumbCandidates: ["textile-portal-thumbnail", "textile"] },
];

/**
 * Fiber profile IDs (fibers.ts) that differ from their admin nav-tree leaf ID.
 * Key = fibers.ts canonical ID, Value = admin nav-tree leaf ID.
 *
 * These are the same entity — different naming conventions.
 * `fiber-id-redirects.ts` handles URL redirects for renamed profiles;
 * this map handles the nav-tree ↔ catalog divergence.
 */
export const FIBER_TO_NAV_LEAF_ALIASES: Readonly<Record<string, string>> = {
  coir: "coir-coconut",
  pineapple: "pineapple-pina",
  lyocell: "lyocell-tencel",
  wool: "sheep-wool",
  bamboo: "bamboo-viscose",
};

/**
 * Reverse map: admin nav-tree leaf ID → fibers.ts canonical ID.
 * Used by new-images.json alias resolution and admin image catalog sync.
 */
export const NAV_LEAF_TO_FIBER_ALIASES: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.entries(FIBER_TO_NAV_LEAF_ALIASES).map(([k, v]) => [v, k]),
  );

/**
 * Alias map used by new-images.json: nav-tree / admin compound IDs → fibers.ts
 * canonical IDs. This is a superset of NAV_LEAF_TO_FIBER_ALIASES that also
 * covers profileKey conventions in new-images.json.
 */
export const NEW_IMAGE_PROFILE_ALIASES: Readonly<Record<string, string>> = {
  ...NAV_LEAF_TO_FIBER_ALIASES,
  cotton: "organic-cotton",
  /** Profile renamed from crochet; keep disk exports aligned with canonical ID. */
  crochet: "knitting",
  /** Legacy nav / export id; canonical catalog row is `tussar`. */
  tussah: "tussar",
};

/** frontend → admin ID lookup */
const _frontendToAdmin = new Map<string, string>();
/** admin → frontend ID lookup */
const _adminToFrontend = new Map<string, string>();
/** frontend ID → thumb candidates (admin-first) */
const _thumbCandidates = new Map<string, string[]>();
/** Set of all frontend IDs that have a distinct admin equivalent */
const _frontendIds = new Set<string>();
/** Set of all admin IDs that have a distinct frontend equivalent */
const _adminIds = new Set<string>();

for (const entry of REGISTRY) {
  _frontendToAdmin.set(entry.frontendId, entry.adminId);
  _adminToFrontend.set(entry.adminId, entry.frontendId);
  _thumbCandidates.set(entry.frontendId, entry.thumbCandidates);
  _frontendIds.add(entry.frontendId);
  _adminIds.add(entry.adminId);
}

/** Map a frontend nav ID to its admin equivalent (returns input if no mapping). */
export function frontendIdToAdmin(frontendId: string): string {
  return _frontendToAdmin.get(frontendId) ?? frontendId;
}

/** Map an admin nav ID to its frontend equivalent (returns input if no mapping). */
export function adminIdToFrontend(adminId: string): string {
  return _adminToFrontend.get(adminId) ?? adminId;
}

/**
 * Resolve thumbnail candidate IDs for a given frontend nav node.
 * Returns admin-aliased IDs first (for bundled/published overrides) then the
 * frontend segment ID as fallback.
 */
export function getThumbCandidateIds(nodeId: string): string[] {
  return _thumbCandidates.get(nodeId) ?? [nodeId];
}

/** The complete legacy-to-admin equivalence record (for parity tests). */
export function getLegacyToAdminMap(): Readonly<Record<string, string>> {
  return Object.fromEntries(_frontendToAdmin);
}

/** All registered frontend IDs. */
export function getRegisteredFrontendIds(): ReadonlySet<string> {
  return _frontendIds;
}

/** All registered admin IDs. */
export function getRegisteredAdminIds(): ReadonlySet<string> {
  return _adminIds;
}

/** The raw registry entries (for tests and debugging). */
export function getRegistry(): readonly NavIdMapping[] {
  return REGISTRY;
}
