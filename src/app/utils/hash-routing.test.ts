import { describe, expect, it } from "vitest";
import {
  parseFiberPath,
  parseUrlNavigationState,
} from "./hash-routing";

describe("hash-routing", () => {
  it("parses fiber id from /fiber/:id", () => {
    expect(parseFiberPath("/fiber/hemp")).toBe("hemp");
    expect(parseFiberPath("/fiber/flax-linen")).toBe("flax-linen");
    expect(parseFiberPath("/")).toBeNull();
    expect(parseFiberPath("/about")).toBeNull();
  });

  it("merges path fiber with search category", () => {
    expect(
      parseUrlNavigationState("/fiber/hemp", "?cat=textile", ""),
    ).toEqual({ fiberId: "hemp", category: "textile" });
  });

  it("parses hash on home when not on fiber path", () => {
    expect(parseUrlNavigationState("/", "", "#hemp?cat=fiber")).toEqual({
      fiberId: "hemp",
      category: "fiber",
    });
    expect(parseUrlNavigationState("/", "", "#?cat=dye")).toEqual({
      fiberId: null,
      category: "dye",
    });
  });

  it("prefers path fiber over hash when both present", () => {
    expect(parseUrlNavigationState("/fiber/hemp", "", "#jute")).toEqual({
      fiberId: "hemp",
      category: null,
    });
  });
});
