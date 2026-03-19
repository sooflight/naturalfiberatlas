import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AdminSettings {
  runtime: {
    apiBaseUrl: string;
  };
  cloudinary: {
    cloudName: string;
    uploadPreset: string;
  };
  imageSearch: {
    brave: string;
    unsplash: string;
    pexels: string;
    openverse: string;
    europeana: string;
    wikimedia: string;
    pinterest: string;
  };
}

export interface AdminGuardrailCopy {
  unsavedNavigationPrompt: string;
  saveSuccess: string;
  saveError: string;
  conflictError: string;
}

export const defaultAdminSettings: AdminSettings = {
  runtime: {
    apiBaseUrl: "",
  },
  cloudinary: {
    cloudName: "",
    uploadPreset: "",
  },
  imageSearch: {
    brave: "",
    unsplash: "",
    pexels: "",
    openverse: "",
    europeana: "",
    wikimedia: "",
    pinterest: "",
  },
};

export const defaultAdminGuardrailCopy: AdminGuardrailCopy = {
  unsavedNavigationPrompt:
    "You have unsaved admin changes. Leave this view and discard pending edits?",
  saveSuccess: "Changes saved.",
  saveError: "Save failed. Review validation details and retry.",
  conflictError: "A conflict was detected. Resolve conflicts before continuing.",
};

type AdminSettingsPatch = Partial<{
  [K in keyof AdminSettings]: Partial<AdminSettings[K]>;
}>;

interface AdminSettingsContextValue {
  settings: AdminSettings;
  hasUnsavedChanges: boolean;
  guardrailCopy: AdminGuardrailCopy;
  updateSettings: (patch: AdminSettingsPatch) => void;
  resetSettings: () => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  confirmNavigation: (nextPath: string) => boolean;
}

const AdminSettingsContext = createContext<AdminSettingsContextValue | null>(null);

function deepMergeSettings(
  base: AdminSettings,
  patch: AdminSettingsPatch,
): AdminSettings {
  return {
    runtime: {
      ...base.runtime,
      ...(patch.runtime ?? {}),
    },
    cloudinary: {
      ...base.cloudinary,
      ...(patch.cloudinary ?? {}),
    },
    imageSearch: {
      ...base.imageSearch,
      ...(patch.imageSearch ?? {}),
    },
  };
}

function parseStoredSettings(value: string | null): AdminSettings {
  if (!value) {
    return defaultAdminSettings;
  }
  try {
    const parsed = JSON.parse(value) as Partial<AdminSettings> & {
      cloudinaryCloudName?: string;
      cloudinaryUploadPreset?: string;
    };

    const migrated: AdminSettingsPatch = {
      runtime: parsed.runtime ?? {},
      cloudinary: {
        ...(parsed.cloudinary ?? {}),
        cloudName:
          parsed.cloudinary?.cloudName ?? parsed.cloudinaryCloudName ?? "",
        uploadPreset:
          parsed.cloudinary?.uploadPreset ?? parsed.cloudinaryUploadPreset ?? "",
      },
      imageSearch: parsed.imageSearch ?? {},
    };
    return deepMergeSettings(defaultAdminSettings, migrated);
  } catch {
    return defaultAdminSettings;
  }
}

interface AdminSettingsProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export function AdminSettingsProvider({
  children,
  storageKey = "atlas:admin-settings",
}: AdminSettingsProviderProps) {
  const [settings, setSettings] = useState<AdminSettings>(() =>
    parseStoredSettings(localStorage.getItem(storageKey)),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const persist = useCallback(
    (next: AdminSettings) => {
      localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const updateSettings = useCallback(
    (patch: AdminSettingsPatch) => {
      setSettings((prev) => {
        const next = deepMergeSettings(prev, patch);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultAdminSettings);
    persist(defaultAdminSettings);
  }, [persist]);

  const confirmNavigation = useCallback((nextPath: string) => {
    if (!hasUnsavedChanges) return true;
    return window.confirm(`${defaultAdminGuardrailCopy.unsavedNavigationPrompt}\n\nDestination: ${nextPath}`);
  }, [hasUnsavedChanges]);

  const value = useMemo<AdminSettingsContextValue>(
    () => ({
      settings,
      hasUnsavedChanges,
      guardrailCopy: defaultAdminGuardrailCopy,
      updateSettings,
      resetSettings,
      setHasUnsavedChanges,
      confirmNavigation,
    }),
    [
      confirmNavigation,
      hasUnsavedChanges,
      resetSettings,
      settings,
      updateSettings,
    ],
  );

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
}

export function useAdminSettings(): AdminSettingsContextValue {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) {
    throw new Error(
      "useAdminSettings must be used within AdminSettingsProvider.",
    );
  }
  return ctx;
}

