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

import { getGalleryImages, type GalleryImageEntry, type PlateType } from "../data/atlas-data";
import type { FiberIndexEntry } from "../data/atlas-data";

/* ══════════════════════════════════════════════════════════
   Animation constants — shared between this module and grid-view.
   Exported so grid-view can use them for settle timers, exhale refs, etc.
   ══════════════════════════════════════════════════════════ */

export const INHALE_FADE = 0.06;       // profile cards snap to black — near-instant
export const EXHALE_FADE = 0.15;       // profile cards fade-in duration
export const DETAIL_FADE = 0.528;       // detail card opacity transition duration
export const SETTLE_BUFFER = 60;       // ms buffer after max stagger + duration
export const STAGGER_PER_UNIT = 0;     // no cascade for profile cards — snap together
export const MAX_STAGGER = 0;          // no profile stagger cap needed

/* Detail-plate micro-stagger: two-beat inhale rhythm.
   Beat 1 — the 4 nearest detail plates (by Manhattan distance from hero)
   load sequentially, one domino at a time (120ms apart).
   The contactSheet card is force-appended as the last Beat 1 entry.
   Beat 2 — after a deliberate 528ms breath from Beat 1 start, remaining
   plates cascade in as dominos with a fixed 120ms gap between each. */
export const FIRST_WAVE_SIZE = 4;              // # of distance-sorted plates in Beat 1 (before contactSheet)
export const BEAT1_CARD_GAP = 0.08;             // 80ms between each Beat 1 card
export const PRIORITY_CASCADE_GAP = 0.528;     // 528ms from Beat 1 start to Beat 2 start
export const BEAT2_CARD_GAP = 0.08;             // 80ms between each Beat 2 card

/* Exhale reverse-stagger: farthest detail plates fade first,
   nearest last, so the eye tracks back to the hero card. */
export const EXHALE_STAGGER_PER_UNIT = 0.015;  // 15ms per Manhattan unit (slightly faster)
export const EXHALE_MAX_STAGGER = 0.09;         // 90ms cap

/* Cascade overlap ratios — maximised so phases are simultaneous */
export const INHALE_OVERLAP = 1.0;     // Phase 2 starts immediately
export const EXHALE_OVERLAP = 1.0;     // Exhale Phase 2 starts immediately
export const EXHALE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
  /* Ring 1 — Immediate context */
  ["about",          ["right", "left", "below-right", "below-left", "below", "above-right", "above-left", "above"]],
  ["insight1",       ["left", "above-left", "above", "above-right", "right", "below-left", "below", "below-right"]],
  ["insight2",       ["below", "below-right", "below-left", "right", "left", "above", "above-right", "above-left"]],
  ["quote",          ["left", "right", "above-left", "above-right", "above", "below-left", "below-right", "below"]],

  /* Ring 2 — Data & geography */
  ["trade",          ["above-left", "above", "left", "above-right", "right", "below-left", "below", "below-right"]],
  ["worldNames",     ["below-left", "below", "below-right", "left", "right", "above-left", "above-right", "above"]],
  ["regions",        ["above", "above-left", "above-right", "left", "right", "below", "below-left", "below-right"]],

  /* Ring 3 — Deep knowledge */
  ["process",        ["below", "below-left", "below-right", "left", "right", "above", "above-left", "above-right"]],
  ["anatomy",        ["left", "below-left", "below", "right", "below-right", "above-left", "above", "above-right"]],
  ["care",           ["below-right", "below", "right", "below-left", "left", "above-right", "above", "above-left"]],
];

/* ══════════════════════════════════════════════════════════
   Data-availability filter — skip plates with no data
   ══════════════════════════════════════════════════════════ */

import { worldNames, processData, anatomyData, careData, quoteData, fibers } from "../data/atlas-data";

/** Returns the subset of PLATE_ZONE_PREFS whose plate types have data for the given fiber. */
function filterAvailablePlates(fiberId: string): [PlateType, Zone[]][] {
  const fiber = fibers.find((f) => f.id === fiberId);
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
        return (quoteData[fiberId] ?? []).length > 0;
      case "insight1":
      case "insight2": {
        /* Need at least 2 sentences to split into two halves */
        const sentences = fiber?.about?.match(/[^.!?]+[.!?]+/g) ?? [];
        return sentences.length >= 2;
      }
      case "seeAlso":
        return fiber ? fiber.seeAlso.length > 0 : false;
      default:
        return true; // about, trade, regions always have data
    }
  });
}

/* ══════════════════════════════════════════════════════════
   Gallery queue builder
   ══════════════════════════════════════════════════════════ */

export interface GalleryCardDescriptor {
  type: "contactSheet";
  images: GalleryImageEntry[];
}

export function buildGalleryQueue(fiberId: string, galleryOverride?: GalleryImageEntry[]): GalleryCardDescriptor[] {
  const all = galleryOverride ?? getGalleryImages(fiberId);
  if (all.length === 0) return [];
  /* Single contact-sheet card replaces the old double-width film strip.
     All images go into one 1×1 grid cell. */
  return [{ type: "contactSheet", images: [...all] }];
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
  profileInhaleDelays: Map<number, number>;
  detailInhaleDelays: Map<number, number>;
  profileExhaleDelays: Map<number, number>;
  detailExhaleDelays: Map<number, number>;
  gallerySlotImages: Map<number, GalleryImageEntry[]>;
  plateExitOffsets: Map<number, { x: number; y: number }>;
}

