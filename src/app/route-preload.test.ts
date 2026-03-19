import { describe, expect, it, vi } from "vitest";
import { createRetryablePreloader } from "./route-preload";

describe("createRetryablePreloader", () => {
  it("retries after a failed load instead of caching rejection forever", async () => {
    const loader = vi
      .fn<() => Promise<{ ok: boolean }>>()
      .mockRejectedValueOnce(new Error("chunk missing"))
      .mockResolvedValueOnce({ ok: true });

    const preload = createRetryablePreloader(loader);

    await expect(preload()).rejects.toThrow("chunk missing");
    await expect(preload()).resolves.toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("reuses the same promise after a successful load", async () => {
    const loader = vi.fn<() => Promise<{ ok: boolean }>>().mockResolvedValue({ ok: true });
    const preload = createRetryablePreloader(loader);

    const first = preload();
    const second = preload();

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ ok: true });
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
