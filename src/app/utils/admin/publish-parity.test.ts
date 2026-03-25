import { describe, expect, it } from "vitest";
import { normalizeAtlasStatus } from "./publish-parity";

describe("publish-parity", () => {
  it("normalizeAtlasStatus maps unknown to published", () => {
    expect(normalizeAtlasStatus(undefined)).toBe("published");
    expect(normalizeAtlasStatus("published")).toBe("published");
    expect(normalizeAtlasStatus("draft")).toBe("draft");
    expect(normalizeAtlasStatus("archived")).toBe("archived");
  });
});
