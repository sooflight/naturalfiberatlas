/**
 * Image Database Components - Modular sub-components for image management.
 *
 * This module provides decomposed components from the original ImageDatabaseManager:
 * - ImageLightbox: Fullscreen preview with cropping
 * - useImageHistory: Hook for undo/redo state management
 *
 * Future extractions:
 * - ImageUploader: File upload and clipboard paste
 * - ImageEditor: Metadata editing interface
 * - ImageHistory: Visual history timeline
 * - ImageUpscaler: ML upscaling interface
 */

export { ImageLightbox } from './ImageLightbox';
export { useImageHistory } from './useImageHistory';
export type {
  ImageEntry,
  ImageMap,
  TagMap,
  RelationMap,
  StringMap,
  HistoryState,
  HistoryAction,
  LightboxData,
  UpscaleReviewState,
  ImageLightboxProps,
} from './types';