const EMPTY_RESULT: PlateLayoutResult = {
  plateAssignments: new Map(),
  profileInhaleDelays: new Map(),
  detailInhaleDelays: new Map(),
  profileExhaleDelays: new Map(),
  detailExhaleDelays: new Map(),
  gallerySlotImages: new Map(),
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
  const exitOffsets = new Map<number, { x: number; y: number }>();
  const consumed = new Set<number>();

  /** Manhattan distance from a cell index to the selected cell */
  function mDist(i: number) {
    return Math.abs(Math.floor(i / cols) - selRow) + Math.abs((i % cols) - selCol);
  }

  /* ── Step 0: Reserve contact sheet as a single-cell plate ──
     Placed via zone preference alongside named plates below.
     No pair reservation needed — contact sheet fits one cell. */
  const galleryQueue = buildGalleryQueue(selectedId, galleryOverride);
  const galleryDesc = galleryQueue.length > 0 ? galleryQueue[0] : null;

  /* ── Step 0b: Compute required pool size from data-available plates ── */
  const availablePlates = filterAvailablePlates(selectedId);
  const fiber = fibers.find((f) => f.id === selectedId);
  const hasSeeAlso = fiber && fiber.seeAlso.length > 0;
  const requiredPoolSize =
    availablePlates.length + (hasSeeAlso ? 1 : 0) + (galleryDesc ? 1 : 0);

  /* ── Step 1: Build contiguous pool (BFS-order closest cells) ──
     Include virtual indices beyond filtered.length when we need more slots
     than visible profile cards. */
  const realCandidates = filtered
    .map((_, i) => i)
    .filter((i) => {
      if (i === selectedIndex || consumed.has(i)) return false;
      const row = Math.floor(i / cols);
      if (row < selRow - 1) return false;
      return true;
    });

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

  const allCandidates = [...realCandidates, ...virtualCandidates]
    .sort((a, b) => mDist(a) - mDist(b));
  const pool = new Set(allCandidates.slice(0, requiredPoolSize));

  /* ── Step 1b: Place contact sheet in the pool via zone scoring ── */
  const CONTACT_SHEET_ZONE_PREFS: Zone[] = [
    "below", "below-right", "below-left", "right", "left",
    "above", "above-right", "above-left",
  ];

  if (galleryDesc) {
    let bestCell: number | null = null;
    let bestScore = Infinity;

    for (const cellIdx of pool) {
      if (consumed.has(cellIdx)) continue;
      const zone = classifyZone(cellIdx, selectedIndex, cols);
      const score = CONTACT_SHEET_ZONE_PREFS.indexOf(zone);
      if (score < 0) continue;
      if (score < bestScore || (score === bestScore && bestCell !== null && mDist(cellIdx) < mDist(bestCell))) {
        bestScore = score;
        bestCell = cellIdx;
      }
    }

    if (bestCell !== null) {
      assignments.set(bestCell, "contactSheet");
      galleryImages.set(bestCell, galleryDesc.images);
      consumed.add(bestCell);
      pool.delete(bestCell);
    }
  }

  /* ── Step 2: Assign named plates to pool cells by zone preference ── */
  for (const [plateType, prefs] of availablePlates) {
    let bestCell: number | null = null;
    let bestScore = Infinity;

    for (const cellIdx of pool) {
      if (consumed.has(cellIdx)) continue;
      const zone = classifyZone(cellIdx, selectedIndex, cols);
      const score = prefs.indexOf(zone);
      if (score < 0) continue;
      if (score < bestScore || (score === bestScore && bestCell !== null && mDist(cellIdx) < mDist(bestCell))) {
        bestScore = score;
        bestCell = cellIdx;
      }
    }

    if (bestCell !== null) {
      assignments.set(bestCell, plateType);
      consumed.add(bestCell);
      pool.delete(bestCell);
    }
  }

  /* ── Step 3: seeAlso → farthest remaining cell in pool ── */
  let farthestInPool: number | null = null;
  let farthestPoolDist = -1;
  if (hasSeeAlso) {
    for (const cellIdx of pool) {
      if (consumed.has(cellIdx)) continue;
      const dist = mDist(cellIdx);
      if (dist > farthestPoolDist) {
        farthestPoolDist = dist;
        farthestInPool = cellIdx;
      }
    }
  }
  if (farthestInPool !== null) {
    assignments.set(farthestInPool, "seeAlso");
    consumed.add(farthestInPool);
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

  // Separate contactSheet from distance-sorted entries
  const contactSheetEntry = assignedByDist.find(([, pt]) => pt === "contactSheet");
  const nonContactByDist = assignedByDist.filter(([, pt]) => pt !== "contactSheet");

  // Beat 1: first N distance-sorted (non-contactSheet) + contactSheet at the end
  const firstWaveDistEntries = nonContactByDist.slice(0, FIRST_WAVE_SIZE);
  const firstWaveEntries = contactSheetEntry
    ? [...firstWaveDistEntries, contactSheetEntry]
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
    profileInhaleDelays: profInhale,
    detailInhaleDelays: detInhale,
    profileExhaleDelays: profExhale,
    detailExhaleDelays: detExhale,
    gallerySlotImages: galleryImages,
    plateExitOffsets: exitOffsets,
  };
}