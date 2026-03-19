/**
 * useLightboxState — manages lightbox overlay state.
 *
 * Encapsulates the lightbox fiber ID, initial image index,
 * and source rectangle for the FLIP zoom-to-origin morph.
 */

import { useState, useCallback } from "react";

export interface LightboxState {
  lightboxFiberId: string | null;
  lightboxInitialIndex: number;
  lightboxSourceRect: DOMRect | null;
  openLightbox: (fiberId: string, imageIndex?: number, sourceRect?: DOMRect | null) => void;
  closeLightbox: () => void;
}

export function useLightboxState(): LightboxState {
  const [lightboxFiberId, setLightboxFiberId] = useState<string | null>(null);
  const [lightboxInitialIndex, setLightboxInitialIndex] = useState(0);
  const [lightboxSourceRect, setLightboxSourceRect] = useState<DOMRect | null>(null);

  const openLightbox = useCallback(
    (fiberId: string, imageIndex: number = 0, sourceRect: DOMRect | null = null) => {
      setLightboxInitialIndex(imageIndex);
      setLightboxFiberId(fiberId);
      setLightboxSourceRect(sourceRect);
    },
    [],
  );

  const closeLightbox = useCallback(() => {
    setLightboxFiberId(null);
  }, []);

  return {
    lightboxFiberId,
    lightboxInitialIndex,
    lightboxSourceRect,
    openLightbox,
    closeLightbox,
  };
}
