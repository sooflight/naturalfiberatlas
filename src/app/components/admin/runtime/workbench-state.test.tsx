import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  mapWorkbenchModeToWorkflowPhase,
  WorkbenchStateProvider,
  useWorkbenchState,
  type WorkbenchMode,
  type WorkbenchViewMode,
} from "./workbench-state";

describe("workbench-state", () => {
  it("restores persisted state from storage", () => {
    localStorage.setItem(
      "atlas:workbench-state",
      JSON.stringify({
        mode: "import",
        selectionId: "linen",
        inspectorOpen: true,
        viewMode: "list",
      }),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkbenchStateProvider>{children}</WorkbenchStateProvider>
    );

    const { result } = renderHook(() => useWorkbenchState(), { wrapper });
    expect(result.current.mode).toBe<WorkbenchMode>("import");
    expect(result.current.workflowPhase).toBe("edit");
    expect(result.current.selectionId).toBe("linen");
    expect(result.current.inspectorOpen).toBe(true);
    expect(result.current.viewMode).toBe<WorkbenchViewMode>("list");
  });

  it("tracks mode selection and view state", () => {
    localStorage.clear();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <WorkbenchStateProvider>{children}</WorkbenchStateProvider>
    );

    const { result } = renderHook(() => useWorkbenchState(), { wrapper });

    expect(result.current.mode).toBe<WorkbenchMode>("browse");
    expect(result.current.workflowPhase).toBe("discover");
    expect(result.current.selectionId).toBeNull();
    expect(result.current.viewMode).toBe<WorkbenchViewMode>("grid");

    act(() => {
      result.current.setMode("edit-profile");
      result.current.setSelectionId("hemp");
      result.current.setViewMode("knowledge");
      result.current.setInspectorOpen(true);
      result.current.triggerKnowledgeAction("next-section");
    });

    expect(result.current.mode).toBe<WorkbenchMode>("edit-profile");
    expect(result.current.workflowPhase).toBe("edit");
    expect(result.current.selectionId).toBe("hemp");
    expect(result.current.viewMode).toBe<WorkbenchViewMode>("knowledge");
    expect(result.current.inspectorOpen).toBe(true);
    expect(result.current.knowledgeAction?.action).toBe("next-section");

    act(() => {
      result.current.setSelectionId("flax");
      result.current.setSelectionId("hemp");
      result.current.goToPreviousSelection();
    });
    expect(result.current.selectionId).toBe("flax");
  });

  it("maps workbench modes into normalized workflow phases", () => {
    expect(mapWorkbenchModeToWorkflowPhase("browse")).toBe("discover");
    expect(mapWorkbenchModeToWorkflowPhase("overview")).toBe("inspect");
    expect(mapWorkbenchModeToWorkflowPhase("edit-profile")).toBe("edit");
    expect(mapWorkbenchModeToWorkflowPhase("settings")).toBe("commit");
  });
});
