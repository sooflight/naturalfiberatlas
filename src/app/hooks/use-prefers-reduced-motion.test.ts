import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

describe("usePrefersReducedMotion", () => {
  const listeners = new Set<() => void>();
  let matches = false;

  beforeEach(() => {
    listeners.clear();
    matches = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_: string, cb: () => void) => {
          listeners.add(cb);
        },
        removeEventListener: (_: string, cb: () => void) => {
          listeners.delete(cb);
        },
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when the media query does not match", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when the media query matches", () => {
    matches = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    matches = true;
    act(() => {
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
