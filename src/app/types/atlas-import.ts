/**
 * JSON Import schema for the Atlas database.
 *
 * Supports images, videos, tags, metadata, and rich NodeData fields.
 * Keyed by node ID (e.g. "hemp", "cotton", "flax-linen").
 */

import type { ImageMap, VideoEntry } from './atlas-media';

export type VideoImportEntry = string | VideoEntry;

export interface AtlasImportEntry {
  images?: string[];
  videos?: VideoImportEntry[];
  tags?: string[];
  era?: string;
  origins?: string;
  scientificName?: string;

  summary?: string;
  tagline?: string;
  type?: string;
  category?: string;
  subcategory?: string;
  portal?: string;
  imageQuery?: string;
  properties?: Record<string, any>;
  environmental?: Record<string, any>;
  processing?: string[] | Record<string, any>;
  applications?: string[] | Record<string, string>;
  dyeCompatibility?: Record<string, any>;
  culturalSignificance?: string;
  crossReferences?: Record<string, string[]>;

  [key: string]: any;
}

export interface AtlasImportPayload {
  version?: number;
  entries: Record<string, AtlasImportEntry>;
}

// ── Diff types ──

export interface EntryFieldDiff {
  field: string;
  action: 'add' | 'update' | 'skip';
  current?: any;
  incoming?: any;
  /** For array fields: only the new items not already present */
  newItems?: string[];
  /** For array fields: items that were duplicates */
  duplicateItems?: string[];
}

export interface EntryDiff {
  id: string;
  status: 'new' | 'updated' | 'unchanged';
  fields: EntryFieldDiff[];
  /** Whether this entry is included in the import (user can toggle) */
  included: boolean;
}

export interface ImportDiffStats {
  newNodes: number;
  updatedNodes: number;
  unchangedNodes: number;
  newImages: number;
  duplicateImages: number;
  newVideos: number;
  duplicateVideos: number;
  newTags: number;
  metadataUpdates: number;
  nodeDataUpdates: number;
}

export interface ImportDiff {
  entries: EntryDiff[];
  stats: ImportDiffStats;
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload: AtlasImportPayload | null;
}

// ── Current state snapshot for diff computation ──

export interface CurrentAtlasState {
  images: ImageMap;
  tags: Record<string, string[]>;
  videos: Record<string, string[]>;
  era: Record<string, string>;
  origins: Record<string, string>;
  scientific: Record<string, string>;
}

// ── Merged result after applying import ──

export interface MergedAtlasState {
  images: ImageMap;
  tags: Record<string, string[]>;
  videos: Record<string, string[]>;
  era: Record<string, string>;
  origins: Record<string, string>;
  scientific: Record<string, string>;
  /** NodeData fields to seed to KV, keyed by "node:{id}" */
  nodeDataBatch?: Record<string, Record<string, any>>;
}
