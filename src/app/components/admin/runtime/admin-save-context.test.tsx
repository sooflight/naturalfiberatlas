import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminSaveProvider, useAdminSave } from "./admin-save-context";
import { clearAdminMetrics, getAdminMetrics } from "./admin-metrics";

describe("admin-save-context", () => {
  it("reports dirty/saved/error lifecycle and triggers host callback", async () => {
    clearAdminMetrics();
    const onSave = vi.fn(async () => undefined);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminSaveProvider onSave={onSave}>{children}</AdminSaveProvider>
    );

    const { result } = renderHook(() => useAdminSave(), { wrapper });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveStatus).toBe("idle");
    expect(result.current.lastIntent).toEqual({
      reason: "unspecified",
      scope: "workspace",
      riskLevel: "medium",
      affectedEntities: [],
    });

    act(() => {
      result.current.markDirty();
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.triggerSave({
        reason: "Apply fiber update",
        scope: "fiber",
        riskLevel: "low",
        affectedEntities: ["hemp"],
      });
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveStatus).toBe("saved");
    expect(result.current.lastIntent).toEqual({
      reason: "Apply fiber update",
      scope: "fiber",
      riskLevel: "low",
      affectedEntities: ["hemp"],
    });

    act(() => {
      result.current.setError("oops");
    });
    expect(result.current.saveStatus).toBe("error");
    expect(result.current.error).toBe("oops");

    await act(async () => {
      await result.current.triggerSave();
    });

    const metricEvents = getAdminMetrics();
    expect(metricEvents.some((event) => event.event === "task_start" && event.task === "edit_save")).toBe(true);
    expect(
      metricEvents.some((event) => event.event === "task_complete" && event.task === "edit_save"),
    ).toBe(true);
    expect(metricEvents.some((event) => event.event === "retry_action" && event.task === "edit_save")).toBe(true);
  });
});
