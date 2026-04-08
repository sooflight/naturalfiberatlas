import { describe, expect, it } from "vitest";
import {
  buildPromotedOverridesWritePayload,
  hasPromotedOverridesContent,
  shouldWritePromotedOverrides,
} from "./promoted-overrides-sync";

describe("shouldWritePromotedOverrides", () => {
  it("returns false when next and current content match", () => {
    const payload = '{\n  "fibers": {}\n}\n';
    expect(shouldWritePromotedOverrides(payload, payload)).toBe(false);
  });

  it("returns true when payload changed", () => {
    const current = '{\n  "fibers": {}\n}\n';
    const next = '{\n  "fibers": {\n    "abaca": { "name": "Abaca" }\n  }\n}\n';
    expect(shouldWritePromotedOverrides(next, current)).toBe(true);
  });

  it("returns false when next payload is empty override object", () => {
    const current = '{\n  "fibers": {\n    "abaca": { "name": "Abaca" }\n  }\n}\n';
    const next = "{}\n";
    expect(shouldWritePromotedOverrides(next, current)).toBe(false);
  });
});

describe("hasPromotedOverridesContent", () => {
  it("detects non-empty override payloads", () => {
    expect(hasPromotedOverridesContent("{}")).toBe(false);
    expect(hasPromotedOverridesContent('{"fibers":{}}')).toBe(true);
    expect(hasPromotedOverridesContent('{"fibers":{"abaca":{"name":"Abaca"}}}')).toBe(true);
  });
});

describe("buildPromotedOverridesWritePayload", () => {
  it("merges incoming payload with current file content", () => {
    const current = JSON.stringify(
      {
        fibers: {
          "organic-cotton": { name: "Cotton", status: "published" },
          modal: { status: "published" },
        },
      },
      null,
      2,
    );
    const next = JSON.stringify(
      {
        fibers: {
          modal: { status: "archived" },
          looms: { status: "archived" },
        },
      },
      null,
      2,
    );

    const out = buildPromotedOverridesWritePayload(next, current);
    expect(out).not.toBeNull();
    const parsed = JSON.parse(out ?? "{}") as Record<string, any>;
    expect(parsed.fibers["organic-cotton"]).toEqual({ name: "Cotton", status: "published" });
    expect(parsed.fibers.modal).toEqual({ status: "archived" });
    expect(parsed.fibers.looms).toEqual({ status: "archived" });
  });
});
