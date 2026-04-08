import fiberOrderRaw from "./fiber-order.json";
import { MATERIAL_PASSPORTS } from "./admin/material-passports";

type FiberOrderFile = { global?: string[] };

const globalOrderIds = new Set(
  ((fiberOrderRaw as FiberOrderFile).global ?? [])
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0),
);

/**
 * Whether a profile appears in the public browse grid and TopNav live count (when admin mode is off).
 *
 * Editorial rules (bundled):
 * - Id must appear in `fiber-order.json` global list (promoted / ordered catalog surface).
 * - Fiber `status` must be published (same default as browse index when status is omitted).
 * - If a material passport exists with `status: "archived"`, hide from the public grid even when
 *   the fiber row is still published — keeps Admin “knowledge archived” in sync with the live site
 *   (e.g. cable-knit, flannel).
 */
export function isPublicBrowseCatalogProfileId(
  profileId: string,
  fiberStatus: string | undefined,
): boolean {
  if (!globalOrderIds.has(profileId)) return false;
  if ((fiberStatus ?? "published") !== "published") return false;
  const passport = (MATERIAL_PASSPORTS as Record<string, { status?: string } | undefined>)[profileId];
  if (passport?.status === "archived") return false;
  return true;
}
