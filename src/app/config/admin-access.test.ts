import { describe, expect, it } from "vitest";
import { isAdminEnabled } from "./admin-access";

describe("isAdminEnabled", () => {
  it("returns true only when the env value is literal true", () => {
    expect(isAdminEnabled("true")).toBe(true);
    expect(isAdminEnabled("false")).toBe(false);
    expect(isAdminEnabled(undefined, false)).toBe(false);
    expect(isAdminEnabled("1")).toBe(false);
  });

  it("defaults to enabled in local dev when env is unset", () => {
    expect(isAdminEnabled(undefined, true)).toBe(true);
  });
});
