import type {
  AtlasImportPayload,
  AtlasImportEntry,
  ImportValidation,
  ImportDiff,
  ImportDiffStats,
  EntryDiff,
  EntryFieldDiff,
  CurrentAtlasState,
  MergedAtlasState,
  VideoImportEntry,
} from '@/types/atlas-import';
import { toUrlArray } from "@/types/atlas-media";

// ── URL normalization ──
// Re-export from unified imageUrl utility for backward compatibility
export { normalizeImageUrl as normalizeUrl } from "./imageUrl";
import { normalizeImageUrl } from "./imageUrl";
const normalizeUrl = normalizeImageUrl;

function isValidUrl(s: string): boolean {
  if (!s || typeof s !== 'string') return false;
  try { new URL(s.trim()); return true; } catch { return false; }
}

// ── Atlas-images field keys (not NodeData) ──

const ATLAS_FIELDS = new Set([
  'images', 'videos', 'tags', 'era', 'origins', 'scientificName',
]);

// ── JSON repair ──

function repairJson(text: string): { repaired: string; fixes: string[] } {
  const fixes: string[] = [];
  let s = text;

  // Strip BOM
  if (s.charCodeAt(0) === 0xFEFF) { s = s.slice(1); fixes.push('Stripped BOM'); }

  // Remove single-line comments (// ...)
  const beforeComments = s;
  s = s.replace(/^([ \t]*)\/\/[^\n]*/gm, '$1');
  if (s !== beforeComments) fixes.push('Removed single-line comments');

  // Remove block comments (/* ... */)
  const beforeBlock = s;
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  if (s !== beforeBlock) fixes.push('Removed block comments');

  // Remove trailing commas before } or ]
  const beforeTrailing = s;
  s = s.replace(/,(\s*[}\]])/g, '$1');
  if (s !== beforeTrailing) fixes.push('Removed trailing commas');

  // Insert missing commas: } or ] followed by whitespace then "
  const beforeMissing = s;
  s = s.replace(/([}\]])(\s*\n\s*")/g, '$1,$2');
  if (s !== beforeMissing) fixes.push('Inserted missing commas after } or ]');

  // Insert missing commas: value" followed by newline then "key"
  const beforeMissing2 = s;
  s = s.replace(/(")(\s*\n\s*")/g, (match, q, rest) => {
    // Don't add comma if next " starts a key inside a just-opened object
    return q + ',' + rest;
  });
  if (s !== beforeMissing2 && !fixes.includes('Inserted missing commas after } or ]')) {
    fixes.push('Inserted missing commas between string values');
  }

  // Re-check: the above "string then string" rule is too aggressive — it inserts
  // commas between key: "value" pairs that are already correct. We need to be smarter.
  // Instead of the above, let's just try to parse and if it still fails, give up.
  // Revert the last aggressive fix if it causes more errors.
  try {
    JSON.parse(s);
    return { repaired: s, fixes };
  } catch {
    // The aggressive string-comma fix may have broken things; undo it
    s = beforeMissing2;
    // Re-apply only the structural fixes
    s = s.replace(/([}\]])(\s*\n\s*")/g, '$1,$2');
    try {
      JSON.parse(s);
      fixes.pop(); // remove the "string values" fix
      return { repaired: s, fixes };
    } catch {
      // Return best effort
      return { repaired: s, fixes };
    }
  }
}

// ── Validation ──

