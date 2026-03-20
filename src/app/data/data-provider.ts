/**
 * data-provider.ts — Abstraction layer for Atlas data persistence.
 *
 * Provides a DataSource interface and a LocalStorageSource implementation.
 * Components read "effective" data (bundled defaults + localStorage overrides merged).
 * Admin panel writes through updateFiber() / updateTable(), which triggers
 * subscribers so the app re-renders with fresh data.
 *
 * Concepts implemented:
 *   C1 — Override Translucency (getBundledFiber, getFiberOverrideKeys, etc.)
 *   C2 — Operation Journal (undo/redo ring buffer)
 *   C7 — Source Handoff Protocol (provenance, diff export, merge strategies)
 *
 * Future: swap LocalStorageSource for GistSource or BlobSource with
 * zero component changes — they share the same AtlasDataSource interface.
 */

import type { FiberProfile, ProcessStep, AnatomyData, CareData, QuoteEntry } from "./atlas-data";
import { isAdminEnabled } from "../config/admin-access";
import { fibers as rawBundledFibers } from "./fibers";
import fiberOrderFileRaw from "./fiber-order.json";
import promotedOverridesRaw from "./promoted-overrides.json";
import {
  worldNames as bundledWorldNames,
  processData as bundledProcessData,
  anatomyData as bundledAnatomyData,
  careData as bundledCareData,
  quoteData as bundledQuoteData,
} from "./atlas-data";

/* ══════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════ */

export type TableName = "fibers" | "worldNames" | "processData" | "anatomyData" | "careData" | "quoteData";
export type MergeStrategy = "local-wins" | "remote-wins" | "manual";

export type FiberId = string & { readonly __brand: "FiberId" };


/** C2 — A single operation in the journal */
export interface JournalEntry {
  id: string;
  timestamp: number;
  table: TableName;
  fiberId: string;
  field?: string;
  prevValue: unknown;
  nextValue: unknown;
  source: "local" | "gist" | "blob";
}

/** C7 — Provenance envelope for override entries */
export interface OverrideMeta {
  source: "local" | "gist" | "blob";
  author?: string;
  updatedAt: string;
}

/** C1 — Summary of overrides for a single fiber */
export interface FiberOverrideSummary {
  fiberId: string;
  fiberName: string;
  fields: Array<{
    field: string;
    bundledValue: unknown;
    currentValue: unknown;
  }>;
  tables: TableName[];
}

/** C7 — Conflict detected during merge */
export interface MergeConflict {
  table: TableName;
  fiberId: string;
  field?: string;
  localValue: unknown;
  remoteValue: unknown;
  bundledValue: unknown;
}

/* ── C8: Snapshot & Changeset types ── */

export interface SnapshotMeta {
  id: string;
  name: string;
  timestamp: number;
  overrideCount: number;
}

export interface ChangesetEnvelope {
  id: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
  fiberIds: string[];
  data: string; // JSON of the diff
  stats: { fields: number; tables: number; fibers: number };
}

/** Full merged runtime catalog for tooling / repo promotion (not importJSON-shaped). */
export interface EffectiveAtlasSnapshotMeta {
  kind: "atlas-effective-snapshot";
  version: 1;
  exportedAt: string;
  fiberCount: number;
  deletedFiberIds: string[];
  /** Admin Import JSON expects override patches; use exportJSON or exportDiffJSON for re-import. */
  importNote: string;
}

export interface EffectiveAtlasSnapshot {
  meta: EffectiveAtlasSnapshotMeta;
  fibers: Record<string, FiberProfile>;
  worldNames: Record<string, string[]>;
  processData: Record<string, ProcessStep[]>;
  anatomyData: Record<string, AnatomyData>;
  careData: Record<string, CareData>;
  quoteData: Record<string, QuoteEntry[]>;
  fiberOrder?: string[];
  fiberOrderByGroup?: Record<string, string[]>;
}

/* ── C9: Staging types ── */

export interface StagedChange {
  id: string;
  fiberId: string;
  table: TableName;
  field?: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: number;
}

export interface VerificationResult {
  fiberId: string;
  fiberName: string;
  severity: "pass" | "warn" | "fail";
  category: string;
  message: string;
}

/* ══════════════════════════════════════════════════════════
   Interface
   ══════════════════════════════════════════════════════════ */

export interface AtlasDataSource {
  /* ── Fiber profiles ── */
  getFibers(): FiberProfile[];
  getFiberById(id: string): FiberProfile | undefined;
  updateFiber(id: string, patch: Partial<FiberProfile>): void;
  removeFiberOverride(id: string): void;
  deleteFiber(id: string): void;
  isFiberDeleted(id: string): boolean;

  /* ── C1: Override Translucency ── */
  getBundledFiber(id: string): FiberProfile | undefined;
  getFiberOverrideKeys(id: string): string[];
  getOverriddenFiberIds(): string[];
  getOverrideSummary(): FiberOverrideSummary[];
  removeFieldOverride(fiberId: string, field: string): void;

  /* ── Supplementary tables ── */
  getWorldNames(): Record<string, string[]>;
  getProcessData(): Record<string, ProcessStep[]>;
  getAnatomyData(): Record<string, AnatomyData>;
  getCareData(): Record<string, CareData>;
  getQuoteData(): Record<string, QuoteEntry[]>;
  updateWorldNames(id: string, names: string[]): void;
  updateProcessData(id: string, steps: ProcessStep[]): void;
  updateAnatomyData(id: string, data: AnatomyData): void;
  updateCareData(id: string, data: CareData): void;
  updateQuoteData(id: string, quotes: QuoteEntry[]): void;
  removeSupplementaryOverride(table: TableName, fiberId: string): void;

  /* ── C2: Operation Journal ── */
  getJournal(): JournalEntry[];
  undo(): JournalEntry | null;
  redo(): JournalEntry | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clearJournal(): void;

  /* ── Reactivity ── */
  subscribe(cb: () => void): () => void;
  getVersion(): number;

  /* ── Import / Export ── */
  exportJSON(): string;
  exportDiffJSON(): string;
  /** Merged bundle + overrides; not compatible with importJSON (full profiles). */
  exportEffectiveJSON(): string;
  importJSON(json: string): void;
  merge(json: string, strategy: MergeStrategy): MergeConflict[];
  resetToDefaults(): void;
  hasOverrides(): boolean;

  /* ── C5: Batch operations ── */
  batchUpdateField(fiberIds: string[], field: string, value: unknown): void;
  findAndReplace(field: string, search: string, replace: string): string[];
  getAllTags(): Map<string, string[]>;
  renameTag(oldTag: string, newTag: string): string[];
  deleteTag(tag: string): string[];
  getAllCertifications(): Map<string, string[]>;

  /* ── C8: Snapshots & Changesets ── */
  createSnapshot(name: string): string;
  getSnapshots(): SnapshotMeta[];
  restoreSnapshot(id: string): void;
  deleteSnapshot(id: string): void;
  createChangeset(name: string, description: string, author: string): ChangesetEnvelope;
  getChangesets(): ChangesetEnvelope[];
  importChangeset(json: string, strategy: MergeStrategy): MergeConflict[];
  deleteChangeset(id: string): void;

  /* ── C9: Staging pipeline ── */
  getStagedChanges(): StagedChange[];
  stageChange(change: StagedChange): void;
  unstageChange(id: string): void;
  clearStaged(): void;
  commitStaged(message: string): void;
  verifyStagedChanges(): VerificationResult[];

