import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { seededFloat, useCrossfade } from "./use-crossfade";

describe("useCrossfade", () => {
  it("keeps index at 0 when there is only one image", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCrossfade({ id: "hemp", imageCount: 1, paused: false }));
    expect(result.current).toEqual({ activeIndex: 0, previousIndex: 0 });
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current).toEqual({ activeIndex: 0, previousIndex: 0 });
    vi.useRealTimers();
  });

  it("uses deterministic initial delay and hold cadence", () => {
    vi.useFakeTimers();
    const id = "hemp";
    const hold = 6000 + seededFloat(id) * 3000;
    const initialDelay = seededFloat(`${id}:delay`) * 2500;
    const firstAdvanceAt = Math.floor(initialDelay + hold);
    const nextAdvanceAfter = Math.floor(hold + 3000);

    const { result } = renderHook(() => useCrossfade({ id, imageCount: 3, paused: false }));
    expect(result.current).toEqual({ activeIndex: 0, previousIndex: 0 });

    act(() => {
      vi.advanceTimersByTime(firstAdvanceAt - 1);
    });
    expect(result.current).toEqual({ activeIndex: 0, previousIndex: 0 });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual({ activeIndex: 1, previousIndex: 0 });

    act(() => {
      vi.advanceTimersByTime(nextAdvanceAfter);
    });
    expect(result.current).toEqual({ activeIndex: 2, previousIndex: 1 });

    vi.useRealTimers();
  });

  it("pauses and resumes with a fresh interval", () => {
    vi.useFakeTimers();
    const id = "silk";
    const hold = 6000 + seededFloat(id) * 3000;
    const initialDelay = seededFloat(`${id}:delay`) * 2500;
    const firstAdvanceAt = Math.floor(initialDelay + hold);
    const nextAdvanceAfter = Math.floor(hold + 3000);

    const { result, rerender } = renderHook(
      ({ paused }) => useCrossfade({ id, imageCount: 3, paused }),
      { initialProps: { paused: false } },
    );

    act(() => {
      vi.advanceTimersByTime(firstAdvanceAt);
    });
    expect(result.current).toEqual({ activeIndex: 1, previousIndex: 0 });

    rerender({ paused: true });
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(result.current).toEqual({ activeIndex: 1, previousIndex: 0 });

    rerender({ paused: false });
    act(() => {
      vi.advanceTimersByTime(nextAdvanceAfter - 1);
    });
    expect(result.current).toEqual({ activeIndex: 1, previousIndex: 0 });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toEqual({ activeIndex: 2, previousIndex: 1 });

    vi.useRealTimers();
  });
});
