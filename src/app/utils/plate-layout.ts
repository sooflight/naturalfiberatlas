/**
 * plate-layout.ts — BFS-contiguous detail plate placement + cascading stagger.
 *
 * Pure computation extracted from grid-view.tsx.
 * Given a selected fiber, grid dimensions, and cell visibility data,
 * produces the complete plate assignment map and four phase-delay maps
 * (inhale profile, inhale detail, exhale detail, exhale profile).
 *
 * Deterministic: same inputs → same outputs.  No React, no DOM reads
 * beyond what the caller passes in.
 */

import {
  anatomyData,
  careData,
  fibers,
  getGalleryImages,
  processData,
  worldNames,
  type FiberProfile,
  type FiberIndexEntry,
  type GalleryImageEntry,
  type PlateType,
} from "../data/atlas-data";
import { dataSource } from "../data/data-provider";
import { DETAIL_FADE, EXHALE_EASE } from "./detail-motion";
import { getValidYoutubeEmbedEntries, hasAnyValidYoutubeEmbed } from "./youtube-embed-urls";

/* ══════════════════════════════════════════════════════════
   Animation constants — shared between this module and grid-view.
   DETAIL_FADE / EXHALE_EASE: canonical values in detail-motion.ts
   ══════════════════════════════════════════════════════════ */

export { DETAIL_FADE, EXHALE_EASE };

export const INHALE_FADE = 0.06;       // profile cards snap to black — near-instant
export const EXHALE_FADE = 0.15;       // profile cards fade-in duration
export const SETTLE_BUFFER = 60;       // ms buffer after max stagger + duration
export const STAGGER_PER_UNIT = 0;     // no cascade for profile cards — snap together
export const MAX_STAGGER = 0;          // no profile stagger cap needed

/* Detail-plate micro-stagger: two-beat inhale rhythm.
   Beat 1 — the 4 nearest detail plates (by Manhattan distance from hero)
   load sequentially, one domino at a time (120ms apart).
   The contactSheet card is force-appended as the last Beat 1 entry.
   Beat 2 — after a breath from Beat 1 start, remaining plates cascade in. */
export const FIRST_WAVE_SIZE = 4;              // # of distance-sorted plates in Beat 1 (before contactSheet)
export const BEAT1_CARD_GAP = 0.08;             // 80ms between each Beat 1 card
export const PRIORITY_CASCADE_GAP = DETAIL_FADE; // aligned with detail opacity fade duration
export const BEAT2_CARD_GAP = 0.08;             // 80ms between each Beat 2 card

/* Exhale reverse-stagger: farthest detail plates fade first,
   nearest last, so the eye tracks back to the hero card. */
export const EXHALE_STAGGER_PER_UNIT = 0.015;  // 15ms per Manhattan unit (slightly faster)
export const EXHALE_MAX_STAGGER = 0.09;         // 90ms cap

/* Cascade overlap ratios — maximised so phases are simultaneous */
export const INHALE_OVERLAP = 1.0;     // Phase 2 starts immediately
export const EXHALE_OVERLAP = 1.0;     // Exhale Phase 2 starts immediately

/* ══════════════════════════════════════════════════════════
   Zone classification
   ══════════════════════════════════════════════════════════ */

export type Zone =
  | "right" | "left"
  | "above" | "below"
  | "above-left" | "above-right"
  | "below-left" | "below-right";

export function classifyZone(
  cellIndex: number,
  selectedIndex: number,
  cols: number,
): Zone {
  const r = Math.floor(cellIndex / cols);
  const c = cellIndex % cols;
  const selRow = Math.floor(selectedIndex / cols);
  const selCol = selectedIndex % cols;
  const dr = r - selRow;
  const dc = c - selCol;

  if (dr === 0) return dc > 0 ? "right" : "left";
  if (dc === 0) return dr < 0 ? "above" : "below";
  if (dr < 0) return dc < 0 ? "above-left" : "above-right";
  return dc < 0 ? "below-left" : "below-right";
}

/* ══════════════════════════════════════════════════════════
   Zone-preference table — storytelling arc
   ══════════════════════════════════════════════════════════ */

