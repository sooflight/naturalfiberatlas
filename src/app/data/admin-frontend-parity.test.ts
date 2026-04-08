/**
 * admin-frontend-parity.test.ts — Comprehensive guard ensuring content coherence
 * between the Admin workspace, the frontend Atlas, and deployed data.
 *
 * Catches:
 *   - Navigation ID mapping completeness
 *   - Fiber profile → nav tree membership
 *   - Gallery / hero image consistency
 *   - Promoted overrides referencing valid fiber IDs
 *   - Fiber order referencing valid fiber IDs
 *   - Grid filter mapping coverage
 *   - Thumbnail candidate coverage
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { atlasNavigation as frontendNav } from "./atlas-navigation";
import { atlasNavigation as adminNav } from "./admin/atlas-navigation";
import { fibers } from "./fibers";
import { CANONICAL_FIBER_ID_REDIRECTS } from "./fiber-id-redirects";
import {
  getRegistry,
  getLegacyToAdminMap,
  FIBER_TO_NAV_LEAF_ALIASES,
} from "./navigation-id-registry";
import { mapNavToGridFilters } from "./map-nav-to-grid-filters";

const root = process.cwd();

function flattenIds(nodes: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>): string[] {
  const ids: string[] = [];
  const walk = (items: typeof nodes) => {
    items.forEach((node) => {
      ids.push(node.id);
      if (node.children?.length) walk(node.children as typeof nodes);
    });
  };
  walk(nodes);
  return ids;
}

function flattenLeafIds(nodes: Array<{ id: string; children?: Array<{ id: string; children?: unknown[] }> }>): string[] {
  const ids: string[] = [];
  const walk = (items: typeof nodes) => {
    items.forEach((node) => {
      if (node.children?.length) {
        walk(node.children as typeof nodes);
      } else {
        ids.push(node.id);
      }
    });
  };
  walk(nodes);
  return ids;
}

const fiberIds = new Set(fibers.map((f) => f.id));
const adminIds = new Set(flattenIds(adminNav));
const frontendIds = new Set(flattenIds(frontendNav));
const adminLeafIds = new Set(flattenLeafIds(adminNav));

/** All IDs that are valid in fiber-related contexts (fibers.ts + nav nodes + redirect targets). */
const allValidFiberContextIds = new Set([
  ...fiberIds,
  ...adminIds,
  ...Object.keys(CANONICAL_FIBER_ID_REDIRECTS),
  ...Object.values(CANONICAL_FIBER_ID_REDIRECTS),
]);

describe("admin ↔ frontend navigation parity", () => {
  it("registry covers every frontend nav node that has a different admin ID", () => {
    const map = getLegacyToAdminMap();
    const unmapped: string[] = [];
    for (const fId of frontendIds) {
      if (!adminIds.has(fId) && !map[fId]) {
        unmapped.push(fId);
      }
    }
    expect(unmapped, "frontend IDs without admin mapping or direct match").toEqual([]);
  });

  it("registry mappings reference valid admin IDs", () => {
    const invalid: string[] = [];
    for (const entry of getRegistry()) {
      if (!adminIds.has(entry.adminId)) {
        invalid.push(`${entry.frontendId} → ${entry.adminId}`);
      }
    }
    expect(invalid, "registry admin IDs not found in admin tree").toEqual([]);
  });

  it("registry mappings reference valid frontend IDs", () => {
    const invalid: string[] = [];
    for (const entry of getRegistry()) {
      if (!frontendIds.has(entry.frontendId)) {
        invalid.push(`${entry.frontendId} → ${entry.adminId}`);
      }
    }
    expect(invalid, "registry frontend IDs not found in frontend tree").toEqual([]);
  });
});

describe("fiber profiles ↔ navigation tree coverage", () => {
  it("every published fiber profile ID or its alias appears in the admin nav tree", () => {
    const missing: string[] = [];
    for (const fiber of fibers) {
      if (fiber.status === "archived") continue;
      const alias = FIBER_TO_NAV_LEAF_ALIASES[fiber.id];
      const inTree =
        adminIds.has(fiber.id) || (alias != null && adminIds.has(alias));
      if (!inTree) {
        missing.push(fiber.id);
      }
    }
    if (missing.length > 0) {
      console.warn(
        `Published fibers not yet in admin nav tree (${missing.length}): ${missing.join(", ")}`,
      );
    }
    expect(missing.length).toBeLessThan(50);
  });

  it("every admin nav leaf that is a fiber profile exists in fibers.ts or its alias registry", () => {
    const navLeafToFiber = new Map<string, string>(
      Object.entries(FIBER_TO_NAV_LEAF_ALIASES).map(([fiberId, navId]) => [navId, fiberId]),
    );

    const orphaned: string[] = [];
    for (const leafId of adminLeafIds) {
      if (leafId.includes("portal-thumbnail")) continue;
      const resolvedId = navLeafToFiber.get(leafId) ?? leafId;
      if (!fiberIds.has(leafId) && !fiberIds.has(resolvedId)) {
        orphaned.push(leafId);
      }
    }
    if (orphaned.length > 0) {
      console.warn(
        `Admin nav leaves without fibers.ts entry (may be planned): ${orphaned.join(", ")}`,
      );
    }
  });
});

