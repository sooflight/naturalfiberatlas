import { describe, expect, it } from "vitest";
import { calculateJitteredTtl, calculateStaleTtl } from "./upstash";

describe("upstash cache ttl helpers", () => {
  it("adds bounded jitter to ttl", () => {
    const ttl = 300;
    const jitteredLow = calculateJitteredTtl(ttl, 0);
    const jitteredHigh = calculateJitteredTtl(ttl, 1);

    expect(jitteredLow).toBe(300);
    expect(jitteredHigh).toBe(360);
  });

  it("computes stale ttl longer than hot ttl", () => {
    const ttl = 300;
    const staleTtl = calculateStaleTtl(ttl);

    expect(staleTtl).toBeGreaterThan(ttl);
    expect(staleTtl).toBe(1200);
  });
});

