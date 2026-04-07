import { describe, expect, it } from "vitest";
import {
  collectUrlsFromAtlasImageValue,
  mergeAtlasImagesFromClientPatch,
  mergeNewImagesJsonPayload,
} from "./mergeAtlasImagesPatch";

describe("collectUrlsFromAtlasImageValue", () => {
  it("collects string URL", () => {
    expect(collectUrlsFromAtlasImageValue(" https://a.test/x.jpg ")).toEqual(["https://a.test/x.jpg"]);
  });

  it("collects object url", () => {
    expect(
      collectUrlsFromAtlasImageValue({ url: "https://b.test/y.png", title: "t" }),
    ).toEqual(["https://b.test/y.png"]);
  });

  it("collects mixed arrays", () => {
    expect(
      collectUrlsFromAtlasImageValue([
        "https://a.test/1.jpg",
        { url: "https://a.test/2.jpg", provider: "x" },
        "",
        {},
      ]),
    ).toEqual(["https://a.test/1.jpg", "https://a.test/2.jpg"]);
  });

  it("returns empty for empty input", () => {
    expect(collectUrlsFromAtlasImageValue(undefined)).toEqual([]);
    expect(collectUrlsFromAtlasImageValue("")).toEqual([]);
    expect(collectUrlsFromAtlasImageValue({})).toEqual([]);
  });
});

describe("mergeAtlasImagesFromClientPatch", () => {
  it("keeps disk-only keys and overlays patch keys", () => {
    const disk = {
      keep: "https://old.test/k.jpg",
      update: "https://old.test/u.jpg",
    };
    const patch = {
      update: ["https://new.test/1.jpg", "https://new.test/2.jpg"],
      fresh: "https://new.test/f.jpg",
    };
    expect(mergeAtlasImagesFromClientPatch(disk, patch)).toEqual({
      keep: "https://old.test/k.jpg",
      update: ["https://new.test/1.jpg", "https://new.test/2.jpg"],
      fresh: "https://new.test/f.jpg",
    });
  });

  it("removes keys when patch entry has no URLs", () => {
    const disk = { gone: "https://x.test/a.jpg", stay: "https://x.test/b.jpg" };
    const patch = { gone: [], stay: "https://x.test/b.jpg" };
    expect(mergeAtlasImagesFromClientPatch(disk, patch)).toEqual({
      stay: "https://x.test/b.jpg",
    });
  });
});

describe("mergeNewImagesJsonPayload", () => {
  it("preserves disk-only profiles and overlays incoming rows", () => {
    const disk = {
      profiles: [
        { profileKey: "only-disk", imageLinks: ["https://d.test/1.jpg"], imageCount: 1 },
        { profileKey: "both", imageLinks: ["https://old.test/a.jpg"], imageCount: 1 },
      ],
    };
    const merged = mergeNewImagesJsonPayload(disk, {
      exportedAt: "2026-01-01T00:00:00.000Z",
      profiles: [{ profileKey: "both", imageLinks: ["https://new.test/b.jpg"] }],
    });
    expect(merged.profiles.map((p) => p.profileKey).sort()).toEqual(["both", "only-disk"]);
    const both = merged.profiles.find((p) => p.profileKey === "both");
    expect(both?.imageLinks).toEqual(["https://new.test/b.jpg"]);
  });

  it("drops a profile when incoming row has no links", () => {
    const disk = {
      profiles: [{ profileKey: "gone", imageLinks: ["https://x.test/a.jpg"], imageCount: 1 }],
    };
    const merged = mergeNewImagesJsonPayload(disk, {
      exportedAt: "2026-01-01T00:00:00.000Z",
      profiles: [{ profileKey: "gone", imageLinks: [] }],
    });
    expect(merged.profiles.some((p) => p.profileKey === "gone")).toBe(false);
  });
});
