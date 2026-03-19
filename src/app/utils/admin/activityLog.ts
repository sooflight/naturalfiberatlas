import { useSyncExternalStore, useCallback, useMemo } from "react";

// ── Types ──

export type ActivityAction =
  | "create" | "update" | "delete" | "import" | "export"
  | "ai-generate" | "bulk-op" | "link" | "unlink";

export type ActivityEntityType =
  | "image" | "node" | "passport" | "supplier"
  | "evidence" | "link" | "settings";

export interface ActivityEvent {
  id: string;
  timestamp: string;
  tab: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  summary: string;
  detail?: Record<string, any>;
}

export interface ActivityFilter {
  tab?: string;
  action?: ActivityAction;
  entityType?: ActivityEntityType;
  since?: string;
  limit?: number;
}

// ── Storage ──

const STORAGE_KEY = "atlas-activity-log";
const MAX_EVENTS = 500;

let _cache: ActivityEvent[] | null = null;
let _version = 0;
const _listeners = new Set<() => void>();

function notifyListeners() {
  _version++;
  _listeners.forEach((fn) => fn());
}

function readAll(): ActivityEvent[] {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch {
    _cache = [];
  }
  return _cache!;
}

function persist(events: ActivityEvent[]) {
  _cache = events;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  notifyListeners();
}

// ── Public API ──

let _idCounter = 0;

function makeId(): string {
  _idCounter++;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function logActivity(
  event: Omit<ActivityEvent, "id" | "timestamp">,
): ActivityEvent {
  const full: ActivityEvent = {
    ...event,
    id: makeId(),
    timestamp: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(full);
  if (all.length > MAX_EVENTS) all.length = MAX_EVENTS;
  persist(all);
  return full;
}

export function getActivityLog(filter?: ActivityFilter): ActivityEvent[] {
  let events = readAll();
  if (!filter) return events;
  if (filter.tab) events = events.filter((e) => e.tab === filter.tab);
  if (filter.action) events = events.filter((e) => e.action === filter.action);
  if (filter.entityType) events = events.filter((e) => e.entityType === filter.entityType);
  if (filter.since) {
    const cutoff = new Date(filter.since).getTime();
    events = events.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  }
  if (filter.limit) events = events.slice(0, filter.limit);
  return events;
}

export function clearActivityLog() {
  persist([]);
}

export function getActivityCount(since?: string): number {
  if (!since) return readAll().length;
  const cutoff = new Date(since).getTime();
  return readAll().filter((e) => new Date(e.timestamp).getTime() >= cutoff).length;
}

// ── Cross-tab sync ──

let _storageHandler: ((e: StorageEvent) => void) | null = null;

function setupStorageListener() {
  if (typeof window === "undefined") return null;
  if (_storageHandler) return _storageHandler; // Already set up

  _storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      _cache = null;
      notifyListeners();
    }
  };
  window.addEventListener("storage", _storageHandler);
  return _storageHandler;
}

function cleanupStorageListener() {
  if (typeof window === "undefined" || !_storageHandler) return;
  window.removeEventListener("storage", _storageHandler);
  _storageHandler = null;
}

// ── React Hook ──

function subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function getSnapshot() { return _version; }

export function useActivityLog(filter?: ActivityFilter) {
  useSyncExternalStore(subscribe, getSnapshot);

  // Setup/cleanup cross-tab storage listener
  useMemo(() => setupStorageListener(), []);

  const events = useMemo(() => getActivityLog(filter), [filter]);

  const log = useCallback(
    (event: Omit<ActivityEvent, "id" | "timestamp">) => logActivity(event),
    [],
  );

  return { events, log, clear: clearActivityLog };
}

// Export cleanup for testing and hot-reloading scenarios
export { cleanupStorageListener };
