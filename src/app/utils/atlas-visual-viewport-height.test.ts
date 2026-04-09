import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR,
  installAtlasVisualViewportHeightSync,
} from "./atlas-visual-viewport-height";

describe("installAtlasVisualViewportHeightSync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR);
  });

  it("writes min(visualViewport.height, innerHeight) to --atlas-vvh and cleans up", () => {
    const windowAddSpy = vi.spyOn(window, "addEventListener");
    const windowRemoveSpy = vi.spyOn(window, "removeEventListener");
    const documentAddSpy = vi.spyOn(document, "addEventListener");
    const documentRemoveSpy = vi.spyOn(document, "removeEventListener");
    const vv = {
      height: 812,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("visualViewport", vv);
    vi.stubGlobal("innerHeight", 900);

    const uninstall = installAtlasVisualViewportHeightSync();

    expect(document.documentElement.style.getPropertyValue(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR).trim()).toBe(
      "812px",
    );
    expect(vv.addEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.addEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(windowAddSpy).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(documentAddSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    uninstall();
    expect(document.documentElement.style.getPropertyValue(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR)).toBe("");
    expect(vv.removeEventListener).toHaveBeenCalled();
    expect(windowRemoveSpy).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(documentRemoveSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("uses innerHeight when it is smaller than visualViewport.height", () => {
    const vv = {
      height: 900,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("visualViewport", vv);
    vi.stubGlobal("innerHeight", 812);

    const uninstall = installAtlasVisualViewportHeightSync();

    expect(document.documentElement.style.getPropertyValue(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR).trim()).toBe(
      "812px",
    );
    uninstall();
  });

  it("removes --atlas-vvh when visualViewport is missing", () => {
    vi.stubGlobal("visualViewport", undefined);
    document.documentElement.style.setProperty(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR, "999px");

    installAtlasVisualViewportHeightSync();

    expect(document.documentElement.style.getPropertyValue(ATLAS_VISUAL_VIEWPORT_HEIGHT_VAR)).toBe("");
  });
});
