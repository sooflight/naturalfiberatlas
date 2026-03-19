import { describe, expect, it, vi } from "vitest";
import { retryWithBackoff } from "./retry";

describe("retryWithBackoff", () => {
  it("retries until success for transient failures", async () => {
    let attempts = 0;

    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("transient");
        }
        return "ok";
      },
      { retries: 3, baseDelayMs: 1, maxDelayMs: 5 }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("throws after max retries are exhausted", async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error("still failing");
        },
        { retries: 2, baseDelayMs: 1, maxDelayMs: 5 }
      )
    ).rejects.toThrow("still failing");

    expect(attempts).toBe(3);
  });

  it("does not retry when shouldRetry returns false", async () => {
    let attempts = 0;

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          throw new Error("fatal");
        },
        {
          retries: 5,
          baseDelayMs: 1,
          maxDelayMs: 5,
          shouldRetry: () => false,
        }
      )
    ).rejects.toThrow("fatal");

    expect(attempts).toBe(1);
  });

  it("uses exponential backoff with jitter between retries", async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    let attempts = 0;
    const sleepSpy = vi.spyOn(globalThis, "setTimeout");

    const promise = retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("transient");
        return "done";
      },
      { retries: 3, baseDelayMs: 10, maxDelayMs: 100 }
    );

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("done");
    expect(sleepSpy).toHaveBeenCalled();

    randomSpy.mockRestore();
    vi.useRealTimers();
  });
});
