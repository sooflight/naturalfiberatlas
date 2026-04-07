/**
 * Unified atlas profile — one row per catalog fiber with optional passport attachment.
 * Public grid and Admin should derive headline counts from this merge, not from two registries.
 */

import type { FiberProfile } from "./fibers";
import type { MaterialPassport } from "../types/material";
import { MATERIAL_PASSPORTS } from "./admin/material-passports";

export type UnifiedAtlasProfile = {
  id: string;
  fiber: FiberProfile;
  passport: MaterialPassport | null;
};

export function unifyFibersWithPassportRegistry(
  fibers: readonly FiberProfile[],
): UnifiedAtlasProfile[] {
  return fibers.map((fiber) => ({
    id: fiber.id,
    fiber,
    passport: (MATERIAL_PASSPORTS[fiber.id] as MaterialPassport | undefined) ?? null,
  }));
}

export type UnifiedCatalogSummary = {
  /** Rows in the fiber catalog (same cardinality as getFibers() input). */
  totalCatalogRows: number;
  /** Same rule as GridView / TopNav when category is “All”. */
  publishedLive: number;
  /** Catalog rows that have a MATERIAL_PASSPORTS entry. */
  catalogRowsWithPassport: number;
  /** Subset of published rows that also have a passport. */
  publishedWithPassport: number;
  publishedMissingPassport: number;
};

export function summarizeUnifiedCatalog(
  unified: readonly UnifiedAtlasProfile[],
): UnifiedCatalogSummary {
  const published = unified.filter((u) => (u.fiber.status ?? "published") === "published");
  const withPass = unified.filter((u) => u.passport != null);
  const pubWithPass = published.filter((u) => u.passport != null);
  return {
    totalCatalogRows: unified.length,
    publishedLive: published.length,
    catalogRowsWithPassport: withPass.length,
    publishedWithPassport: pubWithPass.length,
    publishedMissingPassport: published.length - pubWithPass.length,
  };
}

/** Passport registry keys with no catalog fiber id (should stay empty for a closed system). */
export function passportKeysNotInCatalog(catalogIds: ReadonlySet<string>): string[] {
  return Object.keys(MATERIAL_PASSPORTS).filter((id) => !catalogIds.has(id));
}

/** Published catalog ids with no MATERIAL_PASSPORTS row (sorted). */
export function listPublishedIdsMissingPassport(
  unified: readonly UnifiedAtlasProfile[],
): string[] {
  return unified
    .filter((u) => (u.fiber.status ?? "published") === "published" && u.passport == null)
    .map((u) => u.id)
    .sort((a, b) => a.localeCompare(b));
}
