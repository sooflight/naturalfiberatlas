/**
 * useScreenPlateState — manages the fullscreen ScreenPlate overlay state.
 *
 * Computes the navigable plate entries from the plate assignment map
 * and exposes open/close handlers + a cellIndex → DOMRect lookup.
 */

import { useState, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import { namedPlates, type PlateType, type FiberIndexEntry } from "../data/atlas-data";
import type { ScreenPlateEntry } from "../components/screen-plate";

export interface ScreenPlateInfo {
  plateType: PlateType;
  sourceRect: DOMRect;
  cellIndex: number;
  /** When true, opened from MobileDetailView — use mobile plate list and sourceRect for exit morph */
  fromMobileDetail?: boolean;
  /** Disambiguates multiple Quote slides when `cellIndex` alone is not unique (e.g. mobile). */
  quoteChunkSlot?: number;
}

export interface ScreenPlateState {
  screenPlateInfo: ScreenPlateInfo | null;
  screenPlateEntries: ScreenPlateEntry[];
  getCellRect: (cellIndex: number) => DOMRect | null;
  openScreenPlate: (info: ScreenPlateInfo) => void;
  closeScreenPlate: () => void;
}

export function useScreenPlateState(
  plateAssignments: Map<number, PlateType>,
  youtubeEmbedSlotByCell: Map<number, number>,
  quoteChunkSlotByCell: Map<number, number>,
  filtered: FiberIndexEntry[],
  cellRefs: MutableRefObject<Map<string, HTMLDivElement>>,
  indexRefs: MutableRefObject<Map<number, HTMLDivElement>>,
): ScreenPlateState {
  const [screenPlateInfo, setScreenPlateInfo] = useState<ScreenPlateInfo | null>(null);

  /** Ordered plate list for arrow-key cycling. Sorted by storytelling order. */
  const screenPlateEntries = useMemo((): ScreenPlateEntry[] => {
    const entries: ScreenPlateEntry[] = [];
    for (const [cellIndex, pt] of plateAssignments) {
      const ytSlot = youtubeEmbedSlotByCell.get(cellIndex);
      const quoteSlot = quoteChunkSlotByCell.get(cellIndex);
      entries.push({
        plateType: pt,
        cellIndex,
        ...(pt === "youtubeEmbed" && ytSlot !== undefined ? { youtubeEmbedSlot: ytSlot } : {}),
        ...(pt === "quote" && quoteSlot !== undefined ? { quoteChunkSlot: quoteSlot } : {}),
      });
    }
    const order = new Map(namedPlates.map((p, i) => [p, i]));
    entries.sort((a, b) => {
      const oa = order.get(a.plateType) ?? 99;
      const ob = order.get(b.plateType) ?? 99;
      if (oa !== ob) return oa - ob;
      return a.cellIndex - b.cellIndex;
    });
    return entries;
  }, [plateAssignments, youtubeEmbedSlotByCell, quoteChunkSlotByCell]);

  /** Live cellRef → DOMRect lookup for exit morph. Supports virtual cells via indexRefs. */
  const getCellRect = useCallback(
    (cellIndex: number): DOMRect | null => {
      const byIndex = indexRefs.current.get(cellIndex);
      if (byIndex) return byIndex.getBoundingClientRect();
      const fiber = filtered[cellIndex];
      if (!fiber) return null;
      const el = cellRefs.current.get(fiber.id);
      return el ? el.getBoundingClientRect() : null;
    },
    [filtered, cellRefs, indexRefs],
  );

  const openScreenPlate = useCallback((info: ScreenPlateInfo) => {
    setScreenPlateInfo(info);
  }, []);

  const closeScreenPlate = useCallback(() => {
    setScreenPlateInfo(null);
  }, []);

  return {
    screenPlateInfo,
    screenPlateEntries,
    getCellRect,
    openScreenPlate,
    closeScreenPlate,
  };
}