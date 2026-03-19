import { describe, expect, it, vi } from "vitest";
import {
  applyAtlasStorageEntries,
  applyAtlasStorageEntriesWithVerification,
  computeStorageChecksum,
  exportAtlasStorageForBackup,
  extractAtlasStorageEntries,
  importAtlasStorageFromBackup,
} from "./dev-storage-sync";

function makeStorage(seed: Record<string, string>) {
  const data = new Map(Object.entries(seed));
  return {
    get length() {
      return data.size;
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

describe("dev storage sync", () => {
  it("extracts only atlas-prefixed keys", () => {
    const storage = makeStorage({
      "atlas:fibers": "{\"a\":1}",
      "atlas-images": "{\"b\":2}",
      "atlas-admin-settings": "{\"c\":3}",
      "random-key": "skip",
    });

    expect(extractAtlasStorageEntries(storage)).toEqual({
      "atlas:fibers": "{\"a\":1}",
      "atlas-images": "{\"b\":2}",
      "atlas-admin-settings": "{\"c\":3}",
    });
  });

  it("applies all received entries", () => {
    const storage = makeStorage({});
    const applied = applyAtlasStorageEntries(storage, {
      "atlas:fibers": "{\"foo\":1}",
      "atlas-tags": "{\"bar\":2}",
    });

    expect(applied).toBe(2);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.getItem("atlas:fibers")).toBe("{\"foo\":1}");
    expect(storage.getItem("atlas-tags")).toBe("{\"bar\":2}");
  });

  it("computeStorageChecksum returns deterministic hash for verification", () => {
    const entries = { "atlas:fibers": "{\"a\":1}", "atlas-tags": "{\"b\":2}" };
    const checksum = computeStorageChecksum(entries);
    expect(checksum).toMatch(/^atlas-tags:\d+\|atlas:fibers:\d+$/);
    expect(computeStorageChecksum(entries)).toBe(checksum);
  });

  it("applyAtlasStorageEntriesWithVerification returns metadata", () => {
    const storage = makeStorage({});
    const entries = { "atlas:fibers": "{\"foo\":1}", "atlas-tags": "{\"bar\":2}" };
    const result = applyAtlasStorageEntriesWithVerification(storage, entries);

    expect(result.applied).toBe(2);
    expect(result.keys).toEqual(["atlas:fibers", "atlas-tags"]);
    expect(result.checksum).toMatch(/^atlas-tags:\d+\|atlas:fibers:\d+$/);
  });

  it("exportAtlasStorageForBackup produces valid JSON", () => {
    const storage = makeStorage({ "atlas:fibers": "{\"a\":1}" });
    const json = exportAtlasStorageForBackup(storage);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual({ "atlas:fibers": "{\"a\":1}" });
  });

  it("importAtlasStorageFromBackup applies valid backup", () => {
    const storage = makeStorage({});
    const json = JSON.stringify({ "atlas:fibers": "{\"a\":1}", "atlas-tags": "{\"b\":2}" });
    const applied = importAtlasStorageFromBackup(json, storage);
    expect(applied).toBe(2);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("importAtlasStorageFromBackup returns 0 for malformed JSON", () => {
    const storage = makeStorage({});
    expect(importAtlasStorageFromBackup("not json", storage)).toBe(0);
    expect(importAtlasStorageFromBackup("", storage)).toBe(0);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("importAtlasStorageFromBackup skips non-atlas keys", () => {
    const storage = makeStorage({});
    const json = JSON.stringify({ "other-key": "value", "atlas:fibers": "{\"a\":1}" });
    const applied = importAtlasStorageFromBackup(json, storage);
    expect(applied).toBe(1);
  });
});
