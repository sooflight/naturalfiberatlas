import type { AtlasDataSource } from "../../data/data-provider";
import { fibers as bundledProfiles } from "../../data/fibers";
import deletedFiberIdsBundledRaw from "../../data/deleted-fiber-ids.json";
import { readPassportStatusOverrides } from "./passportStatusOverrides";

export type AtlasProfileStatus = "published" | "archived";

export function normalizeAtlasStatus(value: unknown): AtlasProfileStatus {
  if (value === "archived" || value === "draft") return "archived";
  return "published";
}

function countLiveProfiles(
  entries: Array<{ id: string; category: string; status: AtlasProfileStatus }>,
): { all: number; fiber: number } {
  let all = 0;
  let fiber = 0;
  for (const entry of entries) {
    if (entry.status !== "published") continue;
    all += 1;
    if (entry.category === "fiber") fiber += 1;
  }
  return { all, fiber };
}

export type PublishParityDiagnostics = {
  bundledCounts: { all: number; fiber: number };
  localCounts: { all: number; fiber: number };
  payloadCounts: { all: number; fiber: number };
  deletedLocally: string[];
  localVsBundled: string[];
  localVsPayload: string[];
  bundledOnlyLive: string[];
  localOnlyLive: string[];
};

export function computePublishParityDiagnostics(source: AtlasDataSource): PublishParityDiagnostics {
  const bundledDeleted = new Set(
    (Array.isArray(deletedFiberIdsBundledRaw) ? deletedFiberIdsBundledRaw : [])
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim()),
  );
  const bundledRows = bundledProfiles
    .map((profile) => {
      if (bundledDeleted.has(profile.id)) return null;
      const bundled = source.getBundledFiber(profile.id);
      return {
        id: profile.id,
        category: profile.category,
        status: normalizeAtlasStatus(bundled?.status),
      };
    })
    .filter((row): row is { id: string; category: string; status: AtlasProfileStatus } => !!row);
  const localRows = source.getFibers().map((profile) => ({
    id: profile.id,
    category: profile.category,
    status: normalizeAtlasStatus(profile.status),
  }));

  const localById = new Map(localRows.map((row) => [row.id, row]));
  const deletedLocally = bundledRows.map((row) => row.id).filter((id) => !localById.has(id));

  let payloadDiff: Record<string, unknown> = {};
  try {
    payloadDiff = JSON.parse(source.exportDiffJSON()) as Record<string, unknown>;
  } catch {
    payloadDiff = {};
  }
  const payloadFiberPatches =
    payloadDiff.fibers && typeof payloadDiff.fibers === "object" && !Array.isArray(payloadDiff.fibers)
      ? (payloadDiff.fibers as Record<string, Record<string, unknown>>)
      : {};
  const passportOverrides = readPassportStatusOverrides();
  const localDeletedFromStorage = new Set(
    ((() => {
      try {
        if (typeof window === "undefined") return [];
        const raw = localStorage.getItem("atlas:deletedFiberIds");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })() as unknown[])
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim()),
  );

  const payloadRows = bundledRows
    .map((bundled) => {
      if (localDeletedFromStorage.has(bundled.id)) return null;
      const patch = payloadFiberPatches[bundled.id];
      const patchStatus = patch && "status" in patch ? normalizeAtlasStatus(patch.status) : null;
      const passportStatus = passportOverrides[bundled.id];
      const status = normalizeAtlasStatus(passportStatus ?? patchStatus ?? bundled.status);
      return {
        id: bundled.id,
        category: bundled.category,
        status,
      };
    })
    .filter((row): row is { id: string; category: string; status: AtlasProfileStatus } => !!row);
  const payloadById = new Map(payloadRows.map((row) => [row.id, row]));

  const localVsBundled: string[] = [];
  const localVsPayload: string[] = [];
  const bundledOnlyLive: string[] = [];
  const localOnlyLive: string[] = [];
  for (const bundled of bundledRows) {
    const localStatus = localById.get(bundled.id)?.status ?? "archived";
    const localLive = localStatus === "published";
    const bundledLive = bundled.status === "published";
    const payloadLive = payloadById.get(bundled.id)?.status === "published";
    if (localLive !== bundledLive) localVsBundled.push(bundled.id);
    if (localLive !== payloadLive) localVsPayload.push(bundled.id);
    if (bundledLive && !localLive) bundledOnlyLive.push(bundled.id);
    if (localLive && !bundledLive) localOnlyLive.push(bundled.id);
  }

  return {
    bundledCounts: countLiveProfiles(bundledRows),
    localCounts: countLiveProfiles(localRows),
    payloadCounts: countLiveProfiles(payloadRows),
    deletedLocally,
    localVsBundled,
    localVsPayload,
    bundledOnlyLive,
    localOnlyLive,
  };
}
