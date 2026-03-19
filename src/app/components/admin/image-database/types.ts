/**
 * Types for ImageDatabaseManager and its sub-components.
 */

import type { AtlasMedia } from '@/types/atlas-media';
import type { MouseEvent } from 'react';

export type ImageEntry = string | AtlasMedia;
export type ImageMap = Record<string, ImageEntry | ImageEntry[]>;
export type TagMap = Record<string, string[]>;
export type RelationMap = Record<string, Record<string, string[]>>;
export type StringMap = Record<string, string>;

export interface HistoryState {
  past: ImageMap[];
  present: ImageMap;
  future: ImageMap[];
}

export type HistoryAction =
  | { type: 'SET'; payload: ImageMap | ((prev: ImageMap) => ImageMap) }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'REPLACE'; payload: ImageMap };

export interface LightboxData {
  urls: string[];
  index: number;
  label: string;
  entryKey: string;
}

export interface UpscaleReviewState {
  beforeUrl: string;
  afterUrl: string;
  sourceProfile: string;
  sourceIndex: number;
}

export interface ImageUploaderProps {
  onUpload: (files: FileList) => Promise<void>;
  onUploadFromUrl: (url: string) => Promise<void>;
  onCopyFromClipboard: () => Promise<void>;
  cloudinaryReady: boolean;
  isUploading: boolean;
  uploadProgress: { done: number; total: number };
}

export interface ImageEditorProps {
  entryKey: string;
  images: string[];
  currentIndex: number;
  onCropImage: (key: string, idx: number, url: string) => void;
  onReorderImages: (key: string, from: number, to: number) => void;
  onRemoveImage: (key: string, idx: number) => void;
  onClose: () => void;
}

export interface ImageHistoryProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearHistory?: () => void;
}

export interface ImageLightboxProps {
  urls: string[];
  startIndex: number;
  label: string;
  entryKey: string;
  onClose: () => void;
  onCropImage?: (key: string, idx: number, url: string) => void;
  onContextMenuImage?: (event: MouseEvent<HTMLImageElement>, imageUrl: string, index: number) => void;
  onDownloadImage?: (imageUrl: string, index: number) => void;
  onNavigateProfile?: (dir: 'prev' | 'next') => void;
  onSetRelation?: (profile: string, target: string) => void;
  onRemoveRelation?: (profile: string, target: string) => void;
  relations?: RelationMap;
  allProfileKeys?: string[];
  era?: StringMap;
  origin?: StringMap;
  scientific?: StringMap;
}

export interface ImageUpscalerProps {
  images: string[];
  profileKey: string;
  cloudinaryConfig: { cloudName: string; uploadPreset: string };
  onUpscaleComplete?: (urls: string[]) => void;
  onClose: () => void;
}
