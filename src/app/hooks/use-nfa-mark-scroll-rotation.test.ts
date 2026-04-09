import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNfaMarkScrollRotation } from "./use-nfa-mark-scroll-rotation";

/** Stubbed rAF may enqueue follow-up frames (smoothing loop); drain until idle. */
function drainRafQueue(rafQueue: FrameRequestCallback[]) {
  let guard = 0;
  while (rafQueue.length > 0 && guard++ < 200) {
    const batch = rafQueue.splice(0);
    batch.forEach((cb) => cb(performance.now()));
  }
}

describe("useNfaMarkScrollRotation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty host style when reduced motion is preferred", () => {
    const { result } = renderHook(() => useNfaMarkScrollRotation(null, true));
    expect(result.current.nfaMarkHostStyle).toEqual({});
  });

  it("maps scrollTop to rotation on the host element (batched by rAF)", async () => {
    const port = document.createElement("div");
    port.style.height = "100px";
    port.style.overflow = "auto";
    const inner = document.createElement("div");
    inner.style.height = "500px";
    port.appendChild(inner);
    document.body.appendChild(port);

    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const { result } = renderHook(() => useNfaMarkScrollRotation(port, false));
    const host = document.createElement("span");
    await act(async () => {
      result.current.nfaMarkTransformHostRef(host);
    });

    expect(host.style.transform).toMatch(/rotate\(0deg\)/);

    await act(async () => {
      port.scrollTop = 200;
      port.dispatchEvent(new Event("scroll"));
      drainRafQueue(rafQueue);
    });

    expect(host.style.transform).toMatch(/rotate\(18deg\)/);

    document.body.removeChild(port);
  });

  it("uses the latest scrollTop when several scroll events arrive before rAF", async () => {
    const port = document.createElement("div");
    port.style.height = "100px";
    port.style.overflow = "auto";
    const inner = document.createElement("div");
    inner.style.height = "500px";
    port.appendChild(inner);
    document.body.appendChild(port);

    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const { result } = renderHook(() => useNfaMarkScrollRotation(port, false));
    const host = document.createElement("span");
    await act(async () => {
      result.current.nfaMarkTransformHostRef(host);
    });

    await act(async () => {
      port.scrollTop = 100;
      port.dispatchEvent(new Event("scroll"));
      port.scrollTop = 300;
      port.dispatchEvent(new Event("scroll"));
      drainRafQueue(rafQueue);
    });

    expect(host.style.transform).toMatch(/rotate\(27deg\)/);

    document.body.removeChild(port);
  });

  it("clears host transform and stops smoothing when reduced motion turns on after mount", async () => {
    const port = document.createElement("div");
    port.style.height = "100px";
    port.style.overflow = "auto";
    const inner = document.createElement("div");
    inner.style.height = "500px";
    port.appendChild(inner);
    document.body.appendChild(port);

    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    const { result, rerender } = renderHook(
      ({ reduced }: { reduced: boolean }) => useNfaMarkScrollRotation(port, reduced),
      { initialProps: { reduced: false } },
    );

    const host = document.createElement("span");
    await act(async () => {
      result.current.nfaMarkTransformHostRef(host);
    });

    await act(async () => {
      port.scrollTop = 400;
      port.dispatchEvent(new Event("scroll"));
      drainRafQueue(rafQueue);
    });

    expect(host.style.transform).toMatch(/rotate\(/);

    await act(async () => {
      rerender({ reduced: true });
    });

    expect(host.style.transform).toBe("");

    document.body.removeChild(port);
  });
});
