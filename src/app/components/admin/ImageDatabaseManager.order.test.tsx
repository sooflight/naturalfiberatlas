import { describe, expect, it } from "vitest";
import {
  isProfileLive,
  sortKeysByCanonicalOrder,
  sortFilteredProfileKeys,
  toDisplayProfileState,
} from "./ImageDatabaseManager";

describe("sortKeysByCanonicalOrder", () => {
  it("should sort keys by canonical profile order", () => {
    const keys = ["hemp", "jute", "flax-linen"];
    const canonicalOrder = ["jute", "hemp", "flax-linen"];
    const result = sortKeysByCanonicalOrder({ keys, canonicalOrder });
    expect(result).toEqual(["jute", "hemp", "flax-linen"]);
  });

  it("keeps unknown profiles after canonical IDs", () => {
    const keys = ["unknown-profile", "hemp"];
    const canonicalOrder = ["hemp"];
    const result = sortKeysByCanonicalOrder({ keys, canonicalOrder });
    expect(result).toEqual(["hemp", "unknown-profile"]);
  });

  it("places navigation parent profiles into their own grouped bucket", () => {
    // Use nav parent IDs from data/atlas-navigation: plant, animal are top-level nav nodes
    const keys = ["hemp", "plant", "animal", "jute"];
    const canonicalOrder = ["plant", "hemp", "jute", "animal"];
    const result = sortKeysByCanonicalOrder({ keys, canonicalOrder });
    expect(result).toEqual(["hemp", "jute", "plant", "animal"]);
  });
});

describe("sortFilteredProfileKeys", () => {
  it("applies canonical ordering immediately", () => {
    const result = sortFilteredProfileKeys({
      keys: ["hemp", "jute", "flax-linen"],
      canonicalOrder: ["jute", "hemp", "flax-linen"],
    });

    expect(result).toEqual(["jute", "hemp", "flax-linen"]);
  });
});

describe("profile status derivation helpers", () => {
  it("derives published status as live", () => {
    expect(isProfileLive("published")).toBe(true);
    expect(toDisplayProfileState("published")).toBe("live");
  });

  it("derives draft-like statuses as draft", () => {
    expect(isProfileLive("draft")).toBe(false);
    expect(isProfileLive(undefined)).toBe(false);
    expect(isProfileLive(null)).toBe(false);
    expect(toDisplayProfileState("draft")).toBe("draft");
    expect(toDisplayProfileState(undefined)).toBe("draft");
  });

  it("derives archived status explicitly", () => {
    expect(isProfileLive("archived")).toBe(false);
    expect(toDisplayProfileState("archived")).toBe("archived");
  });
});