const PLATE_ZONE_PREFS: [PlateType, Zone[]][] = [
  /* Ring 1 — Identity stays beside the hero title card (same row), never above/below as first choice */
  ["about",          ["right", "left"]],
  ["properties",     ["left", "right", "below", "below-right", "below-left", "above", "above-right", "above-left"]],
  /* Anatomy — keep adjacent to hero (title card); assign early before ring-2/3 consume nearby cells */
  ["anatomy",        ["below", "above", "right", "left", "below-right", "below-left", "above-right", "above-left"]],
  ["insight1",       ["left", "above-left", "above", "above-right", "right", "below-left", "below", "below-right"]],
  ["insight2",       ["below", "below-right", "below-left", "right", "left", "above", "above-right", "above-left"]],
  ["insight3",       ["above", "above-right", "above-left", "right", "left", "below", "below-right", "below-left"]],
  ["silkCharmeuse",  ["right", "below-right", "left", "below-left", "below", "above-right", "above-left", "above"]],
  ["silkHabotai",    ["left", "above-left", "below-left", "above", "below", "right", "above-right", "below-right"]],
  ["silkDupioni",    ["below", "below-left", "left", "below-right", "right", "above-left", "above", "above-right"]],
  ["silkTaffeta",    ["above", "above-right", "right", "above-left", "left", "below-right", "below", "below-left"]],
  ["silkChiffon",    ["below-right", "right", "below", "above-right", "left", "below-left", "above", "above-left"]],
  ["silkOrganza",    ["above-left", "left", "above", "below-left", "right", "above-right", "below", "below-right"]],
  ["quote",          ["left", "right", "above-left", "above-right", "above", "below-left", "below-right", "below"]],
  ["youtubeEmbed",   ["below", "below-right", "below-left", "right", "left", "above", "above-right", "above-left"]],

  /* Ring 2 — Data & geography */
  ["trade",          ["above-left", "above", "left", "above-right", "right", "below-left", "below", "below-right"]],
  ["worldNames",     ["below-left", "below", "below-right", "left", "right", "above-left", "above-right", "above"]],
  ["regions",        ["above", "above-left", "above-right", "left", "right", "below", "below-left", "below-right"]],

  /* Ring 3 — Deep knowledge */
  ["process",        ["below", "below-left", "below-right", "left", "right", "above", "above-left", "above-right"]],
  ["care",           ["below-right", "below", "right", "below-left", "left", "above-right", "above", "above-left"]],
];

/* ══════════════════════════════════════════════════════════
   Data-availability filter — skip plates with no data
   ══════════════════════════════════════════════════════════ */

const bundledFiberIdSet = new Set(fibers.map((f) => f.id));

const SILK_VARIANT_PLATE_TO_PROFILE_ID: Partial<Record<PlateType, string>> = {
  silkCharmeuse: "charmeuse",
  silkHabotai: "habotai",
  silkDupioni: "dupioni",
  silkTaffeta: "taffeta",
  silkChiffon: "chiffon",
  silkOrganza: "organza",
};

/**
 * Profile fields used for plate availability must match the merged runtime catalog
 * (bundled + promoted-overrides + localStorage), not the raw `fibers.ts` re-export alone.
 */
function getFiberForPlateAvailability(fiberId: string): FiberProfile | undefined {
  return dataSource.getFiberById(fiberId) ?? fibers.find((f) => f.id === fiberId);
}

/** Returns the subset of PLATE_ZONE_PREFS whose plate types have data for the given fiber. */
function filterAvailablePlates(fiberId: string): [PlateType, Zone[]][] {
  const fiber = getFiberForPlateAvailability(fiberId);
  return PLATE_ZONE_PREFS.filter(([pt]) => {
    switch (pt) {
      case "worldNames": {
        const names = worldNames[fiberId];
        return names && names.length > 1; // first is English hero, need at least one translation
      }
      case "process":
        return (processData[fiberId] ?? []).length > 0;
      case "anatomy":
        return !!anatomyData[fiberId];
      case "care":
        return !!careData[fiberId];
      case "quote":
        return (dataSource.getQuoteData()[fiberId] ?? []).length > 0;
      case "youtubeEmbed":
        return fiber ? hasAnyValidYoutubeEmbed(fiber) : false;
      case "insight1":
      case "insight2":
      case "insight3": {
        const sentences = fiber?.about?.match(/[^.!?]+[.!?]+/g) ?? [];
        if (pt === "insight3") return sentences.length >= 3;
        return sentences.length >= 2;
      }
      case "silkCharmeuse":
      case "silkHabotai":
      case "silkDupioni":
      case "silkTaffeta":
      case "silkChiffon":
      case "silkOrganza": {
        if (fiberId !== "silk") return false;
        const targetId = SILK_VARIANT_PLATE_TO_PROFILE_ID[pt];
        return !!targetId && bundledFiberIdSet.has(targetId);
      }
      case "seeAlso":
        return fiber ? fiber.seeAlso.length > 0 : false;
      default:
        return true; // about, properties, trade, regions always have data
    }
  });
}

