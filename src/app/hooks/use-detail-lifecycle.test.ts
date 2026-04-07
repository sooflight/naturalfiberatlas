import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDetailLifecycle } from "./use-detail-lifecycle";

describe("useDetailLifecycle", () => {
  it("returns idle when nothing is selected", () => {
    const { result } = renderHook(() => useDetailLifecycle(null));
    expect(result.current.phase).toBe("idle");
  });

  it("returns pre_raster after select (layout effect + coherence)", () => {
    const { result } = renderHook(() => useDetailLifecycle("hemp"));
    expect(result.current.phase).toBe("pre_raster");
  });

  it("forces pre_raster when selectedId changes before owner catches up (no settled flash)", () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useDetailLifecycle(id),
      { initialProps: { id: "hemp" as string | null } },
    );
    expect(result.current.phase).toBe("pre_raster");
    rerender({ id: "cotton" });
    expect(result.current.phase).toBe("pre_raster");
  });
});
