import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadContactSheetTargets } from "./image-warmup";
import type { ImageTransformPipeline } from "../pipelines/types";

describe("preloadContactSheetTargets", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assigns Image src for transformed URLs up to max", () => {
    const setSrc = vi.fn();
    vi.stubGlobal(
      "Image",
      class {
        set src(v: string) {
          setSrc(v);
        }
      },
    );

    const pipeline: ImageTransformPipeline = {
      transform(src, preset) {
        if (!src || preset !== "contactSheet") return src;
        return `${src}?thumb=1`;
      },
    };

    preloadContactSheetTargets(["a", "b", "c"], pipeline, { max: 2 });
    expect(setSrc).toHaveBeenCalledTimes(2);
    expect(setSrc).toHaveBeenNthCalledWith(1, "a?thumb=1");
    expect(setSrc).toHaveBeenNthCalledWith(2, "b?thumb=1");
  });
});