/** One layout row per YouTube video so each gets its own detail cell. */
/** Lowest zone-preference index wins; ties break on lower cell index (deterministic). */
function pickBestCellForZonePrefs(
  pool: Set<number>,
  selectedIndex: number,
  cols: number,
  prefs: Zone[],
  consumed: Set<number>,
): number | null {
  let bestCell: number | null = null;
  let bestScore = Infinity;
  for (const cellIdx of pool) {
    if (consumed.has(cellIdx)) continue;
    const zone = classifyZone(cellIdx, selectedIndex, cols);
    const score = prefs.indexOf(zone);
    if (score < 0) continue;
    if (score < bestScore || (score === bestScore && bestCell !== null && cellIdx < bestCell)) {
      bestScore = score;
      bestCell = cellIdx;
    }
  }
  return bestCell;
}

/**
 * Row-major pool prefix, but always includes the hero's immediate horizontal neighbors
 * when they are eligible candidates so Identity (about) can use zone "right" / "left".
 */
export function buildLayoutCandidatePool(
  allCandidatesSorted: number[],
  requiredPoolSize: number,
  selectedIndex: number,
  cols: number,
): Set<number> {
  const pool = new Set(allCandidatesSorted.slice(0, requiredPoolSize));
  const candidateSet = new Set(allCandidatesSorted);
  const selCol = selectedIndex % cols;
  const horizontal: number[] = [];
  if (selCol > 0) horizontal.push(selectedIndex - 1);
  if (selCol < cols - 1) horizontal.push(selectedIndex + 1);
  const mustInclude = horizontal.filter((i) => candidateSet.has(i));
  for (const i of mustInclude) pool.add(i);
  while (pool.size > requiredPoolSize) {
    const sortedDesc = [...pool].sort((a, b) => b - a);
    const victim = sortedDesc.find((i) => !mustInclude.includes(i));
    if (victim === undefined) break;
    pool.delete(victim);
  }
  return pool;
}

function expandYoutubePlateRows(
  fiberId: string,
  plates: [PlateType, Zone[]][],
): [PlateType, Zone[]][] {
  const fiber = getFiberForPlateAvailability(fiberId);
  const n = fiber ? getValidYoutubeEmbedEntries(fiber).length : 0;
  if (n <= 1) return plates;

  const out: [PlateType, Zone[]][] = [];
  for (const row of plates) {
    if (row[0] === "youtubeEmbed") {
      for (let i = 0; i < n; i++) {
        out.push(row);
      }
    } else {
      out.push(row);
    }
  }
  return out;
}

function expandQuotePlateRows(
  fiberId: string,
  plates: [PlateType, Zone[]][],
): [PlateType, Zone[]][] {
  const nCards = quoteDetailCardCountForFiber(fiberId);
  if (nCards <= 1) return plates;

  const out: [PlateType, Zone[]][] = [];
  for (const row of plates) {
    if (row[0] === "quote") {
      for (let i = 0; i < nCards; i++) {
        out.push(row);
      }
    } else {
      out.push(row);
    }
  }
  return out;
}

/* ══════════════════════════════════════════════════════════
   Gallery queue builder
   ══════════════════════════════════════════════════════════ */

/** Max thumbnails per contact-sheet detail card; overflow becomes additional cards. */
export const CONTACT_SHEET_MAX_IMAGES_PER_CARD = 12;

