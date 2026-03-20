/**
 * Dev-only: writes canonical fiber-order.json when admin reorders the grid.
 * Production builds never call this (guarded by import.meta.env.DEV).
 */
export async function persistGlobalFiberOrder(global: string[]): Promise<void> {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  try {
    await fetch("/__admin/save-fiber-order-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ global }),
    });
  } catch {
    /* ignore offline / no dev server */
  }
}

export async function persistFiberOrderGroupsPatch(
  groups: Record<string, string[]>,
): Promise<void> {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  try {
    await fetch("/__admin/save-fiber-order-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
    });
  } catch {
    /* ignore */
  }
}