  /* ── C12: Fiber sequence ordering ── */
  getFiberOrder(): string[] | null;
  setFiberOrder(order: string[]): void;
  clearFiberOrder(): void;
  getFiberOrderForGroup(groupId: string): string[] | null;
  setFiberOrderForGroup(groupId: string, order: string[]): void;
  clearFiberOrderForGroup(groupId: string): void;
  resolveFiberOrder(
    allIds: string[],
    options?: { groupId?: string; groupMemberIds?: string[] },
  ): string[];
}

/* ══════════════════════════════════════════════════════════
   Storage keys
   ══════════════════════════════════════════════════════════ */

const STORAGE_PREFIX = "atlas:";
const KEYS: Record<TableName, string> = {
  fibers: `${STORAGE_PREFIX}fibers`,
  worldNames: `${STORAGE_PREFIX}worldNames`,
  processData: `${STORAGE_PREFIX}processData`,
  anatomyData: `${STORAGE_PREFIX}anatomyData`,
  careData: `${STORAGE_PREFIX}careData`,
  quoteData: `${STORAGE_PREFIX}quoteData`,
};
const JOURNAL_KEY = `${STORAGE_PREFIX}journal`;
const JOURNAL_CURSOR_KEY = `${STORAGE_PREFIX}journal-cursor`;
const DELETED_FIBERS_KEY = `${STORAGE_PREFIX}deletedFiberIds`;
const MAX_JOURNAL = 200;

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

