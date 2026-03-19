type StorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem">;

const ATLAS_STORAGE_PREFIXES = ["atlas:", "atlas-"];
const SESSION_SYNC_KEY = "atlas:dev-sync-from-3000";

function isAtlasStorageKey(key: string): boolean {
  return ATLAS_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function extractAtlasStorageEntries(storage: StorageLike): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isAtlasStorageKey(key)) continue;
    const value = storage.getItem(key);
    if (typeof value !== "string") continue;
    entries[key] = value;
  }
  return entries;
}

export function applyAtlasStorageEntries(
  storage: Pick<Storage, "setItem">,
  entries: Record<string, string>,
): number {
  let applied = 0;
  Object.entries(entries).forEach(([key, value]) => {
    if (!isAtlasStorageKey(key) || typeof value !== "string") return;
    storage.setItem(key, value);
    applied += 1;
  });
  return applied;
}

/** Verification metadata for migration. */
export interface MigrationVerificationResult {
  applied: number;
  keys: string[];
  checksum: string;
}

/** Simple checksum for verification. Not cryptographic. */
export function computeStorageChecksum(entries: Record<string, string>): string {
  const parts: string[] = [];
  for (const key of Object.keys(entries).sort()) {
    parts.push(`${key}:${entries[key]?.length ?? 0}`);
  }
  return parts.join("|");
}

/** Apply entries and return verification metadata. */
export function applyAtlasStorageEntriesWithVerification(
  storage: Pick<Storage, "setItem">,
  entries: Record<string, string>,
): MigrationVerificationResult {
  const applied = applyAtlasStorageEntries(storage, entries);
  const keys = Object.keys(entries).filter((k) => isAtlasStorageKey(k) && typeof entries[k] === "string");
  const checksum = computeStorageChecksum(entries);
  return { applied, keys, checksum };
}

/** Export atlas storage as JSON for manual backup. Run on source origin (e.g. 5173). */
export function exportAtlasStorageForBackup(storage: StorageLike): string {
  return JSON.stringify(extractAtlasStorageEntries(storage));
}

/** Import from backup JSON. Returns count applied. Run on target origin (e.g. 3000). */
export function importAtlasStorageFromBackup(
  json: string,
  storage: Pick<Storage, "setItem">,
): number {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return 0;
  }
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && isAtlasStorageKey(key)) {
      entries[key] = value;
    }
  }
  return applyAtlasStorageEntries(storage, entries);
}

function shouldSyncFromFrontendSource(sourceOrigin: string): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  if (window.location.origin === sourceOrigin) return false;
  if (window.location.hostname !== "localhost") return false;
  if (window.location.port !== "3000") return false;
  if (sessionStorage.getItem(SESSION_SYNC_KEY) === "1") return false;
  return true;
}

export async function syncAtlasStorageFromFrontendSource(
  sourceOrigin = "http://localhost:3000",
): Promise<number> {
  if (!shouldSyncFromFrontendSource(sourceOrigin)) return 0;

  const targetOrigin = window.location.origin;
  const src = `${sourceOrigin}/admin-storage-bridge.html?targetOrigin=${encodeURIComponent(targetOrigin)}`;

  return await new Promise<number>((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = src;

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      iframe.remove();
    };

    const finish = (applied: number) => {
      sessionStorage.setItem(SESSION_SYNC_KEY, "1");
      cleanup();
      resolve(applied);
    };

    const timeout = window.setTimeout(() => finish(0), 1200);

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== sourceOrigin) return;
      const data = event.data as { type?: string; payload?: Record<string, string> } | null;
      if (!data || data.type !== "atlas-storage-dump" || typeof data.payload !== "object") return;
      window.clearTimeout(timeout);
      const applied = applyAtlasStorageEntries(window.localStorage, data.payload);
      finish(applied);
    };

    window.addEventListener("message", handleMessage);
    document.body.appendChild(iframe);
  });
}
