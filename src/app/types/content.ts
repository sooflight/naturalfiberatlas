import type { MaterialPassport } from './material';
import type { AtlasMedia } from './atlas-media';

/**
 * Media asset with an ID, extending AtlasMedia.
 * Used for hero images and other media in ContentItem.
 */
export type MediaAsset = AtlasMedia & {
  id: string;
};

/**
 * Unified content item used across all views (List, Grid, Knowledge).
 * Combines visual and structured data for seamless view switching.
 */
export type ContentItem = {
  id: string;

  // Visual data (for Grid/List views)
  heroImage?: MediaAsset;
  imageCount: number;

  // Knowledge data (for Knowledge view)
  passport?: MaterialPassport;
  completeness: number;        // 0-100% calculated score
  mappedFields: number;        // Number of fields with data
  totalFields: number;         // Total expected fields

  // Common metadata
  status: 'published' | 'draft' | 'archived';
  lastModified: Date;
};
