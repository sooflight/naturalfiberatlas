import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from "react";

// ── Unified settings shape ──

export interface AdminSettings {
  imageSearch: {
    brave: string;
    unsplash: string;
    pexels: string;
    flickr: string;
    openverse: string;
    europeana: string;
    wikimedia: string;
    pinterest: string;
  };
  ai: {
    openai: string;
    claude: string;
    gemini: string;
    openrouter: string;
    ollama: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  upscale: {
    replicateApiKey: string;
    defaultEngine: 'slim' | 'medium' | 'replicate' | 'cloudinary';
    defaultScale: '2x' | '4x';
  };
  preferences: {
    defaultZoom: number;
  };
}

const STORAGE_KEY = "atlas-admin-settings";

const DEFAULTS: AdminSettings = {
  imageSearch: { brave: "", unsplash: "", pexels: "", flickr: "", openverse: "_none_", europeana: "", wikimedia: "_none_", pinterest: "" },
  ai: { openai: "", claude: "", gemini: "", openrouter: "", ollama: "http://localhost:11434" },
  cloudinary: { cloudName: "", uploadPreset: "" },
  upscale: { replicateApiKey: "", defaultEngine: "slim", defaultScale: "2x" },
  preferences: { defaultZoom: 200 },
};

// ── Migration from legacy keys ──

function migrateLegacyKeys(): AdminSettings {
  const settings: AdminSettings = JSON.parse(JSON.stringify(DEFAULTS));

  try {
    const raw = localStorage.getItem("atlas-search-api-keys");
    if (raw) {
      const p = JSON.parse(raw);
      settings.imageSearch.brave = p.brave || "";
      settings.imageSearch.unsplash = p.unsplash || "";
      settings.imageSearch.pexels = p.pexels || "";
      settings.imageSearch.flickr = p.flickr || "";
      settings.imageSearch.openverse = p.openverse || "_none_";
      settings.imageSearch.europeana = p.europeana || "";
      settings.imageSearch.wikimedia = p.wikimedia || "_none_";
      settings.imageSearch.pinterest = p.pinterest || "";
    } else {
      const old = localStorage.getItem("atlas-brave-config");
      if (old) {
        const p = JSON.parse(old);
        if (p.apiKey) settings.imageSearch.brave = p.apiKey;
      }
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem("atlas-ai-api-keys");
    if (raw) {
      const p = JSON.parse(raw);
      settings.ai.openai = p.openai || "";
      settings.ai.claude = p.claude || "";
      settings.ai.gemini = p.gemini || "";
      settings.ai.openrouter = p.openrouter || "";
      settings.ai.ollama = p.ollama || "http://localhost:11434";
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem("atlas-cloudinary-config");
    if (raw) {
      const p = JSON.parse(raw);
      settings.cloudinary.cloudName = p.cloudName || "";
      settings.cloudinary.uploadPreset = p.uploadPreset || "";
    }
  } catch { /* ignore */ }

  try {
    const z = localStorage.getItem("atlas-zoom");
    if (z) settings.preferences.defaultZoom = Number(z) || 200;
  } catch { /* ignore */ }

  return settings;
}

// ── Load / save ──

export function loadSettings(): AdminSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        imageSearch: { ...DEFAULTS.imageSearch, ...(parsed.imageSearch || {}) },
        ai: { ...DEFAULTS.ai, ...(parsed.ai || {}) },
        cloudinary: { ...DEFAULTS.cloudinary, ...(parsed.cloudinary || {}) },
        upscale: { ...DEFAULTS.upscale, ...(parsed.upscale || {}) },
        preferences: { ...DEFAULTS.preferences, ...(parsed.preferences || {}) },
      };
    }
  } catch { /* ignore */ }

  const migrated = migrateLegacyKeys();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function saveSettings(s: AdminSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── Context ──

interface AdminSettingsContextValue {
  settings: AdminSettings;
  updateSettings: (patch: DeepPartial<AdminSettings>) => void;
  /** Convenience: navigate to Settings tab from any consumer */
  goToSettings?: () => void;
  /** Navigate to any admin tab, optionally focusing an entity */
  navigateTo?: (tab: string, entityId?: string) => void;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const AdminSettingsCtx = createContext<AdminSettingsContextValue | null>(null);

function deepMerge<T extends Record<string, any>>(base: T, patch: DeepPartial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const val = patch[key];
    if (val && typeof val === "object" && !Array.isArray(val) && typeof base[key] === "object") {
      result[key] = deepMerge(base[key] as any, val as any);
    } else if (val !== undefined) {
      result[key] = val as any;
    }
  }
  return result;
}

export function AdminSettingsProvider({
  children,
  onGoToSettings,
  onNavigateTo,
}: {
  children: React.ReactNode;
  onGoToSettings?: () => void;
  onNavigateTo?: (tab: string, entityId?: string) => void;
}) {
  const [settings, setSettings] = useState<AdminSettings>(loadSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback((patch: DeepPartial<AdminSettings>) => {
    setSettings((prev) => {
      const next = deepMerge(prev, patch);
      saveSettings(next);
      // Keep legacy keys in sync so utility functions (used by non-admin code) still work
      localStorage.setItem("atlas-search-api-keys", JSON.stringify(next.imageSearch));
      localStorage.setItem("atlas-ai-api-keys", JSON.stringify(next.ai));
      localStorage.setItem("atlas-cloudinary-config", JSON.stringify(next.cloudinary));
      localStorage.setItem("atlas-zoom", String(next.preferences.defaultZoom));
      return next;
    });
  }, []);

  // Sync if another tab writes to localStorage
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setSettings(JSON.parse(e.newValue)); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    settings,
    updateSettings,
    goToSettings: onGoToSettings,
    navigateTo: onNavigateTo,
  }), [settings, updateSettings, onGoToSettings, onNavigateTo]);

  return (
    <AdminSettingsCtx.Provider value={value}>
      {children}
    </AdminSettingsCtx.Provider>
  );
}

export function useAdminSettings(): AdminSettingsContextValue {
  const ctx = useContext(AdminSettingsCtx);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
}
