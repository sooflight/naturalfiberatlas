/**
 * Backward-compatibility re-exports.
 * All functionality now lives in imageSearch.ts.
 */
export {
  type BraveConfig,
  type BraveImageResult,
  searchBraveImages,
  testBraveConnection,
  buildScoutQuery,
} from './imageSearch';
