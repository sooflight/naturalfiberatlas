import { atlasNavigation, type NavNode } from "../../data/admin/atlas-navigation";
import { ATLAS_IMAGES } from "../../data/admin/atlas-images";
import { MATERIAL_PASSPORTS } from "../../data/admin/material-passports";
import { SUPPLIERS, MATERIAL_SUPPLIER_LINKS } from "../../data/admin/supplier-directory";
import { EVIDENCE_RECORDS } from "../../data/admin/evidence-records";
import { runQualityGates, checkImageCompleteness, type QualityReport } from "./qualityGates";
import type { ContentStatus } from "../../types/material";

// ── Types ──

export interface CensusReport {
  profiles: {
    total: number;
    withImages: number;
    withoutImages: number;
    imageCountBuckets: Record<string, number>;
    totalImages: number;
  };
  passports: {
    total: number;
    byStatus: Record<ContentStatus, number>;
    avgCompleteness: number;
    perProfile: Record<string, number>;
  };
  suppliers: {
    total: number;
    byVerification: Record<string, number>;
    orphaned: string[];
  };
  evidence: {
    total: number;
    byType: Record<string, number>;
    orphaned: string[];
  };
  relationships: {
    totalLinks: number;
    materialsCovered: number;
    suppliersCovered: number;
  };
  quality: QualityReport;
  missingImages: string[];
}

// ── Helpers ──

function collectLeafIds(nodes: NavNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      ids.push(...collectLeafIds(node.children));
    } else {
      ids.push(node.id);
    }
  }
  return ids;
}

function countImages(entry: unknown): number {
  if (!entry) return 0;
  if (typeof entry === "string") return 1;
  if (Array.isArray(entry)) {
    return entry.reduce((sum, e) => {
      if (typeof e === "string") return sum + 1;
      if (e && typeof e === "object" && "url" in e) return sum + 1;
      return sum;
    }, 0);
  }
  if (typeof entry === "object" && entry && "url" in entry) return 1;
  return 0;
}

const PASSPORT_SECTIONS = ["performance", "process", "dyeing", "sustainability", "sourcing", "endUse"] as const;

function passportCompleteness(p: Record<string, any>): number {
  let filled = 0;
  let total = 0;
  for (const section of PASSPORT_SECTIONS) {
    const obj = p[section];
    if (!obj || typeof obj !== "object") continue;
    for (const val of Object.values(obj)) {
      total++;
      if (val !== undefined && val !== null && val !== "") filled++;
    }
  }
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}

// ── Main ──

export function runCensus(): CensusReport {
  const leafIds = collectLeafIds(atlasNavigation);

  // Profiles + images
  let withImages = 0;
  let totalImages = 0;
  const buckets: Record<string, number> = { "0": 0, "1-3": 0, "4-6": 0, "7+": 0 };
  for (const id of leafIds) {
    const c = countImages(ATLAS_IMAGES[id]);
    totalImages += c;
    if (c === 0) { buckets["0"]++; }
    else if (c <= 3) { withImages++; buckets["1-3"]++; }
    else if (c <= 6) { withImages++; buckets["4-6"]++; }
    else { withImages++; buckets["7+"]++; }
  }

  // Passports
  const passports = Object.values(MATERIAL_PASSPORTS);
  const byStatus: Record<ContentStatus, number> = { draft: 0, reviewed: 0, verified: 0, published: 0 };
  const perProfile: Record<string, number> = {};
  let completenessSum = 0;
  for (const p of passports) {
    const status = p.status ?? "draft";
    byStatus[status] = (byStatus[status] || 0) + 1;
    const c = passportCompleteness(p as Record<string, any>);
    const materialId = p.materialId ?? "unknown-material";
    perProfile[materialId] = c;
    completenessSum += c;
  }

  // Suppliers
  const suppliers = Object.values(SUPPLIERS);
  const byVerification: Record<string, number> = {};
  for (const s of suppliers) {
    const v = s.trust.verificationStatus;
    byVerification[v] = (byVerification[v] || 0) + 1;
  }
  const linkedSupplierIds = new Set(MATERIAL_SUPPLIER_LINKS.map((l) => l.supplierId));
  const orphanedSuppliers = suppliers.filter((s) => !linkedSupplierIds.has(s.id)).map((s) => s.id);

  // Evidence
  const evidence = Object.values(EVIDENCE_RECORDS);
  const byType: Record<string, number> = {};
  const allEntityIds = new Set([...leafIds, ...Object.keys(SUPPLIERS)]);
  const orphanedEvidence: string[] = [];
  for (const e of evidence) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    if (!allEntityIds.has(e.linkedEntityId)) orphanedEvidence.push(e.id);
  }

  // Relationships
  const coveredMaterials = new Set(MATERIAL_SUPPLIER_LINKS.map((l) => l.materialId));
  const coveredSuppliers = new Set(MATERIAL_SUPPLIER_LINKS.map((l) => l.supplierId));

  // Quality + image completeness
  const quality = runQualityGates();
  const missingImages = checkImageCompleteness(ATLAS_IMAGES as Record<string, string | string[]>, leafIds);

  return {
    profiles: {
      total: leafIds.length,
      withImages,
      withoutImages: leafIds.length - withImages,
      imageCountBuckets: buckets,
      totalImages,
    },
    passports: {
      total: passports.length,
      byStatus,
      avgCompleteness: passports.length ? Math.round(completenessSum / passports.length) : 0,
      perProfile,
    },
    suppliers: {
      total: suppliers.length,
      byVerification,
      orphaned: orphanedSuppliers,
    },
    evidence: {
      total: evidence.length,
      byType,
      orphaned: orphanedEvidence,
    },
    relationships: {
      totalLinks: MATERIAL_SUPPLIER_LINKS.length,
      materialsCovered: coveredMaterials.size,
      suppliersCovered: coveredSuppliers.size,
    },
    quality,
    missingImages,
  };
}