export function validateImport(raw: unknown): ImportValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw === null || raw === undefined) {
    return { valid: false, errors: ['Input is empty'], warnings, payload: null };
  }

  let obj: any;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch (firstError: any) {
      const { repaired, fixes } = repairJson(raw);
      try {
        obj = JSON.parse(repaired);
        fixes.forEach(f => warnings.push(`Auto-fixed: ${f}`));
      } catch {
        return { valid: false, errors: [`Invalid JSON: ${firstError.message}`], warnings, payload: null };
      }
    }
  } else {
    obj = raw;
  }

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, errors: ['Root must be an object'], warnings, payload: null };
  }

  // Accept both { entries: {...} } and a flat { "hemp": {...}, "cotton": {...} } format
  let entries: Record<string, any>;
  if (obj.entries && typeof obj.entries === 'object' && !Array.isArray(obj.entries)) {
    entries = obj.entries;
  } else {
    // Treat root keys (except "version") as entry IDs
    const { version, ...rest } = obj;
    if (Object.keys(rest).length === 0) {
      return { valid: false, errors: ['No entries found'], warnings, payload: null };
    }
    entries = rest;
    if (version !== undefined) warnings.push('Detected flat format (no "entries" wrapper)');
  }

  const validEntries: Record<string, AtlasImportEntry> = {};
  let entryCount = 0;

  for (const [key, entry] of Object.entries(entries)) {
    entryCount++;
    const path = `entries.${key}`;

    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      errors.push(`${path}: must be an object`);
      continue;
    }

    const e = entry as Record<string, any>;
    const cleaned: AtlasImportEntry = {};

    if (e.images !== undefined) {
      if (!Array.isArray(e.images)) {
        if (typeof e.images === 'string') {
          cleaned.images = [e.images];
          warnings.push(`${path}.images: converted single string to array`);
        } else {
          errors.push(`${path}.images: must be a string or string[]`);
        }
      } else {
        const validUrls: string[] = [];
        e.images.forEach((u: any, i: number) => {
          if (typeof u !== 'string') {
            errors.push(`${path}.images[${i}]: must be a string`);
          } else if (!isValidUrl(u)) {
            warnings.push(`${path}.images[${i}]: may not be a valid URL`);
            validUrls.push(u.trim());
          } else {
            validUrls.push(u.trim());
          }
        });
        if (validUrls.length) cleaned.images = validUrls;
      }
    }

    if (e.videos !== undefined) {
      if (!Array.isArray(e.videos)) {
        if (typeof e.videos === 'string') {
          cleaned.videos = [e.videos.trim()];
          warnings.push(`${path}.videos: converted single string to array`);
        } else if (typeof e.videos === "object" && e.videos && typeof e.videos.url === "string") {
          cleaned.videos = [{ ...(e.videos as Record<string, any>), url: e.videos.url.trim() }];
          warnings.push(`${path}.videos: converted single object to array`);
        } else {
          errors.push(`${path}.videos: must be a string, video object, or array`);
        }
      } else {
        const validVideos: VideoImportEntry[] = [];
        e.videos.forEach((v: any, i: number) => {
          if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed) validVideos.push(trimmed);
            return;
          }
          if (typeof v === "object" && v && typeof v.url === "string" && v.url.trim()) {
            validVideos.push({ ...(v as Record<string, any>), url: v.url.trim() });
            return;
          }
          errors.push(`${path}.videos[${i}]: must be a string or object with url`);
        });
        if (validVideos.length) cleaned.videos = validVideos;
      }
    }

    if (e.tags !== undefined) {
      if (!Array.isArray(e.tags)) {
        if (typeof e.tags === 'string') {
          cleaned.tags = [e.tags];
          warnings.push(`${path}.tags: converted single string to array`);
        } else {
          errors.push(`${path}.tags: must be a string or string[]`);
        }
      } else {
        cleaned.tags = e.tags.filter((t: any) => typeof t === 'string');
      }
    }

    for (const field of ['era', 'origins', 'scientificName'] as const) {
      if (e[field] !== undefined) {
        if (typeof e[field] !== 'string') {
          errors.push(`${path}.${field}: must be a string`);
        } else if (e[field].trim()) {
          cleaned[field] = e[field].trim();
        }
      }
    }

    // Pass through any NodeData fields
    for (const [field, value] of Object.entries(e)) {
      if (!ATLAS_FIELDS.has(field) && !(field in cleaned)) {
        cleaned[field] = value;
      }
    }

    if (Object.keys(cleaned).length > 0) {
      validEntries[key] = cleaned;
    }
  }

  if (entryCount === 0) {
    errors.push('No entries found in import data');
  }

  const hasBlockingErrors = errors.length > 0 && Object.keys(validEntries).length === 0;

  return {
    valid: !hasBlockingErrors,
    errors,
    warnings,
    payload: Object.keys(validEntries).length > 0
      ? { version: obj.version, entries: validEntries }
      : null,
  };
}