/**
 * After at least one full card (`CONTACT_SHEET_MAX_IMAGES_PER_CARD`), a trailing
 * run shorter than this count is not given its own card — those images stay in
 * the lightbox only. (Remainders 1–2 are hidden from the grid; 3+ get a final card.)
 */
export const CONTACT_SHEET_MIN_TAIL_FOR_OWN_CARD = 3;

/** Max curated quotes per Quote detail card; overflow becomes additional quote cards. */
export const QUOTE_MAX_QUOTES_PER_CARD = 3;

export function quoteDetailCardCountForFiber(fiberId: string): number {
  const n = (dataSource.getQuoteData()[fiberId] ?? []).length;
  if (n <= 0) return 0;
  return Math.ceil(n / QUOTE_MAX_QUOTES_PER_CARD);
}

export interface GalleryCardDescriptor {
  type: "contactSheet";
  images: GalleryImageEntry[];
  /** Index of `images[0]` in the fiber’s full merged gallery (lightbox / labels). */
  startIndex: number;
}

export function chunkGalleryForContactSheets(all: GalleryImageEntry[]): GalleryCardDescriptor[] {
  if (all.length === 0) return [];
  const max = CONTACT_SHEET_MAX_IMAGES_PER_CARD;
  const fullCards = Math.floor(all.length / max);
  const remainder = all.length % max;
  const omitSparseTail =
    fullCards >= 1 &&
    remainder > 0 &&
    remainder < CONTACT_SHEET_MIN_TAIL_FOR_OWN_CARD;
  const visibleLen = omitSparseTail ? all.length - remainder : all.length;

  const out: GalleryCardDescriptor[] = [];
  for (let start = 0; start < visibleLen; start += max) {
    out.push({
      type: "contactSheet",
      images: all.slice(start, start + max),
      startIndex: start,
    });
  }
  return out;
}

export function buildGalleryQueue(fiberId: string, galleryOverride?: GalleryImageEntry[]): GalleryCardDescriptor[] {
  const all = galleryOverride ?? getGalleryImages(fiberId);
  return chunkGalleryForContactSheets(all);
}

/* ══════════════════════════════════════════════════════════
   Cell visibility snapshot — passed in by the caller
   so this module never touches the DOM directly.
   ══════════════════════════════════════════════════════════ */

export interface CellVisibility {
  /** Viewport intersection ratio for each cell index (0–1).
   *  0 = fully off-screen, 1 = fully visible.
   *  Missing entries default to 1.0. */
  ratios: Map<number, number>;
}

/* ══════════════════════════════════════════════════════════
   PlateLayoutResult
   ══════════════════════════════════════════════════════════ */

export interface PlateLayoutResult {
  plateAssignments: Map<number, PlateType>;
  /** For `youtubeEmbed` cells only: which video index (0-based) that cell shows. */
  youtubeEmbedSlotByCell: Map<number, number>;
  /** For `quote` cells only: which quote chunk (0-based) that card shows (up to `QUOTE_MAX_QUOTES_PER_CARD` quotes each). */
  quoteChunkSlotByCell: Map<number, number>;
  profileInhaleDelays: Map<number, number>;
  detailInhaleDelays: Map<number, number>;
  profileExhaleDelays: Map<number, number>;
  detailExhaleDelays: Map<number, number>;
  gallerySlotImages: Map<number, GalleryImageEntry[]>;
  /** Global gallery index of `gallerySlotImages.get(cell)[0]` for each contact-sheet cell. */
  gallerySlotStartIndex: Map<number, number>;
  plateExitOffsets: Map<number, { x: number; y: number }>;
}

const EMPTY_RESULT: PlateLayoutResult = {
  plateAssignments: new Map(),
  youtubeEmbedSlotByCell: new Map(),
  quoteChunkSlotByCell: new Map(),
  profileInhaleDelays: new Map(),
  detailInhaleDelays: new Map(),
  profileExhaleDelays: new Map(),
  detailExhaleDelays: new Map(),
  gallerySlotImages: new Map(),
  gallerySlotStartIndex: new Map(),
  plateExitOffsets: new Map(),
};

/* ══════════════════════════════════════════════════════════
   Core computation
   ══════════════════════════════════════════════════════════ */

