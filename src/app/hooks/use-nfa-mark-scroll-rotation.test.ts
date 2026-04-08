import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNfaMarkScrollRotation } from "./use-nfa-mark-scroll-rotation";

describe("useNfaMarkScrollRotation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty style when reduced motion is preferred", () => {
    const { result } = renderHook(() => useNfaMarkScrollRotation(null, true));
    expect(result.current.nfaMarkStyle).toEqual({});
  });

  it("maps scrollTop to rotation (batched by rAF)", async () => {
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

    expect(result.current.nfaMarkStyle.transform).toBe("rotate(0deg)");

    await act(async () => {
      port.scrollTop = 200;
      port.dispatchEvent(new Event("scroll"));
    });

    await act(async () => {
      rafQueue.splice(0).forEach((cb) => cb(performance.now()));
    });

    expect(result.current.nfaMarkStyle.transform).toBe("rotate(18deg)");

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

    await act(async () => {
      port.scrollTop = 100;
      port.dispatchEvent(new Event("scroll"));
      port.scrollTop = 300;
      port.dispatchEvent(new Event("scroll"));
    });

    await act(async () => {
      rafQueue.splice(0).forEach((cb) => cb(performance.now()));
    });

    expect(result.current.nfaMarkStyle.transform).toBe("rotate(27deg)");

    document.body.removeChild(port);
  });
});