// ── Diff computation ──

function normalizeToArray(v: unknown): string[] {
  return toUrlArray(v as any);
}

function videoUrl(entry: VideoImportEntry): string {
  return typeof entry === "string" ? entry : entry.url;
}

function toVideoArray(value: unknown): VideoImportEntry[] {
  if (!value) return [];
  if (typeof value === "string") return [value.trim()];
  if (!Array.isArray(value)) return [];
  const out: VideoImportEntry[] = [];
  for (const item of value) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) out.push(trimmed);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const url = typeof (item as { url?: unknown }).url === "string" ? (item as { url: string }).url.trim() : "";
    if (!url) continue;
    out.push({ ...(item as Record<string, any>), url });
  }
  return out;
}

function diffArrayField(
  field: string,
  incoming: string[] | undefined,
  current: string[] | undefined,
): EntryFieldDiff | null {
  if (!incoming?.length) return null;

  const currentNorm = new Set((current || []).map(normalizeUrl));
  const newItems: string[] = [];
  const duplicateItems: string[] = [];

  for (const url of incoming) {
    if (currentNorm.has(normalizeUrl(url))) {
      duplicateItems.push(url);
    } else {
      newItems.push(url);
    }
  }

  if (newItems.length === 0 && duplicateItems.length === 0) return null;

  return {
    field,
    action: newItems.length > 0 ? 'add' : 'skip',
    newItems,
    duplicateItems,
  };
}

function diffStringField(
  field: string,
  incoming: string | undefined,
  current: string | undefined,
): EntryFieldDiff | null {
  if (!incoming) return null;
  if (incoming === current) return { field, action: 'skip', current, incoming };
  return {
    field,
    action: current ? 'update' : 'add',
    current: current || undefined,
    incoming,
  };
}

export function computeDiff(
  payload: AtlasImportPayload,
  state: CurrentAtlasState,
): ImportDiff {
  const entries: EntryDiff[] = [];
  const stats: ImportDiffStats = {
    newNodes: 0, updatedNodes: 0, unchangedNodes: 0,
    newImages: 0, duplicateImages: 0,
    newVideos: 0, duplicateVideos: 0,
    newTags: 0, metadataUpdates: 0, nodeDataUpdates: 0,
  };

  for (const [id, entry] of Object.entries(payload.entries)) {
    const isNew = !(id in state.images);
    const fields: EntryFieldDiff[] = [];

    // Images
    const imgDiff = diffArrayField(
      'images',
      entry.images,
      normalizeToArray(state.images[id]),
    );
    if (imgDiff) {
      fields.push(imgDiff);
      stats.newImages += imgDiff.newItems?.length || 0;
      stats.duplicateImages += imgDiff.duplicateItems?.length || 0;
    }

    // Videos
    const vidDiff = diffArrayField(
      'videos',
      entry.videos?.map(videoUrl),
      toVideoArray(state.videos[id]).map(videoUrl),
    );
    if (vidDiff) {
      vidDiff.incoming = toVideoArray(entry.videos).map(videoUrl);
      fields.push(vidDiff);
      stats.newVideos += vidDiff.newItems?.length || 0;
      stats.duplicateVideos += vidDiff.duplicateItems?.length || 0;
    }

    // Tags
    const tagDiff = diffArrayField('tags', entry.tags, state.tags[id]);
    if (tagDiff) {
      fields.push(tagDiff);
      stats.newTags += tagDiff.newItems?.length || 0;
    }

    // String metadata
    for (const [field, stateMap] of [
      ['era', state.era],
      ['origins', state.origins],
      ['scientificName', state.scientific],
    ] as const) {
      const d = diffStringField(field, entry[field] as string | undefined, stateMap[id]);
      if (d && d.action !== 'skip') {
        fields.push(d);
        stats.metadataUpdates++;
      }
    }

    // NodeData fields (anything not in ATLAS_FIELDS)
    let hasNodeData = false;
    for (const [field, value] of Object.entries(entry)) {
      if (ATLAS_FIELDS.has(field)) continue;
      if (value !== undefined && value !== null && value !== '') {
        fields.push({ field, action: 'add', incoming: value });
        hasNodeData = true;
      }
    }
    if (hasNodeData) stats.nodeDataUpdates++;

    const hasChanges = fields.some(f => f.action !== 'skip');

    if (isNew) stats.newNodes++;
    else if (hasChanges) stats.updatedNodes++;
    else stats.unchangedNodes++;

    entries.push({
      id,
      status: isNew ? 'new' : hasChanges ? 'updated' : 'unchanged',
      fields,
      included: hasChanges || isNew,
    });
  }

  // Sort: new first, then updated, then unchanged
  entries.sort((a, b) => {
    const order = { new: 0, updated: 1, unchanged: 2 };
    return order[a.status] - order[b.status];
  });

  return { entries, stats };
}