export function computePlateLayout(
  selectedId: string | null,
  filtered: FiberIndexEntry[],
  cols: number,
  cellVisibility: CellVisibility,
  galleryOverride?: GalleryImageEntry[],
): PlateLayoutResult {
  if (!selectedId) return EMPTY_RESULT;

  const selectedIndex = filtered.findIndex((f) => f.id === selectedId);
  if (selectedIndex === -1) return EMPTY_RESULT;

  const selRow = Math.floor(selectedIndex / cols);
  const selCol = selectedIndex % cols;
  const totalCells = filtered.length;

  const assignments = new Map<number, PlateType>();
  const profInhale = new Map<number, number>();
  const detInhale = new Map<number, number>();
  const profExhale = new Map<number, number>();
  const detExhale = new Map<number, number>();
  const galleryImages = new Map<number, GalleryImageEntry[]>();
  const galleryStartIndex = new Map<number, number>();
  const exitOffsets = new Map<number, { x: number; y: number }>();
  const youtubeEmbedSlotByCell = new Map<number, number>();
  const quoteChunkSlotByCell = new Map<number, number>();
  const consumed = new Set<number>();

  /** Manhattan distance from a cell index to the selected cell */
  function mDist(i: number) {
    return Math.abs(Math.floor(i / cols) - selRow) + Math.abs((i % cols) - selCol);
  }

  /* ── Step 0: Reserve contact sheet as a single-cell plate ──
     Placed via zone preference alongside named plates below.
     No pair reservation needed — contact sheet fits one cell. */
  const galleryQueue = buildGalleryQueue(selectedId, galleryOverride);

  /* ── Step 0b: Compute required pool size from data-available plates ── */
  const availablePlates = expandQuotePlateRows(
    selectedId,
    expandYoutubePlateRows(selectedId, filterAvailablePlates(selectedId)),
  );
  const fiber = getFiberForPlateAvailability(selectedId);
  const hasSeeAlso = fiber && fiber.seeAlso.length > 0;
  const requiredPoolSize =
    availablePlates.length + (hasSeeAlso ? 1 : 0) + galleryQueue.length;

  /* ── Step 1: Build pool in row-major order (fill each row L→R before the next) ──
     Eligible real cells: same row as hero or below, plus one row above (selRow−1),
     excluding the hero. Virtual indices continue in index order when more slots
     are needed than visible profile cards. */
  const realCandidates = filtered
    .map((_, i) => i)
    .filter((i) => {
      if (i === selectedIndex || consumed.has(i)) return false;
      const row = Math.floor(i / cols);
      if (row < selRow - 1) return false;
      return true;
    });
  realCandidates.sort((a, b) => a - b);

  const virtualStart = filtered.length;
  const virtualCandidates: number[] = [];
  let nextVirtual = virtualStart;
  while (virtualCandidates.length + realCandidates.length < requiredPoolSize) {
    const row = Math.floor(nextVirtual / cols);
    if (row >= selRow - 1) {
      virtualCandidates.push(nextVirtual);
    }
    nextVirtual += 1;
  }

  const allCandidates = [...realCandidates, ...virtualCandidates].sort((a, b) => a - b);
  const pool = buildLayoutCandidatePool(
    allCandidates,
    requiredPoolSize,
    selectedIndex,
    cols,
  );

  const aboutPrefs = PLATE_ZONE_PREFS.find(([pt]) => pt === "about")?.[1];
  let identityPreassigned = false;
  /* Identity (about): claim left/right of hero before gallery; pool always includes those neighbors when eligible. */
  if (aboutPrefs) {
    const identityCell = pickBestCellForZonePrefs(pool, selectedIndex, cols, aboutPrefs, consumed);
    if (identityCell !== null) {
      assignments.set(identityCell, "about");
      consumed.add(identityCell);
      pool.delete(identityCell);
      identityPreassigned = true;
    }
  }

  let reservedSeeAlsoCell: number | null = null;
  /* See Also: reserve the farthest pool cell up front. Step 3 used to pick "farthest of leftovers",
     but only one cell remained — often adjacent to the hero. */
  if (hasSeeAlso) {
    let farthest: number | null = null;
    let farthestDist = -1;
    for (const cellIdx of pool) {
      const d = mDist(cellIdx);
      if (d > farthestDist || (d === farthestDist && farthest !== null && cellIdx < farthest)) {
        farthestDist = d;
        farthest = cellIdx;
      }
    }
    if (farthest !== null) {
      reservedSeeAlsoCell = farthest;
      pool.delete(farthest);
    }
  }

  /* ── Step 1b: Place contact sheet in the pool via zone scoring ── */
  const CONTACT_SHEET_ZONE_PREFS: Zone[] = [
    "below", "below-right", "below-left", "right", "left",
    "above", "above-right", "above-left",
  ];

  for (const galleryDesc of galleryQueue) {
    let bestCell: number | null = null;
    let bestScore = Infinity;

    for (const cellIdx of pool) {
      if (consumed.has(cellIdx)) continue;
      const zone = classifyZone(cellIdx, selectedIndex, cols);
      const score = CONTACT_SHEET_ZONE_PREFS.indexOf(zone);
      if (score < 0) continue;
      if (score < bestScore || (score === bestScore && bestCell !== null && cellIdx < bestCell)) {
        bestScore = score;
        bestCell = cellIdx;
      }
    }

    if (bestCell !== null) {
      assignments.set(bestCell, "contactSheet");
      galleryImages.set(bestCell, galleryDesc.images);
      galleryStartIndex.set(bestCell, galleryDesc.startIndex);
      consumed.add(bestCell);
      pool.delete(bestCell);
    }
  }

  /* ── Step 2: Assign named plates to pool cells by zone preference ── */
  let nextYoutubeSlot = 0;
  let nextQuoteChunkSlot = 0;
  for (const [plateType, prefs] of availablePlates) {
    if (plateType === "about" && identityPreassigned) continue;
    let bestCell: number | null = null;
    let bestScore = Infinity;

    for (const cellIdx of pool) {
      if (consumed.has(cellIdx)) continue;
      const zone = classifyZone(cellIdx, selectedIndex, cols);
      const score = prefs.indexOf(zone);
      if (score < 0) continue;
      if (score < bestScore || (score === bestScore && bestCell !== null && cellIdx < bestCell)) {
        bestScore = score;
        bestCell = cellIdx;
      }
    }

    if (bestCell !== null) {
      assignments.set(bestCell, plateType);
      if (plateType === "youtubeEmbed") {
        youtubeEmbedSlotByCell.set(bestCell, nextYoutubeSlot++);
      }
      if (plateType === "quote") {
        quoteChunkSlotByCell.set(bestCell, nextQuoteChunkSlot++);
      }
      consumed.add(bestCell);
      pool.delete(bestCell);
    }
  }

  /* ── Step 3: seeAlso → cell reserved at layout start (max distance from hero in pool) ── */
  if (reservedSeeAlsoCell !== null) {
    assignments.set(reservedSeeAlsoCell, "seeAlso");
    consumed.add(reservedSeeAlsoCell);
  }

  /* ── Step 3d: Directional exit offsets ── */
  const DRIFT_PX = 7;
  const zoneOffsets: Record<string, { x: number; y: number }> = {
    "right":       { x: -DRIFT_PX, y: 0 },
    "left":        { x:  DRIFT_PX, y: 0 },
    "above":       { x: 0,         y:  DRIFT_PX },
    "below":       { x: 0,         y: -DRIFT_PX },
    "above-left":  { x:  DRIFT_PX, y:  DRIFT_PX },
    "above-right": { x: -DRIFT_PX, y:  DRIFT_PX },
    "below-left":  { x:  DRIFT_PX, y: -DRIFT_PX },
    "below-right": { x: -DRIFT_PX, y: -DRIFT_PX },
  };

  for (const [idx, pt] of assignments.entries()) {
    const zone = classifyZone(idx, selectedIndex, cols);
    exitOffsets.set(idx, zoneOffsets[zone] ?? { x: 0, y: 0 });
  }

  /* ═══════════════════════════════════════════════════════════════════
     Step 4: Cascading phase delays (overlapping)
     ═══════════════════════════════════════════════════════════════════ */

  /* Inhale Phase 1: profile cards fade out, farthest-first (scroll-aware) */
  let maxProfileMDist = 0;
  for (let i = 0; i < totalCells; i++) {
    if (i === selectedIndex) continue;
    maxProfileMDist = Math.max(maxProfileMDist, mDist(i));
  }
  for (let i = 0; i < totalCells; i++) {
    if (i === selectedIndex) continue;
    const rawDelay = Math.min(MAX_STAGGER, (maxProfileMDist - mDist(i)) * STAGGER_PER_UNIT);
    const visibility = cellVisibility.ratios.get(i) ?? 1;
    profInhale.set(i, rawDelay * visibility);
  }
  const maxProfileInhaleDelay = Math.max(0, ...Array.from(profInhale.values()));

  /* Phase 2 starts while Phase 1 is still mid-cascade */
  const phase2Start = maxProfileInhaleDelay * INHALE_OVERLAP + INHALE_FADE * 0.5;

  /* Inhale Beat 1: nearest N detail plates (by Manhattan distance) fade in
     sequentially — each card starts 80ms after the previous one, creating
     a domino cascade. The contactSheet is force-appended as the last
     Beat 1 entry regardless of its distance. */
  const assignedByDist = [...assignments.entries()]
    .sort((a, b) => mDist(a[0]) - mDist(b[0]));

  // Separate contactSheet from distance-sorted entries (all sheets append after Beat 1 plates)
  const contactSheetEntries = assignedByDist.filter(([, pt]) => pt === "contactSheet");
  const nonContactByDist = assignedByDist.filter(([, pt]) => pt !== "contactSheet");

  const firstWaveDistEntries = nonContactByDist.slice(0, FIRST_WAVE_SIZE);
  const firstWaveEntries =
    contactSheetEntries.length > 0
      ? [...firstWaveDistEntries, ...contactSheetEntries]
      : firstWaveDistEntries;
  const firstWave = new Set(firstWaveEntries.map(([idx]) => idx));

  firstWaveEntries.forEach(([idx], i) => {
    detInhale.set(idx, phase2Start + i * BEAT1_CARD_GAP);
  });

  /* Inhale Beat 2: remaining detail plates fade in as dominos after the
     528ms gap. Sorted by Manhattan distance, each card starts 80ms after
     the previous — a steady sequential cascade until the grid is filled. */
  const beat2Start = phase2Start + PRIORITY_CASCADE_GAP;

  const secondWaveEntries = nonContactByDist
    .filter(([idx]) => !firstWave.has(idx));

  secondWaveEntries.forEach(([idx], i) => {
    detInhale.set(idx, beat2Start + i * BEAT2_CARD_GAP);
  });

  /* Exhale Phase 1: detail plates fade out, farthest-first */
  const detailIndices: number[] = [];
  for (const [idx] of assignments.entries()) {
    detailIndices.push(idx);
  }
  const maxDetailMDist = Math.max(0, ...detailIndices.map((i) => mDist(i)));
  for (const idx of detailIndices) {
    const delay = Math.min(EXHALE_MAX_STAGGER, (maxDetailMDist - mDist(idx)) * EXHALE_STAGGER_PER_UNIT);
    detExhale.set(idx, delay);
  }
  const maxDetailExhaleDelay = Math.max(0, ...Array.from(detExhale.values()));

  /* Exhale Phase 2 starts while detail plates are mid-cascade */
  const exhalePhase2Start = maxDetailExhaleDelay * EXHALE_OVERLAP + DETAIL_FADE * 0.4;

  /* Exhale Phase 2: profile cards fade back in, nearest-first */
  for (let i = 0; i < totalCells; i++) {
    if (i === selectedIndex) continue;
    const stagger = Math.min(MAX_STAGGER, mDist(i) * STAGGER_PER_UNIT);
    profExhale.set(i, exhalePhase2Start + stagger);
  }

  return {
    plateAssignments: assignments,
    youtubeEmbedSlotByCell,
    quoteChunkSlotByCell,
    profileInhaleDelays: profInhale,
    detailInhaleDelays: detInhale,
    profileExhaleDelays: profExhale,
    detailExhaleDelays: detExhale,
    gallerySlotImages: galleryImages,
    gallerySlotStartIndex: galleryStartIndex,
    plateExitOffsets: exitOffsets,
  };
}