const PASSPORT_STATUS_OVERRIDES_KEY = "atlas-passport-status-overrides";
const PASSPORT_STATUS_OVERRIDES_EVENT = "atlas-passport-status-overrides-changed";

export function readPassportStatusOverrides(): Record<string, string> {
  try {
    if (typeof window === "undefined" || !window.localStorage) return {};
    const raw = window.localStorage.getItem(PASSPORT_STATUS_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([k, v]) => typeof k === "string" && typeof v === "string"
      )
    );
  } catch {
    return {};
  }
}

export function writePassportStatusOverride(profileKey: string, status: string): void {
  if (!profileKey) return;
  const next = { ...readPassportStatusOverrides(), [profileKey]: status };
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(PASSPORT_STATUS_OVERRIDES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PASSPORT_STATUS_OVERRIDES_EVENT));
  } catch {
    // Ignore persistence issues; in-memory UI state still works.
  }
}

export function subscribePassportStatusOverrides(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PASSPORT_STATUS_OVERRIDES_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(PASSPORT_STATUS_OVERRIDES_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PASSPORT_STATUS_OVERRIDES_EVENT, onChange);
  };
}