// ── Apply import ──

export function applyImport(
  diff: ImportDiff,
  state: CurrentAtlasState,
): MergedAtlasState {
  const images = { ...state.images };
  const tags = { ...state.tags };
  const videos = { ...state.videos };
  const era = { ...state.era };
  const origins = { ...state.origins };
  const scientific = { ...state.scientific };
  const nodeDataBatch: Record<string, Record<string, any>> = {};

  for (const entry of diff.entries) {
    if (!entry.included) continue;

    for (const field of entry.fields) {
      if (field.action === 'skip') continue;

      switch (field.field) {
        case 'images': {
          const newUrls = field.newItems || [];
          if (!newUrls.length) break;
          const current = normalizeToArray(images[entry.id]);
          images[entry.id] = [...current, ...newUrls];
          break;
        }
        case 'videos': {
          const incomingUrls = toVideoArray(field.incoming).map(videoUrl);
          if (!incomingUrls.length) break;
          const current = videos[entry.id] || [];
          const seen = new Set(current.map((video) => normalizeUrl(video)));
          const merged = [...current];
          for (const url of incomingUrls) {
            const key = normalizeUrl(url);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(url);
          }
          videos[entry.id] = merged;
          break;
        }
        case 'tags': {
          const newTags = field.newItems || [];
          if (!newTags.length) break;
          const current = tags[entry.id] || [];
          tags[entry.id] = [...current, ...newTags];
          break;
        }
        case 'era':
          if (field.incoming) era[entry.id] = field.incoming;
          break;
        case 'origins':
          if (field.incoming) origins[entry.id] = field.incoming;
          break;
        case 'scientificName':
          if (field.incoming) scientific[entry.id] = field.incoming;
          break;
        default: {
          // NodeData field
          const nodeKey = `node:${entry.id}`;
          if (!nodeDataBatch[nodeKey]) nodeDataBatch[nodeKey] = { id: entry.id, name: entry.id.replace(/-/g, ' ') };
          nodeDataBatch[nodeKey][field.field] = field.incoming;
          break;
        }
      }
    }

    // Ensure new nodes get at least an empty entry in images
    if (entry.status === 'new' && !(entry.id in images)) {
      images[entry.id] = [];
    }
  }

  return { images, tags, videos, era, origins, scientific, nodeDataBatch };
}

// ── Export helpers ──

export function exportToJson(state: CurrentAtlasState): AtlasImportPayload {
  const entries: Record<string, AtlasImportEntry> = {};

  const allKeys = new Set([
    ...Object.keys(state.images),
    ...Object.keys(state.tags),
    ...Object.keys(state.videos),
    ...Object.keys(state.era),
    ...Object.keys(state.origins),
    ...Object.keys(state.scientific),
  ]);

  for (const id of allKeys) {
    const entry: AtlasImportEntry = {};
    const imgs = state.images[id];
    if (imgs) entry.images = normalizeToArray(imgs);
    if (toVideoArray(state.videos[id]).length) entry.videos = toVideoArray(state.videos[id]);
    if (state.tags[id]?.length) entry.tags = state.tags[id];
    if (state.era[id]) entry.era = state.era[id];
    if (state.origins[id]) entry.origins = state.origins[id];
    if (state.scientific[id]) entry.scientificName = state.scientific[id];
    if (Object.keys(entry).length > 0) entries[id] = entry;
  }

  return { version: 1, entries };
}