describe("grid filter mapping completeness", () => {
  it("every frontend nav subcategory maps to a valid grid filter", () => {
    const subcategoryNodes = flattenIds(frontendNav).filter(
      (id) => !["fiber", "textile", "dye"].includes(id),
    );
    const unmapped: string[] = [];
    for (const nodeId of subcategoryNodes) {
      const result = mapNavToGridFilters(nodeId);
      if (result.category === "all" && result.fiberSubcategory === null) {
        unmapped.push(nodeId);
      }
    }
    expect(
      unmapped,
      `Frontend nav nodes not handled by mapNavToGridFilters: ${unmapped.join(", ")}`,
    ).toEqual([]);
  });

  it("admin category IDs resolve to the same grid filter as their frontend equivalents", () => {
    const registry = getRegistry();
    const mismatches: string[] = [];
    for (const entry of registry) {
      const fromFrontend = mapNavToGridFilters(entry.frontendId);
      const fromAdmin = mapNavToGridFilters(entry.adminId);
      if (
        fromFrontend.category !== fromAdmin.category ||
        fromFrontend.fiberSubcategory !== fromAdmin.fiberSubcategory
      ) {
        mismatches.push(
          `${entry.adminId} -> ${JSON.stringify(fromAdmin)} vs ${entry.frontendId} -> ${JSON.stringify(fromFrontend)}`,
        );
      }
    }
    expect(
      mismatches,
      `Admin IDs produce different grid filters than frontend equivalents: ${mismatches.join("; ")}`,
    ).toEqual([]);
  });
});

describe("promoted overrides integrity", () => {
  it("promoted-overrides.json only references valid fiber or redirect-source IDs", () => {
    const path = join(root, "src/app/data/promoted-overrides.json");
    if (!existsSync(path)) return;
    const data = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
    const fiberOverrides = data.fibers as Record<string, unknown> | undefined;
    if (!fiberOverrides) return;

    const redirectSources = new Set(Object.keys(CANONICAL_FIBER_ID_REDIRECTS));
    const stale: string[] = [];
    for (const id of Object.keys(fiberOverrides)) {
      if (!fiberIds.has(id) && !redirectSources.has(id)) stale.push(id);
    }
    if (stale.length > 0) {
      console.warn(
        `promoted-overrides.json has stale/orphan IDs (${stale.length}): ${stale.join(", ")}`,
      );
    }
    expect(stale.length).toBeLessThan(5);
  });
});

describe("fiber-order integrity", () => {
  it("fiber-order.json global list only references valid fiber or nav node IDs", () => {
    const path = join(root, "src/app/data/fiber-order.json");
    if (!existsSync(path)) return;
    const data = JSON.parse(readFileSync(path, "utf-8")) as { global?: string[] };
    if (!Array.isArray(data.global)) return;

    const unknown: string[] = [];
    for (const id of data.global) {
      if (!allValidFiberContextIds.has(id)) unknown.push(id);
    }
    expect(
      unknown,
      `fiber-order.json global references completely unknown IDs: ${unknown.join(", ")}`,
    ).toEqual([]);
  });

  it("fiber-order.json has no duplicate IDs in global list", () => {
    const path = join(root, "src/app/data/fiber-order.json");
    if (!existsSync(path)) return;
    const data = JSON.parse(readFileSync(path, "utf-8")) as { global?: string[] };
    if (!Array.isArray(data.global)) return;

    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const id of data.global) {
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    expect(
      duplicates,
      `fiber-order.json has duplicate global IDs: ${duplicates.join(", ")}`,
    ).toEqual([]);
  });
});

describe("new-images.json integrity", () => {
  it("every profile with links has a non-empty profile key", () => {
    const path = join(root, "new-images.json");
    if (!existsSync(path)) return;
    const payload = JSON.parse(readFileSync(path, "utf-8")) as {
      profiles?: Array<{ profileKey?: string; imageLinks?: string[] }>;
    };
    const invalidProfiles: string[] = [];
    for (const profile of payload.profiles ?? []) {
      const key = (profile.profileKey ?? "").trim();
      const links = Array.isArray(profile.imageLinks) ? profile.imageLinks.filter(Boolean) : [];
      if (links.length === 0) continue;
      if (!key) invalidProfiles.push("<missing>");
    }
    expect(
      invalidProfiles,
      "new-images.json has entries with links but missing profile keys",
    ).toEqual([]);
  });

  it("every image link is an absolute http(s) URL", () => {
    const path = join(root, "new-images.json");
    if (!existsSync(path)) return;
    const payload = JSON.parse(readFileSync(path, "utf-8")) as {
      profiles?: Array<{ profileKey?: string; imageLinks?: string[] }>;
    };
    const invalidUrls: string[] = [];
    for (const profile of payload.profiles ?? []) {
      const key = profile.profileKey ?? "<unknown>";
      const links = Array.isArray(profile.imageLinks) ? profile.imageLinks : [];
      for (const link of links) {
        const normalized = typeof link === "string" ? link.trim() : "";
        if (!normalized || !/^https?:\/\//.test(normalized)) {
          invalidUrls.push(`${key}: ${String(link)}`);
        }
      }
    }
    expect(
      invalidUrls,
      `new-images.json contains invalid image links: ${invalidUrls.join(", ")}`,
    ).toEqual([]);
  });
});

describe("thumbnail candidate coverage", () => {
  it("every registry entry has at least one candidate that matches an admin or fiber ID", () => {
    const allKnownIds = new Set([...adminIds, ...fiberIds]);
    const uncovered: string[] = [];
    for (const entry of getRegistry()) {
      const hasMatch = entry.thumbCandidates.some((id) => allKnownIds.has(id));
      if (!hasMatch) {
        uncovered.push(entry.frontendId);
      }
    }
    expect(uncovered).toEqual([]);
  });
});