let _idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++_idCounter}`;
}

type PromotedOverridesShape = Partial<{
  fibers: Record<string, Partial<FiberProfile>>;
  worldNames: Record<string, string[]>;
  processData: Record<string, ProcessStep[]>;
  anatomyData: Record<string, AnatomyData>;
  careData: Record<string, CareData>;
  quoteData: Record<string, QuoteEntry[]>;
}>;

const promotedOverrides = (promotedOverridesRaw ?? {}) as PromotedOverridesShape;

type BundledFiberOrderFile = {
  global: string[];
  groups?: Record<string, string[]>;
};

const fiberOrderBundled: BundledFiberOrderFile = fiberOrderFileRaw as BundledFiberOrderFile;

/** Bundled fiber lookup */
const bundledFibers: FiberProfile[] = rawBundledFibers.map((fiber) =>
  JSON.parse(
    JSON.stringify(
      promotedOverrides.fibers?.[fiber.id]
        ? { ...fiber, ...promotedOverrides.fibers[fiber.id], id: fiber.id }
        : fiber,
    ),
  ) as FiberProfile,
);
const bundledFiberMap = new Map<string, FiberProfile>();
for (const f of bundledFibers) bundledFiberMap.set(f.id, f);

const bundledWorldNamesWithPromoted = promotedOverrides.worldNames
  ? { ...bundledWorldNames, ...promotedOverrides.worldNames }
  : bundledWorldNames;
const bundledProcessDataWithPromoted = promotedOverrides.processData
  ? { ...bundledProcessData, ...promotedOverrides.processData }
  : bundledProcessData;
const bundledAnatomyDataWithPromoted = promotedOverrides.anatomyData
  ? { ...bundledAnatomyData, ...promotedOverrides.anatomyData }
  : bundledAnatomyData;
const bundledCareDataWithPromoted = promotedOverrides.careData
  ? { ...bundledCareData, ...promotedOverrides.careData }
  : bundledCareData;
const bundledQuoteDataWithPromoted = promotedOverrides.quoteData
  ? { ...bundledQuoteData, ...promotedOverrides.quoteData }
  : bundledQuoteData;

function stripSustainability<T extends Record<string, unknown>>(fiber: T): T {
  // Compatibility shim: admin/editor surfaces still expect sustainability fields.
  const raw = fiber as T & {
    sustainability?: {
      environmentalRating?: number;
      waterUsage?: number;
      carbonFootprint?: number;
      chemicalProcessing?: number;
      circularity?: number;
      biodegradable?: boolean;
      recyclable?: boolean;
      certifications?: unknown;
    };
  };
  const sustainability = raw.sustainability;
  return {
    ...fiber,
    sustainability: {
      environmentalRating: sustainability?.environmentalRating ?? 2,
      waterUsage: sustainability?.waterUsage ?? 2,
      carbonFootprint: sustainability?.carbonFootprint ?? 2,
      chemicalProcessing: sustainability?.chemicalProcessing ?? 2,
      circularity: sustainability?.circularity ?? 3,
      biodegradable: sustainability?.biodegradable ?? true,
      recyclable: sustainability?.recyclable ?? false,
      certifications: Array.isArray(sustainability?.certifications)
        ? sustainability.certifications
        : [],
    },
  } as T;
}

/** Deep-ish equality for override detection */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

/* ══════════════════════════════════════════════════════════
   LocalStorageSource
   ══════════════════════════════════════════════════════════ */

export class LocalStorageSource implements AtlasDataSource {
  private listeners = new Set<() => void>();
  private version = 0;

  /* ── Cached merged data ── */
  private _fibers: FiberProfile[] | null = null;
  private _fiberMap: Map<string, FiberProfile> | null = null;
  private _worldNames: Record<string, string[]> | null = null;
  private _processData: Record<string, ProcessStep[]> | null = null;
  private _anatomyData: Record<string, AnatomyData> | null = null;
  private _careData: Record<string, CareData> | null = null;
  private _quoteData: Record<string, QuoteEntry[]> | null = null;

  /* ── C2: Journal state ── */
  private _journal: JournalEntry[] | null = null;
  private _cursor: number | null = null; // points to next redo index

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key?.startsWith(STORAGE_PREFIX)) {
          this.invalidateAll();
          this._journal = null;
          this._cursor = null;
          this.notify();
        }
      });
    }
  }

  /* ══════════════════════════════════════════════════════
     Fiber profiles
     ══════════════════════════════════════════════════════ */

  getFibers(): FiberProfile[] {
    if (this._fibers) return this._fibers;
    const deletedFiberIds = new Set(this.readJSON<string[]>(DELETED_FIBERS_KEY) ?? []);
    const overrides = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers);
    const activeBundledFibers = bundledFibers.filter((fiber) => !deletedFiberIds.has(fiber.id));
    this._fibers = activeBundledFibers.map((f) => {
      const patch = overrides?.[f.id];
      const merged = patch ? { ...f, ...patch, id: f.id } : f;
      return stripSustainability(merged as unknown as Record<string, unknown>) as unknown as FiberProfile;
    });
    this._fiberMap = null;
    return this._fibers;
  }

  getFiberById(id: string): FiberProfile | undefined {
    if (!this._fiberMap) {
      this._fiberMap = new Map(this.getFibers().map((f) => [f.id, f]));
    }
    return this._fiberMap.get(id);
  }

  updateFiber(id: string, patch: Partial<FiberProfile>): void {
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
    const sanitizedPatch = this.sanitizeFiberPatch(id, patch);
    if (Object.keys(sanitizedPatch).length === 0) return;
    const prevFiber = this.getFiberById(id);

    /* C2: Record journal entries for each changed field */
    if (prevFiber) {
      for (const [key, nextVal] of Object.entries(sanitizedPatch)) {
        if (key === "id") continue;
        const prevVal = (prevFiber as unknown as Record<string, unknown>)[key];
        if (!deepEqual(prevVal, nextVal)) {
          this.appendJournal({
            id: uid(),
            timestamp: Date.now(),
            table: "fibers",
            fiberId: id,
            field: key,
            prevValue: prevVal,
            nextValue: nextVal,
            source: "local",
          });
        }
      }
    }

    current[id] = { ...(current[id] ?? {}), ...sanitizedPatch };
    this.writeJSON(KEYS.fibers, current);
    this.invalidateAll();
    this.notify();
  }

  removeFiberOverride(id: string): void {
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
    const prevOverride = current[id];
    if (prevOverride) {
      this.appendJournal({
        id: uid(),
        timestamp: Date.now(),
        table: "fibers",
        fiberId: id,
        field: "__all__",
        prevValue: prevOverride,
        nextValue: null,
        source: "local",
      });
    }
    delete current[id];
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(KEYS.fibers);
    } else {
      this.writeJSON(KEYS.fibers, current);
    }
    this.invalidateAll();
    this.notify();
  }

  deleteFiber(id: string): void {
    const deletedIds = new Set(this.readJSON<string[]>(DELETED_FIBERS_KEY) ?? []);
    if (deletedIds.has(id)) return;
    deletedIds.add(id);
    this.writeJSON(DELETED_FIBERS_KEY, Array.from(deletedIds));

    // Clear any local overrides and supplementary records tied to this profile.
    this.removeFiberOverride(id);
    this.removeSupplementaryOverride("worldNames", id);
    this.removeSupplementaryOverride("processData", id);
    this.removeSupplementaryOverride("anatomyData", id);
    this.removeSupplementaryOverride("careData", id);
    this.removeSupplementaryOverride("quoteData", id);

    this.invalidateAll();
    this.notify();
  }

  isFiberDeleted(id: string): boolean {
    const deletedIds = new Set(this.readJSON<string[]>(DELETED_FIBERS_KEY) ?? []);
    return deletedIds.has(id);
  }

  /* ══════════════════════════════════════════════════════
     C1: Override Translucency
     ══════════════════════════════════════════════════════ */

  getBundledFiber(id: string): FiberProfile | undefined {
    const fiber = bundledFiberMap.get(id);
    if (!fiber) return undefined;
    return stripSustainability(fiber as unknown as Record<string, unknown>) as unknown as FiberProfile;
  }

  getFiberOverrideKeys(id: string): string[] {
    const overrides = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers);
    return this.getFiberOverrideKeysFrom(overrides, id);
  }

  getOverriddenFiberIds(): string[] {
    const overrides = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers);
    if (!overrides) return [];
    return Object.keys(overrides).filter((id) => {
      const keys = this.getFiberOverrideKeysFrom(overrides, id);
      return keys.length > 0;
    });
  }

  getOverrideSummary(): FiberOverrideSummary[] {
    const summaries: FiberOverrideSummary[] = [];
    const fiberOverrides = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
    const worldOverrides = this.readJSON<Record<string, string[]>>(KEYS.worldNames) ?? {};
    const processOverrides = this.readJSON<Record<string, ProcessStep[]>>(KEYS.processData) ?? {};
    const anatomyOverrides = this.readJSON<Record<string, AnatomyData>>(KEYS.anatomyData) ?? {};
    const careOverrides = this.readJSON<Record<string, CareData>>(KEYS.careData) ?? {};
    const quoteOverrides = this.readJSON<Record<string, QuoteEntry[]>>(KEYS.quoteData) ?? {};
    const supplementaryByTable: Record<TableName, Record<string, unknown>> = {
      fibers: {},
      worldNames: worldOverrides,
      processData: processOverrides,
      anatomyData: anatomyOverrides,
      careData: careOverrides,
      quoteData: quoteOverrides,
    };
    const summarized = new Set<string>();

    for (const id of Object.keys(fiberOverrides)) {
      const bundled = bundledFiberMap.get(id);
      const current = this.getFiberById(id);
      if (!bundled || !current) continue;

      const keys = this.getFiberOverrideKeysFrom(fiberOverrides, id);
      const fields = keys.map((field) => ({
        field,
        bundledValue: (bundled as unknown as Record<string, unknown>)[field],
        currentValue: (current as unknown as Record<string, unknown>)[field],
      }));

      // Check supplementary tables
      const tables: TableName[] = [];
      if (worldOverrides?.[id]) tables.push("worldNames");
      if (processOverrides?.[id]) tables.push("processData");
      if (anatomyOverrides?.[id]) tables.push("anatomyData");
      if (careOverrides?.[id]) tables.push("careData");
      if (quoteOverrides?.[id]) tables.push("quoteData");

      if (fields.length > 0 || tables.length > 0) {
        summaries.push({
          fiberId: id,
          fiberName: current.name,
          fields,
          tables,
        });
        summarized.add(id);
      }
    }

    // Also check for fibers that only have supplementary overrides
    for (const table of ["worldNames", "processData", "anatomyData", "careData", "quoteData"] as TableName[]) {
      const overrides = supplementaryByTable[table];
      for (const id of Object.keys(overrides)) {
        if (summarized.has(id)) continue;
        const fiber = this.getFiberById(id);
        summaries.push({
          fiberId: id,
          fiberName: fiber?.name ?? id,
          fields: [],
          tables: [table],
        });
        summarized.add(id);
      }
    }

    return summaries;
  }

  removeFieldOverride(fiberId: string, field: string): void {
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
    if (!current[fiberId]) return;
    const prevValue = (current[fiberId] as Record<string, unknown>)[field];
    delete (current[fiberId] as Record<string, unknown>)[field];

    this.appendJournal({
      id: uid(),
      timestamp: Date.now(),
      table: "fibers",
      fiberId,
      field,
      prevValue,
      nextValue: null,
      source: "local",
    });

    if (Object.keys(current[fiberId]).length === 0) {
      delete current[fiberId];
    }
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(KEYS.fibers);
    } else {
      this.writeJSON(KEYS.fibers, current);
    }
    this.invalidateAll();
    this.notify();
  }

  /* ══════════════════════════════════════════════════════
     Supplementary tables
     ══════════════════════════════════════════════════════ */

  getWorldNames(): Record<string, string[]> {
    if (this._worldNames) return this._worldNames;
    const overrides = this.readJSON<Record<string, string[]>>(KEYS.worldNames);
    this._worldNames = overrides ? { ...bundledWorldNamesWithPromoted, ...overrides } : bundledWorldNamesWithPromoted;
    return this._worldNames;
  }

  getProcessData(): Record<string, ProcessStep[]> {
    if (this._processData) return this._processData;
    const overrides = this.readJSON<Record<string, ProcessStep[]>>(KEYS.processData);
    this._processData = overrides ? { ...bundledProcessDataWithPromoted, ...overrides } : bundledProcessDataWithPromoted;
    return this._processData;
  }

  getAnatomyData(): Record<string, AnatomyData> {
    if (this._anatomyData) return this._anatomyData;
    const overrides = this.readJSON<Record<string, AnatomyData>>(KEYS.anatomyData);
    this._anatomyData = overrides ? { ...bundledAnatomyDataWithPromoted, ...overrides } : bundledAnatomyDataWithPromoted;
    return this._anatomyData;
  }

  getCareData(): Record<string, CareData> {
    if (this._careData) return this._careData;
    const overrides = this.readJSON<Record<string, unknown>>(KEYS.careData);
    if (!overrides) {
      this._careData = bundledCareDataWithPromoted;
      return this._careData;
    }
    const merged: Record<string, CareData> = { ...bundledCareDataWithPromoted };
    for (const [fiberId, value] of Object.entries(overrides)) {
      merged[fiberId] = this.normalizeCareData(fiberId, value);
    }
    this._careData = merged;
    return this._careData;
  }

  getQuoteData(): Record<string, QuoteEntry[]> {
    if (this._quoteData) return this._quoteData;
    const overrides = this.readJSON<Record<string, QuoteEntry[]>>(KEYS.quoteData);
    this._quoteData = overrides ? { ...bundledQuoteDataWithPromoted, ...overrides } : bundledQuoteDataWithPromoted;
    return this._quoteData;
  }

  updateWorldNames(id: string, names: string[]): void {
    const current = this.readJSON<Record<string, string[]>>(KEYS.worldNames) ?? {};
    const prev = this.getWorldNames()[id] ?? [];
    this.appendJournal({ id: uid(), timestamp: Date.now(), table: "worldNames", fiberId: id, prevValue: prev, nextValue: names, source: "local" });
    current[id] = names;
    this.writeJSON(KEYS.worldNames, current);
    this._worldNames = null;
    this.invalidateAll();
    this.notify();
  }

  updateProcessData(id: string, steps: ProcessStep[]): void {
    const current = this.readJSON<Record<string, ProcessStep[]>>(KEYS.processData) ?? {};
    const prev = this.getProcessData()[id] ?? [];
    this.appendJournal({ id: uid(), timestamp: Date.now(), table: "processData", fiberId: id, prevValue: prev, nextValue: steps, source: "local" });
    current[id] = steps;
    this.writeJSON(KEYS.processData, current);
    this._processData = null;
    this.invalidateAll();
    this.notify();
  }

  updateAnatomyData(id: string, data: AnatomyData): void {
    const current = this.readJSON<Record<string, AnatomyData>>(KEYS.anatomyData) ?? {};
    const prev = this.getAnatomyData()[id];
    this.appendJournal({ id: uid(), timestamp: Date.now(), table: "anatomyData", fiberId: id, prevValue: prev ?? null, nextValue: data, source: "local" });
    current[id] = data;
    this.writeJSON(KEYS.anatomyData, current);
    this._anatomyData = null;
    this.invalidateAll();
    this.notify();
  }

  updateCareData(id: string, data: CareData): void {
    const current = this.readJSON<Record<string, CareData>>(KEYS.careData) ?? {};
    const prev = this.getCareData()[id];
    const normalizedData = this.normalizeCareData(id, data);
    this.appendJournal({ id: uid(), timestamp: Date.now(), table: "careData", fiberId: id, prevValue: prev ?? null, nextValue: normalizedData, source: "local" });
    current[id] = normalizedData;
    this.writeJSON(KEYS.careData, current);
    this._careData = null;
    this.invalidateAll();
    this.notify();
  }

  updateQuoteData(id: string, quotes: QuoteEntry[]): void {
    const current = this.readJSON<Record<string, QuoteEntry[]>>(KEYS.quoteData) ?? {};
    const prev = this.getQuoteData()[id] ?? [];
    this.appendJournal({ id: uid(), timestamp: Date.now(), table: "quoteData", fiberId: id, prevValue: prev, nextValue: quotes, source: "local" });
    current[id] = quotes;
    this.writeJSON(KEYS.quoteData, current);
    this._quoteData = null;
    this.invalidateAll();
    this.notify();
  }

  removeSupplementaryOverride(table: TableName, fiberId: string): void {
    if (table === "fibers") return;
    const current = this.readJSON<Record<string, unknown>>(KEYS[table]) ?? {};
    if (!current[fiberId]) return;
    const prev = current[fiberId];
    this.appendJournal({ id: uid(), timestamp: Date.now(), table, fiberId, prevValue: prev, nextValue: null, source: "local" });
    delete current[fiberId];
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(KEYS[table]);
    } else {
      this.writeJSON(KEYS[table], current);
    }
    this.invalidateAll();
    this.notify();
  }

  /* ══════════════════════════════════════════════════════
     C2: Operation Journal
     ══════════════════════════════════════════════════════ */

  getJournal(): JournalEntry[] {
    if (this._journal) return this._journal;
    this._journal = this.readJSON<JournalEntry[]>(JOURNAL_KEY) ?? [];
    return this._journal;
  }

  private getJournalCursor(): number {
    if (this._cursor !== null) return this._cursor;
    const stored = this.readJSON<number>(JOURNAL_CURSOR_KEY);
    this._cursor = stored ?? this.getJournal().length;
    return this._cursor;
  }

  private setJournalCursor(cursor: number): void {
    this._cursor = cursor;
    this.writeJSON(JOURNAL_CURSOR_KEY, cursor);
  }

  private appendJournal(entry: JournalEntry): void {
    const journal = [...this.getJournal()];
    const cursor = this.getJournalCursor();

    // Truncate any redo entries beyond cursor
    journal.splice(cursor);

    journal.push(entry);

    // Compact if exceeding max
    if (journal.length > MAX_JOURNAL) {
      journal.splice(0, journal.length - MAX_JOURNAL);
    }

    this._journal = journal;
    this.writeJSON(JOURNAL_KEY, journal);
    this.setJournalCursor(journal.length);
  }

  canUndo(): boolean {
    return this.getJournalCursor() > 0;
  }

  canRedo(): boolean {
    return this.getJournalCursor() < this.getJournal().length;
  }

  undo(): JournalEntry | null {
    const cursor = this.getJournalCursor();
    if (cursor <= 0) return null;
    const journal = this.getJournal();
    const entry = journal[cursor - 1];
    this.setJournalCursor(cursor - 1);
    this.applyJournalEntry(entry, "undo");
    return entry;
  }

  redo(): JournalEntry | null {
    const cursor = this.getJournalCursor();
    const journal = this.getJournal();
    if (cursor >= journal.length) return null;
    const entry = journal[cursor];
    this.setJournalCursor(cursor + 1);
    this.applyJournalEntry(entry, "redo");
    return entry;
  }

  clearJournal(): void {
    this._journal = [];
    this._cursor = 0;
    localStorage.removeItem(JOURNAL_KEY);
    localStorage.removeItem(JOURNAL_CURSOR_KEY);
    this.notify();
  }

  private applyJournalEntry(entry: JournalEntry, direction: "undo" | "redo"): void {
    const value = direction === "undo" ? entry.prevValue : entry.nextValue;

    if (entry.table === "fibers") {
      if (entry.field === "__all__") {
        // Full fiber override add/remove
        const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
        if (value === null) {
          delete current[entry.fiberId];
        } else {
          current[entry.fiberId] = value as Partial<FiberProfile>;
        }
        if (Object.keys(current).length === 0) {
          localStorage.removeItem(KEYS.fibers);
        } else {
          this.writeJSON(KEYS.fibers, current);
        }
      } else if (entry.field) {
        const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
        if (value === null) {
          // Removing a field override → check bundled default
          if (current[entry.fiberId]) {
            delete (current[entry.fiberId] as Record<string, unknown>)[entry.field];
            if (Object.keys(current[entry.fiberId]).length === 0) {
              delete current[entry.fiberId];
            }
          }
        } else {
          if (!current[entry.fiberId]) current[entry.fiberId] = {};
          (current[entry.fiberId] as Record<string, unknown>)[entry.field] = value;
        }
        if (Object.keys(current).length === 0) {
          localStorage.removeItem(KEYS.fibers);
        } else {
          this.writeJSON(KEYS.fibers, current);
        }
      }
    } else {
      // Supplementary table
      const key = KEYS[entry.table];
      const current = this.readJSON<Record<string, unknown>>(key) ?? {};
      if (value === null) {
        delete current[entry.fiberId];
      } else {
        current[entry.fiberId] = value;
      }
      if (Object.keys(current).length === 0) {
        localStorage.removeItem(key);
      } else {
        this.writeJSON(key, current);
      }
    }

    this.invalidateAll();
    this.notify();
  }

  /* ══════════════════════════════════════════════════════
     Reactivity
     ══════════════════════════════════════════════════════ */

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getVersion(): number {
    return this.version;
  }

  /* ══════════════════════════════════════════════════════
     Import / Export / Merge (C7)
     ══════════════════════════════════════════════════════ */

  exportJSON(): string {
    const snapshot: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw) snapshot[name] = JSON.parse(raw);
    }
    return JSON.stringify(snapshot, null, 2);
  }

  /** C7: Export only fields that truly differ from bundled defaults */
  exportDiffJSON(): string {
    const diff: Record<string, unknown> = {};

    // Fiber overrides — only include fields that differ
    const fiberOverrides = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers);
    if (fiberOverrides) {
      const cleanFibers: Record<string, Partial<FiberProfile>> = {};
      for (const [id, patch] of Object.entries(fiberOverrides)) {
        const bundled = bundledFiberMap.get(id);
        if (!bundled) { cleanFibers[id] = patch; continue; }
        const cleanPatch: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(patch as unknown as Record<string, unknown>)) {
          if (key === "id") continue;
          if (!deepEqual(val, (bundled as unknown as Record<string, unknown>)[key])) {
            cleanPatch[key] = val;
          }
        }
        if (Object.keys(cleanPatch).length > 0) {
          cleanFibers[id] = cleanPatch as Partial<FiberProfile>;
        }
      }
      if (Object.keys(cleanFibers).length > 0) {
        diff.fibers = cleanFibers;
      }
    }

    // Supplementary tables — include if they differ from bundled
    const suppTables: Array<{ name: string; key: string; bundled: Record<string, unknown> }> = [
      { name: "worldNames", key: KEYS.worldNames, bundled: bundledWorldNamesWithPromoted },
      { name: "processData", key: KEYS.processData, bundled: bundledProcessDataWithPromoted },
      { name: "anatomyData", key: KEYS.anatomyData, bundled: bundledAnatomyDataWithPromoted },
      { name: "careData", key: KEYS.careData, bundled: bundledCareDataWithPromoted },
      { name: "quoteData", key: KEYS.quoteData, bundled: bundledQuoteDataWithPromoted },
    ];

    for (const { name, key, bundled } of suppTables) {
      const overrides = this.readJSON<Record<string, unknown>>(key);
      if (!overrides) continue;
      const cleanOverrides: Record<string, unknown> = {};
      for (const [id, val] of Object.entries(overrides)) {
        if (!deepEqual(val, bundled[id])) {
          cleanOverrides[id] = val;
        }
      }
      if (Object.keys(cleanOverrides).length > 0) {
        diff[name] = cleanOverrides;
      }
    }

    return JSON.stringify(diff, null, 2);
  }

  exportEffectiveJSON(): string {
    const fiberList = this.getFibers();
    const fibers: Record<string, FiberProfile> = {};
    for (const f of fiberList) {
      fibers[f.id] = f;
    }

    const deletedFiberIds = this.readJSON<string[]>(DELETED_FIBERS_KEY) ?? [];
    const order = this.getFiberOrder();
    const rawGroupOrders = this.readJSON<Record<string, string[]>>(this.FIBER_GROUP_ORDERS_KEY) ?? {};
    const fiberOrderByGroup: Record<string, string[]> = {};
    for (const [groupId, ids] of Object.entries(rawGroupOrders)) {
      const sanitized = this.sanitizeOrder(ids);
      if (sanitized.length > 0) {
        fiberOrderByGroup[groupId] = sanitized;
      }
    }

    const snapshot: EffectiveAtlasSnapshot = {
      meta: {
        kind: "atlas-effective-snapshot",
        version: 1,
        exportedAt: new Date().toISOString(),
        fiberCount: fiberList.length,
        deletedFiberIds,
        importNote:
          "Full merged catalog — not for Admin Import JSON. importJSON expects override-shaped patches per fiber; use the storage export or exportDiffJSON() to round-trip overrides.",
      },
      fibers,
      worldNames: this.getWorldNames(),
      processData: this.getProcessData(),
      anatomyData: this.getAnatomyData(),
      careData: this.getCareData(),
      quoteData: this.getQuoteData(),
    };

    if (order && order.length > 0) {
      snapshot.fiberOrder = order;
    }
    if (Object.keys(fiberOrderByGroup).length > 0) {
      snapshot.fiberOrderByGroup = fiberOrderByGroup;
    }

    return JSON.stringify(snapshot, null, 2);
  }

  importJSON(json: string): void {
    const data = JSON.parse(json) as Record<string, unknown>;
    // Snapshot for undo
    this.appendJournal({
      id: uid(),
      timestamp: Date.now(),
      table: "fibers",
      fiberId: "__import__",
      field: "__snapshot__",
      prevValue: this.exportJSON(),
      nextValue: json,
      source: "local",
    });

    for (const [name, key] of Object.entries(KEYS)) {
      const incoming = data[name];
      if (incoming === undefined || incoming === null || typeof incoming !== "object") continue;

      if (name === "fibers") {
        const sanitizedFibers: Record<string, Partial<FiberProfile>> = {};
        for (const [id, patch] of Object.entries(incoming as Record<string, unknown>)) {
          const sanitizedPatch = this.sanitizeFiberPatch(id, patch);
          if (Object.keys(sanitizedPatch).length > 0) {
            sanitizedFibers[id] = sanitizedPatch;
          }
        }
        const incomingFiberCount = Object.keys(incoming as Record<string, unknown>).length;
        if (Object.keys(sanitizedFibers).length > 0 || incomingFiberCount === 0) {
          localStorage.setItem(key, JSON.stringify(sanitizedFibers));
        }
        continue;
      }

      if (name === "careData") {
        const normalizedCare: Record<string, CareData> = {};
        for (const [id, value] of Object.entries(incoming as Record<string, unknown>)) {
          normalizedCare[id] = this.normalizeCareData(id, value);
        }
        localStorage.setItem(key, JSON.stringify(normalizedCare));
        continue;
      }

      localStorage.setItem(key, JSON.stringify(incoming));
    }
    this.invalidateAll();
    this.notify();
  }

  /** C7: Conflict-aware merge */
  merge(json: string, strategy: MergeStrategy): MergeConflict[] {
    const remote = JSON.parse(json) as Record<string, unknown>;
    const conflicts: MergeConflict[] = [];

    // Merge fiber overrides
    if (remote.fibers) {
      const local = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
      const remoteFibers = remote.fibers as Record<string, unknown>;

      for (const [id, remotePatch] of Object.entries(remoteFibers)) {
        const sanitizedRemotePatch = this.sanitizeFiberPatch(id, remotePatch);
        if (Object.keys(sanitizedRemotePatch).length === 0) continue;
        const localPatch = local[id];
        if (!localPatch) {
          // No local override — accept remote
          local[id] = sanitizedRemotePatch;
          continue;
        }

        // Check field-level conflicts
        for (const [field, remoteVal] of Object.entries(sanitizedRemotePatch as Record<string, unknown>)) {
          const localVal = (localPatch as Record<string, unknown>)[field];
          if (localVal !== undefined && !deepEqual(localVal, remoteVal)) {
            const bundled = bundledFiberMap.get(id);
            const bundledVal = bundled ? (bundled as unknown as Record<string, unknown>)[field] : undefined;
            conflicts.push({ table: "fibers", fiberId: id, field, localValue: localVal, remoteValue: remoteVal, bundledValue: bundledVal });

            if (strategy === "remote-wins") {
              (local[id] as unknown as Record<string, unknown>)[field] = remoteVal;
            }
            // "local-wins" → keep local; "manual" → keep local, return conflicts
          } else if (localVal === undefined) {
            (local[id] as unknown as Record<string, unknown>)[field] = remoteVal;
          }
        }
      }
      this.writeJSON(KEYS.fibers, local);
    }

    // Merge supplementary tables (entry-level, not field-level)
    for (const table of ["worldNames", "processData", "anatomyData", "careData", "quoteData"] as TableName[]) {
      if (!remote[table]) continue;
      const local = this.readJSON<Record<string, unknown>>(KEYS[table]) ?? {};
      const remoteEntries = remote[table] as Record<string, unknown>;

      for (const [id, remoteVal] of Object.entries(remoteEntries)) {
        if (local[id] !== undefined && !deepEqual(local[id], remoteVal)) {
          conflicts.push({ table, fiberId: id, localValue: local[id], remoteValue: remoteVal, bundledValue: undefined });
          if (strategy === "remote-wins") {
            local[id] = remoteVal;
          }
        } else if (local[id] === undefined) {
          local[id] = remoteVal;
        }
      }
      this.writeJSON(KEYS[table], local);
    }

    this.invalidateAll();
    this.notify();
    return conflicts;
  }

  resetToDefaults(): void {
    // Snapshot for undo
    if (this.hasOverrides()) {
      this.appendJournal({
        id: uid(),
        timestamp: Date.now(),
        table: "fibers",
        fiberId: "__reset__",
        field: "__snapshot__",
        prevValue: this.exportJSON(),
        nextValue: null,
        source: "local",
      });
    }

    for (const key of Object.values(KEYS)) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(DELETED_FIBERS_KEY);
    this.invalidateAll();
    this.notify();
  }

  hasOverrides(): boolean {
    if (!isAdminEnabled()) return false;
    return (
      Object.values(KEYS).some((key) => localStorage.getItem(key) !== null) ||
      localStorage.getItem(DELETED_FIBERS_KEY) !== null
    );
  }

  /* ══════════════════════════════════════════════════════
     C5: Batch Operations
     ══════════════════════════════════════════════════════ */

  batchUpdateField(fiberIds: string[], field: string, value: unknown): void {
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};
    for (const id of fiberIds) {
      const prev = this.getFiberById(id);
      if (prev) {
        this.appendJournal({
          id: uid(),
          timestamp: Date.now(),
          table: "fibers",
          fiberId: id,
          field,
          prevValue: (prev as unknown as Record<string, unknown>)[field],
          nextValue: value,
          source: "local",
        });
      }
      if (!current[id]) current[id] = {};
      (current[id] as Record<string, unknown>)[field] = value;
    }
    this.writeJSON(KEYS.fibers, current);
    this.invalidateAll();
    this.notify();
  }

  findAndReplace(field: string, search: string, replace: string): string[] {
    const affected: string[] = [];
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};

    for (const fiber of this.getFibers()) {
      const val = (fiber as unknown as Record<string, unknown>)[field];
      if (typeof val === "string" && val.includes(search)) {
        const newVal = val.replaceAll(search, replace);
        this.appendJournal({
          id: uid(),
          timestamp: Date.now(),
          table: "fibers",
          fiberId: fiber.id,
          field,
          prevValue: val,
          nextValue: newVal,
          source: "local",
        });
        if (!current[fiber.id]) current[fiber.id] = {};
        (current[fiber.id] as unknown as Record<string, unknown>)[field] = newVal;
        affected.push(fiber.id);
      } else if (Array.isArray(val) && val.some((v) => typeof v === "string" && v.includes(search))) {
        const newVal = val.map((v) => (typeof v === "string" ? v.replaceAll(search, replace) : v));
        this.appendJournal({
          id: uid(),
          timestamp: Date.now(),
          table: "fibers",
          fiberId: fiber.id,
          field,
          prevValue: val,
          nextValue: newVal,
          source: "local",
        });
        if (!current[fiber.id]) current[fiber.id] = {};
        (current[fiber.id] as unknown as Record<string, unknown>)[field] = newVal;
        affected.push(fiber.id);
      }
    }

    if (affected.length > 0) {
      this.writeJSON(KEYS.fibers, current);
      this.invalidateAll();
      this.notify();
    }
    return affected;
  }

  getAllTags(): Map<string, string[]> {
    const tagMap = new Map<string, string[]>();
    for (const fiber of this.getFibers()) {
      for (const tag of fiber.tags) {
        const existing = tagMap.get(tag) ?? [];
        existing.push(fiber.id);
        tagMap.set(tag, existing);
      }
    }
    return tagMap;
  }

  renameTag(oldTag: string, newTag: string): string[] {
    const affected: string[] = [];
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};

    for (const fiber of this.getFibers()) {
      if (fiber.tags.includes(oldTag)) {
        const newTags = fiber.tags.map((t) => (t === oldTag ? newTag : t));
        // Deduplicate
        const uniqueTags = [...new Set(newTags)];
        this.appendJournal({
          id: uid(), timestamp: Date.now(), table: "fibers", fiberId: fiber.id,
          field: "tags", prevValue: fiber.tags, nextValue: uniqueTags, source: "local",
        });
        if (!current[fiber.id]) current[fiber.id] = {};
        current[fiber.id].tags = uniqueTags;
        affected.push(fiber.id);
      }
    }

    if (affected.length > 0) {
      this.writeJSON(KEYS.fibers, current);
      this.invalidateAll();
      this.notify();
    }
    return affected;
  }

  deleteTag(tag: string): string[] {
    const affected: string[] = [];
    const current = this.readJSON<Record<string, Partial<FiberProfile>>>(KEYS.fibers) ?? {};

    for (const fiber of this.getFibers()) {
      if (fiber.tags.includes(tag)) {
        const newTags = fiber.tags.filter((t) => t !== tag);
        this.appendJournal({
          id: uid(), timestamp: Date.now(), table: "fibers", fiberId: fiber.id,
          field: "tags", prevValue: fiber.tags, nextValue: newTags, source: "local",
        });
        if (!current[fiber.id]) current[fiber.id] = {};
        current[fiber.id].tags = newTags;
        affected.push(fiber.id);
      }
    }

    if (affected.length > 0) {
      this.writeJSON(KEYS.fibers, current);
      this.invalidateAll();
      this.notify();
    }
    return affected;
  }

  getAllCertifications(): Map<string, string[]> {
    return new Map();
  }

  /* ══════════════════════════════════════════════════════
     C8: Snapshots & Changesets
     ══════════════════════════════════════════════════════ */

  private SNAPSHOT_KEY = `${STORAGE_PREFIX}snapshots`;
  private CHANGESET_KEY = `${STORAGE_PREFIX}changesets`;

  createSnapshot(name: string): string {
    const id = uid();
    const snapshot: SnapshotMeta = {
      id,
      name,
      timestamp: Date.now(),
      overrideCount: this.getOverrideSummary().length,
    };
    const data = this.exportJSON();
    const snapshots = this.readJSON<SnapshotMeta[]>(this.SNAPSHOT_KEY) ?? [];
    snapshots.push(snapshot);
    this.writeJSON(this.SNAPSHOT_KEY, snapshots);
    this.writeRaw(`${STORAGE_PREFIX}snapshot-${id}`, data);
    this.notify();
    return id;
  }

  getSnapshots(): SnapshotMeta[] {
    return this.readJSON<SnapshotMeta[]>(this.SNAPSHOT_KEY) ?? [];
  }

  restoreSnapshot(id: string): void {
    const key = `${STORAGE_PREFIX}snapshot-${id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    // Support both legacy JSON-stringified payloads and raw snapshot strings.
    const maybeString = this.readJSON<string>(key);
    if (typeof maybeString === "string") {
      this.importJSON(maybeString);
      return;
    }
    if (raw.trim().startsWith("{")) {
      this.importJSON(raw);
    }
  }

  deleteSnapshot(id: string): void {
    const snapshots = this.readJSON<SnapshotMeta[]>(this.SNAPSHOT_KEY) ?? [];
    const index = snapshots.findIndex((s) => s.id === id);
    if (index >= 0) {
      snapshots.splice(index, 1);
      this.writeJSON(this.SNAPSHOT_KEY, snapshots);
      localStorage.removeItem(`${STORAGE_PREFIX}snapshot-${id}`);
      this.notify();
    }
  }

  createChangeset(name: string, description: string, author: string): ChangesetEnvelope {
    const id = uid();
    const diff = this.exportDiffJSON();
    const stats = this.calculateChangesetStats(diff);
    const changeset: ChangesetEnvelope = {
      id,
      name,
      description,
      author,
      createdAt: new Date().toISOString(),
      fiberIds: this.getOverriddenFiberIds(),
      data: diff,
      stats,
    };
    const changesets = this.readJSON<ChangesetEnvelope[]>(this.CHANGESET_KEY) ?? [];
    changesets.push(changeset);
    this.writeJSON(this.CHANGESET_KEY, changesets);
    this.notify();
    return changeset;
  }

  getChangesets(): ChangesetEnvelope[] {
    return this.readJSON<ChangesetEnvelope[]>(this.CHANGESET_KEY) ?? [];
  }

  importChangeset(json: string, strategy: MergeStrategy): MergeConflict[] {
    const changeset = JSON.parse(json) as ChangesetEnvelope;
    return this.merge(changeset.data, strategy);
  }

  deleteChangeset(id: string): void {
    const changesets = this.readJSON<ChangesetEnvelope[]>(this.CHANGESET_KEY) ?? [];
    const index = changesets.findIndex((c) => c.id === id);
    if (index >= 0) {
      changesets.splice(index, 1);
      this.writeJSON(this.CHANGESET_KEY, changesets);
      this.notify();
    }
  }

  private calculateChangesetStats(diff: string): { fields: number; tables: number; fibers: number } {
    const data = JSON.parse(diff) as Record<string, unknown>;
    let fields = 0;
    let tables = 0;
    let fibers = 0;

    if (data.fibers) {
      const fiberData = data.fibers as Record<string, Partial<FiberProfile>>;
      fibers = Object.keys(fiberData).length;
      for (const patch of Object.values(fiberData)) {
        fields += Object.keys(patch).length;
      }
    }

    const suppTables: TableName[] = ["worldNames", "processData", "anatomyData", "careData", "quoteData"];
    for (const table of suppTables) {
      if (data[table]) {
        tables++;
        const tableData = data[table] as Record<string, unknown>;
        fields += Object.keys(tableData).length;
      }
    }

    return { fields, tables, fibers };
  }

  /* ══════════════════════════════════════════════════════
     C9: Staging pipeline
     ══════════════════════════════════════════════════════ */

  private STAGE_KEY = `${STORAGE_PREFIX}stage`;

  getStagedChanges(): StagedChange[] {
    return this.readJSON<StagedChange[]>(this.STAGE_KEY) ?? [];
  }

  stageChange(change: StagedChange): void {
    const staged = this.readJSON<StagedChange[]>(this.STAGE_KEY) ?? [];
    staged.push(change);
    this.writeJSON(this.STAGE_KEY, staged);
    this.notify();
  }

  unstageChange(id: string): void {
    const staged = this.readJSON<StagedChange[]>(this.STAGE_KEY) ?? [];
    const index = staged.findIndex((c) => c.id === id);
    if (index >= 0) {
      staged.splice(index, 1);
      this.writeJSON(this.STAGE_KEY, staged);
      this.notify();
    }
  }

  clearStaged(): void {
    localStorage.removeItem(this.STAGE_KEY);
    this.notify();
  }

  commitStaged(message: string): void {
    const staged = this.readJSON<StagedChange[]>(this.STAGE_KEY) ?? [];
    for (const change of staged) {
      if (change.table === "fibers") {
        if (change.field) {
          this.updateFiber(change.fiberId, { [change.field]: change.newValue });
        } else {
          this.updateFiber(change.fiberId, change.newValue as Partial<FiberProfile>);
        }
      } else {
        this.updateTable(change.table, change.fiberId, change.newValue);
      }
    }
    this.clearStaged();
    this.notify();
  }

  verifyStagedChanges(): VerificationResult[] {
    const staged = this.readJSON<StagedChange[]>(this.STAGE_KEY) ?? [];
    const results: VerificationResult[] = [];

    for (const change of staged) {
      const fiber = this.getFiberById(change.fiberId);
      if (!fiber) continue;

      const result: VerificationResult = {
        fiberId: change.fiberId,
        fiberName: fiber.name,
        severity: "pass",
        category: "staging",
        message: "Change verified",
      };

      // Add your verification logic here
      // For example, check if a field value meets certain criteria

      results.push(result);
    }

    return results;
  }

  private updateTable(table: TableName, fiberId: string, value: unknown): void {
    switch (table) {
      case "worldNames":
        this.updateWorldNames(fiberId, value as string[]);
        break;
      case "processData":
        this.updateProcessData(fiberId, value as ProcessStep[]);
        break;
      case "anatomyData":
        this.updateAnatomyData(fiberId, value as AnatomyData);
        break;
      case "careData":
        this.updateCareData(fiberId, value as CareData);
        break;
      case "quoteData":
        this.updateQuoteData(fiberId, value as QuoteEntry[]);
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  /* ══════════════════════════════════════════════════════
     C12: Fiber sequence ordering
     ══════════════════════════════════════════════════════ */

  private FIBER_ORDER_KEY = `${STORAGE_PREFIX}fiber-order`;
  private FIBER_GROUP_ORDERS_KEY = `${STORAGE_PREFIX}fiber-order-groups`;

  private sanitizeOrder(order: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of order) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  }

  private applyPreferredOrder(baseIds: string[], preferred: string[] | null): string[] {
    if (!preferred || preferred.length === 0) return [...baseIds];
    const baseSet = new Set(baseIds);
    const ordered = preferred.filter((id) => baseSet.has(id));
    const orderedSet = new Set(ordered);
    const remaining = baseIds.filter((id) => !orderedSet.has(id));
    return [...ordered, ...remaining];
  }

  getFiberOrder(): string[] | null {
    const fromFile =
      fiberOrderBundled.global?.length > 0 ? this.sanitizeOrder(fiberOrderBundled.global) : null;
    if (!isAdminEnabled()) {
      return fromFile;
    }
    const fromStorage = this.readJSON<string[]>(this.FIBER_ORDER_KEY);
    if (fromStorage && fromStorage.length > 0) {
      return this.sanitizeOrder(fromStorage);
    }
    return fromFile;
  }

  setFiberOrder(order: string[]): void {
    const sanitized = this.sanitizeOrder(order);
    this.writeJSON(this.FIBER_ORDER_KEY, sanitized);
    this.invalidateAll();
    this.notify();
    if (typeof window !== "undefined" && import.meta.env.DEV && isAdminEnabled()) {
      void import("../utils/admin/persistFiberOrderFile").then((m) => m.persistGlobalFiberOrder(sanitized));
    }
  }

  clearFiberOrder(): void {
    localStorage.removeItem(this.FIBER_ORDER_KEY);
    this.notify();
  }

  getFiberOrderForGroup(groupId: string): string[] | null {
    if (!groupId) return null;
    const fromFile = fiberOrderBundled.groups?.[groupId];
    const fileOrder = fromFile?.length ? this.sanitizeOrder(fromFile) : null;
    if (!isAdminEnabled()) {
      return fileOrder;
    }
    const groups = this.readJSON<Record<string, string[]>>(this.FIBER_GROUP_ORDERS_KEY) ?? {};
    const fromStorage = groups[groupId];
    if (fromStorage && fromStorage.length > 0) {
      return this.sanitizeOrder(fromStorage);
    }
    return fileOrder;
  }

  setFiberOrderForGroup(groupId: string, order: string[]): void {
    if (!groupId) return;
    const groups = this.readJSON<Record<string, string[]>>(this.FIBER_GROUP_ORDERS_KEY) ?? {};
    const nextSan = this.sanitizeOrder(order);
    groups[groupId] = nextSan;
    this.writeJSON(this.FIBER_GROUP_ORDERS_KEY, groups);
    this.notify();
    if (typeof window !== "undefined" && import.meta.env.DEV && isAdminEnabled()) {
      void import("../utils/admin/persistFiberOrderFile").then((m) =>
        m.persistFiberOrderGroupsPatch({ [groupId]: nextSan }),
      );
    }
  }

  clearFiberOrderForGroup(groupId: string): void {
    if (!groupId) return;
    const groups = this.readJSON<Record<string, string[]>>(this.FIBER_GROUP_ORDERS_KEY) ?? {};
    if (!(groupId in groups)) return;
    delete groups[groupId];
    if (Object.keys(groups).length === 0) {
      localStorage.removeItem(this.FIBER_GROUP_ORDERS_KEY);
    } else {
      this.writeJSON(this.FIBER_GROUP_ORDERS_KEY, groups);
    }
    this.notify();
  }

  resolveFiberOrder(
    allIds: string[],
    options?: { groupId?: string; groupMemberIds?: string[] },
  ): string[] {
    const baseIds = this.sanitizeOrder(allIds);
    const globalResolved = this.applyPreferredOrder(baseIds, this.getFiberOrder());
    const groupId = options?.groupId;
    if (!groupId) return globalResolved;

    const members = this.sanitizeOrder(options?.groupMemberIds ?? []);
    if (members.length === 0) return globalResolved;
    const memberSet = new Set(members);
    const orderedMembers = this.applyPreferredOrder(members, this.getFiberOrderForGroup(groupId));

    const output: string[] = [];
    let memberCursor = 0;
    for (const id of globalResolved) {
      if (memberSet.has(id)) {
        output.push(orderedMembers[memberCursor++]);
      } else {
        output.push(id);
      }
    }
    return output;
  }

  /* ══════════════════════════════════════════════════════
     Internal helpers
     ══════════════════════════════════════════════════════ */

  private readJSON<T>(key: string): T | null {
    /* Public builds (VITE_ENABLE_ADMIN=false): catalog must match Git — ignore draft localStorage. */
    if (!isAdminEnabled() && key.startsWith(STORAGE_PREFIX)) {
      return null;
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private writeJSON(key: string, value: unknown): void {
    this.writeRaw(key, JSON.stringify(value));
  }

  private writeRaw(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[atlas:data-provider] Failed to persist "${key}" to localStorage: ${message}`);
    }
  }

  private getFiberOverrideKeysFrom(
    overrides: Record<string, Partial<FiberProfile>> | null,
    id: string,
  ): string[] {
    if (!overrides || !overrides[id]) return [];
    const patch = overrides[id];
    const bundled = bundledFiberMap.get(id);
    if (!bundled) return Object.keys(patch);
    // Only return keys whose values actually differ from bundled
    return Object.keys(patch).filter((key) => {
      const patchVal = (patch as unknown as Record<string, unknown>)[key];
      const bundledVal = (bundled as unknown as Record<string, unknown>)[key];
      return !deepEqual(patchVal, bundledVal);
    });
  }

  private invalidateAll(): void {
    this._fibers = null;
    this._fiberMap = null;
    this._worldNames = null;
    this._processData = null;
    this._anatomyData = null;
    this._careData = null;
    this._quoteData = null;
    this.version++;
  }

  private getFallbackCareData(id: string): CareData {
    return bundledCareDataWithPromoted[id] ?? {
      washTemp: "",
      dryMethod: "",
      ironTemp: "",
      specialNotes: "",
    };
  }

  private normalizeCareData(id: string, value: unknown): CareData {
    const base = this.getFallbackCareData(id);
    if (!value || typeof value !== "object") return { ...base };
    const raw = value as Record<string, unknown>;
    return {
      washTemp: typeof raw.washTemp === "string" ? raw.washTemp : base.washTemp,
      dryMethod: typeof raw.dryMethod === "string" ? raw.dryMethod : base.dryMethod,
      ironTemp: typeof raw.ironTemp === "string" ? raw.ironTemp : base.ironTemp,
      specialNotes: typeof raw.specialNotes === "string" ? raw.specialNotes : base.specialNotes,
    };
  }

  private sanitizeFiberPatch(id: string, patch: unknown): Partial<FiberProfile> {
    if (!patch || typeof patch !== "object") return {};
    const raw = patch as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(raw)) {
      if (field === "id") continue;
      if (field === "sustainability") continue;
      if (field === "schemaVersion") {
        if (typeof value === "number" && Number.isFinite(value)) {
          sanitized.schemaVersion = value;
        }
        continue;
      }
      sanitized[field] = value;
    }

    const bundled = this.getBundledFiber(id);
    if (
      bundled &&
      typeof sanitized.schemaVersion === "number" &&
      sanitized.schemaVersion < bundled.schemaVersion
    ) {
      sanitized.schemaVersion = bundled.schemaVersion;
    }

    // Keep profile hero image aligned with galleryImages[0] whenever gallery is patched.
    if ("galleryImages" in sanitized) {
      const galleryImages = sanitized.galleryImages;
      if (Array.isArray(galleryImages)) {
        const firstUrl = galleryImages[0]?.url;
        sanitized.image = typeof firstUrl === "string" ? firstUrl : "";
      }
    }

    return sanitized as Partial<FiberProfile>;
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }
}


/* ══════════════════════════════════════════════════════════
   Validation helpers
   ══════════════════════════════════════════════════════════ */

export function validateFiberProfile(f: unknown): f is FiberProfile {
  if (!f || typeof f !== "object") return false;
  const profile = f as Record<string, unknown>;
  return (
    typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.schemaVersion === "number" &&
    Array.isArray(profile.regions) &&
    typeof profile.translationCount === "number" &&
    typeof profile.priceRange === "object" && profile.priceRange !== null &&
    typeof profile.typicalMOQ === "object" && profile.typicalMOQ !== null &&
    typeof profile.leadTime === "object" && profile.leadTime !== null
  );
}

/* ══════════════════════════════════════════════════════════
   Singleton
   ══════════════════════════════════════════════════════════ */

export const dataSource = new LocalStorageSource();