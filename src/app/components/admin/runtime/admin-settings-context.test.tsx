import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AdminSettingsProvider,
  defaultAdminSettings,
  useAdminSettings,
} from "./admin-settings-context";

describe("admin-settings-context", () => {
  it("deep merges updates and preserves defaults", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminSettingsProvider storageKey="atlas:test-settings">{children}</AdminSettingsProvider>
    );

    const { result } = renderHook(() => useAdminSettings(), { wrapper });
    expect(result.current.settings.cloudinary.cloudName).toBe(
      defaultAdminSettings.cloudinary.cloudName,
    );

    act(() => {
      result.current.updateSettings({
        cloudinary: { cloudName: "demo", uploadPreset: "atlas-upload" },
      });
    });

    expect(result.current.settings.cloudinary.cloudName).toBe("demo");
    expect(result.current.settings.cloudinary.uploadPreset).toBe("atlas-upload");
    expect(result.current.settings.runtime.apiBaseUrl).toBe(
      defaultAdminSettings.runtime.apiBaseUrl,
    );
  });

  it("blocks navigation when unsaved changes exist unless confirmed", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminSettingsProvider storageKey="atlas:test-settings-guardrails">{children}</AdminSettingsProvider>
    );
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { result } = renderHook(() => useAdminSettings(), { wrapper });

    expect(result.current.confirmNavigation("/admin/images")).toBe(true);

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });
    expect(result.current.confirmNavigation("/admin/images")).toBe(false);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(result.current.guardrailCopy.unsavedNavigationPrompt.length).toBeGreaterThan(0);
    confirmSpy.mockRestore();
  });
});
