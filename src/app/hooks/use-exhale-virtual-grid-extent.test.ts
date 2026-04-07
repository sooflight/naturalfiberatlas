import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExhaleVirtualGridExtent } from "./use-exhale-virtual-grid-extent";

describe("useExhaleVirtualGridExtent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 while detail is open", () => {
    const assign = new Map<number, "about">([[5, "about"]]);
    const { result } = renderHook(
      ({ id, defer }: { id: string | null; defer: boolean }) =>
        useExhaleVirtualGridExtent(id, 3, assign, defer),
      { initialProps: { id: "hemp" as string | null, defer: false } },
    );
    expect(result.current).toBe(0);
  });

  it("pads grid after close when snapshot had virtual tail", () => {
    const assign = new Map<number, "about">([[5, "about"]]);
    const { result, rerender } = renderHook(
      ({ id, defer }: { id: string | null; defer: boolean }) =>
        useExhaleVirtualGridExtent(id, 3, assign, defer),
      { initialProps: { id: "hemp" as string | null, defer: false } },
    );

    rerender({ id: null, defer: false });
    expect(result.current).toBe(3);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(0);
  });

  it("does not pad when deferExhaleLayoutHold (fiber switch gap)", () => {
    const assign = new Map<number, "about">([[5, "about"]]);
    const { result, rerender } = renderHook(
      ({ id, defer }: { id: string | null; defer: boolean }) =>
        useExhaleVirtualGridExtent(id, 3, assign, defer),
      { initialProps: { id: "hemp" as string | null, defer: false } },
    );

    rerender({ id: null, defer: true });
    expect(result.current).toBe(0);
  });
});
