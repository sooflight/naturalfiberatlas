/** @vitest-environment jsdom */
import React, { useEffect } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSaveProvider, useAdminSave } from "./AdminSaveContext";

function SurfaceProbe({
  dirty,
  status,
  onSave,
}: {
  dirty: boolean;
  status: "idle" | "saving" | "saved" | "error";
  onSave: () => Promise<void>;
}) {
  const adminSave = useAdminSave();
  useEffect(() => {
    return adminSave.registerActiveSurface({
      isDirty: dirty,
      saveStatus: status,
      save: onSave,
    });
  }, [adminSave.registerActiveSurface, dirty, onSave, status]);
  return null;
}

function StateProbe() {
  const adminSave = useAdminSave();
  return (
    <div>
      <span data-testid="dirty">{String(adminSave.isDirty)}</span>
      <span data-testid="status">{adminSave.saveStatus}</span>
      <button onClick={() => void adminSave.triggerSave()}>trigger</button>
    </div>
  );
}

describe("AdminSaveContext", () => {
  afterEach(() => cleanup());

  it("reflects dirty and status from registered surface", () => {
    const saveSpy = vi.fn(async () => {});
    render(
      <AdminSaveProvider>
        <SurfaceProbe dirty={true} status="idle" onSave={saveSpy} />
        <StateProbe />
      </AdminSaveProvider>,
    );
    expect(screen.getByTestId("dirty").textContent).toBe("true");
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("triggerSave calls registered save and settles to saved", async () => {
    const saveSpy = vi.fn(async () => {});
    render(
      <AdminSaveProvider>
        <SurfaceProbe dirty={true} status="idle" onSave={saveSpy} />
        <StateProbe />
      </AdminSaveProvider>,
    );
    await act(async () => {
      screen.getByText("trigger").click();
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("status").textContent).toBe("saved");
  });

  it("triggerSave still calls save when surface is not dirty", async () => {
    const saveSpy = vi.fn(async () => {});
    render(
      <AdminSaveProvider>
        <SurfaceProbe dirty={false} status="idle" onSave={saveSpy} />
        <StateProbe />
      </AdminSaveProvider>,
    );
    await act(async () => {
      screen.getByText("trigger").click();
    });
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("status").textContent).toBe("saved");
  });
});
