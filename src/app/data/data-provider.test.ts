import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageSource } from "./data-provider";
import { fibers as bundledFibers } from "./fibers";
import { careData as bundledCareData } from "./atlas-data";

const FIBERS_KEY = "atlas:fibers";
const WORLD_NAMES_KEY = "atlas:worldNames";
const CARE_DATA_KEY = "atlas:careData";

describe("LocalStorageSource critical flows", () => {
  const sampleFiber = bundledFibers[0];

  beforeEach(() => {
    localStorage.clear();
  });

  it("importJSON writes expected storage keys and notifies subscribers", () => {
    const source = new LocalStorageSource();
    const notify = vi.fn();
    source.subscribe(notify);

    source.importJSON(
      JSON.stringify({
        fibers: {
          [sampleFiber.id]: {
            name: "Imported Fiber Name",
          },
        },
        worldNames: {
          [sampleFiber.id]: ["Imported Region"],
        },
      }),
    );

    const fiberOverrides = JSON.parse(localStorage.getItem(FIBERS_KEY) ?? "{}");
    const worldNames = JSON.parse(localStorage.getItem(WORLD_NAMES_KEY) ?? "{}");

    expect(fiberOverrides[sampleFiber.id].name).toBe("Imported Fiber Name");
    expect(worldNames[sampleFiber.id]).toEqual(["Imported Region"]);
    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Imported Fiber Name");
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("merge(local-wins) reports conflicts and preserves local value", () => {
    const source = new LocalStorageSource();
    source.updateFiber(sampleFiber.id, { name: "Local Name" });

    const conflicts = source.merge(
      JSON.stringify({
        fibers: {
          [sampleFiber.id]: { name: "Remote Name" },
        },
      }),
      "local-wins",
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      table: "fibers",
      fiberId: sampleFiber.id,
      field: "name",
      localValue: "Local Name",
      remoteValue: "Remote Name",
    });
    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Local Name");
  });

  it("merge(remote-wins) reports conflicts and applies remote value", () => {
    const source = new LocalStorageSource();
    source.updateFiber(sampleFiber.id, { name: "Local Name" });

    const conflicts = source.merge(
      JSON.stringify({
        fibers: {
          [sampleFiber.id]: { name: "Remote Name" },
        },
      }),
      "remote-wins",
    );

    expect(conflicts).toHaveLength(1);
    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Remote Name");
  });

  it("supports undo/redo for representative fiber field update", () => {
    const source = new LocalStorageSource();
    const originalName = sampleFiber.name;

    source.updateFiber(sampleFiber.id, { name: "Edited Name" });
    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Edited Name");
    expect(source.canUndo()).toBe(true);

    const undone = source.undo();
    expect(undone?.field).toBe("name");
    expect(source.getFiberById(sampleFiber.id)?.name).toBe(originalName);
    expect(source.canRedo()).toBe(true);

    const redone = source.redo();
    expect(redone?.field).toBe("name");
    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Edited Name");
  });

  it("syncs profile image to gallery hero when galleryImages patch is provided", () => {
    const source = new LocalStorageSource();
    const heroUrl = "https://example.com/new-hero.jpg";
    const secondaryUrl = "https://example.com/secondary.jpg";

    source.updateFiber(sampleFiber.id, {
      galleryImages: [{ url: heroUrl }, { url: secondaryUrl }],
    });

    const updated = source.getFiberById(sampleFiber.id);
    expect(updated?.galleryImages[0]?.url).toBe(heroUrl);
    expect(updated?.image).toBe(heroUrl);
  });

  it("returns compatibility sustainability defaults for editor consumers", () => {
    const source = new LocalStorageSource();
    const fiber = source.getFiberById(sampleFiber.id);

    expect(fiber?.sustainability).toBeTruthy();
    expect(fiber?.sustainability.waterUsage).toBeGreaterThanOrEqual(1);
    expect(fiber?.sustainability.waterUsage).toBeLessThanOrEqual(5);
    expect(Array.isArray(fiber?.sustainability.certifications)).toBe(true);
  });

  it("keeps a minimal hero gallery entry available at boot", () => {
    const source = new LocalStorageSource();
    const fiber = source.getFiberById(sampleFiber.id);
    expect(fiber?.galleryImages.length).toBeGreaterThan(0);
    expect(fiber?.galleryImages[0]?.url).toBe(sampleFiber.image);
  });

  it("returns care data with all required fields", () => {
    localStorage.setItem(
      CARE_DATA_KEY,
      JSON.stringify({
        [sampleFiber.id]: {
          washTemp: "Cold",
          dryMethod: "Line dry",
          ironTemp: "Low",
          specialNotes: "Override without uses",
        },
      }),
    );

    const source = new LocalStorageSource();
    const care = source.getCareData()[sampleFiber.id];

    expect(care.washTemp).toBe("Cold");
    expect(care.dryMethod).toBe("Line dry");
  });

  it("backfills missing care fields from bundled defaults for partial overrides", () => {
    localStorage.setItem(
      CARE_DATA_KEY,
      JSON.stringify({
        [sampleFiber.id]: {
          washTemp: "Very Cold",
        },
      }),
    );

    const source = new LocalStorageSource();
    const care = source.getCareData()[sampleFiber.id];
    const bundled = bundledCareData[sampleFiber.id];

    expect(care.washTemp).toBe("Very Cold");
    expect(care.dryMethod).toBe(bundled.dryMethod);
    expect(care.ironTemp).toBe(bundled.ironTemp);
    expect(care.specialNotes).toBe(bundled.specialNotes);
  });

  it("ignores invalid schemaVersion values in remote fiber patches", () => {
    const source = new LocalStorageSource();
    const bundledSchemaVersion = bundledFibers.find((f) => f.id === sampleFiber.id)?.schemaVersion;

    source.merge(
      JSON.stringify({
        fibers: {
          [sampleFiber.id]: {
            name: "Remote Name",
            schemaVersion: "invalid",
          },
        },
      }),
      "remote-wins",
    );

    const mergedFiber = source.getFiberById(sampleFiber.id);
    expect(mergedFiber?.name).toBe("Remote Name");
    expect(mergedFiber?.schemaVersion).toBe(bundledSchemaVersion);
    expect(typeof mergedFiber?.schemaVersion).toBe("number");
  });

  it("stores category override order independently from global order", () => {
    const source = new LocalStorageSource();
    const ids = bundledFibers.slice(0, 6).map((fiber) => fiber.id);
    const [a, b, c, d, e] = ids;

    source.setFiberOrder([c, b, a, d, e]);
    source.setFiberOrderForGroup("category:fiber", [b, a]);

    expect(source.getFiberOrder()).toEqual([c, b, a, d, e]);
    expect(source.getFiberOrderForGroup("category:fiber")).toEqual([b, a]);

    source.clearFiberOrderForGroup("category:fiber");

    expect(source.getFiberOrderForGroup("category:fiber")).toBeNull();
    expect(source.getFiberOrder()).toEqual([c, b, a, d, e]);
  });

  it("resolves hybrid order by applying group override to global baseline", () => {
    const source = new LocalStorageSource();
    const ids = bundledFibers.slice(0, 8).map((fiber) => fiber.id);
    const [a, b, c, d, e, f] = ids;

    source.setFiberOrder([f, e, d, c, b, a]);
    source.setFiberOrderForGroup("category:fiber", [b, a]);

    const resolved = source.resolveFiberOrder(ids, {
      groupId: "category:fiber",
      groupMemberIds: [a, b, c],
    });

    expect(resolved.slice(0, 6)).toEqual([f, e, d, b, a, c]);
  });

  it("restores snapshot payloads without JSON double-parse failures", () => {
    const source = new LocalStorageSource();

    source.updateFiber(sampleFiber.id, { name: "Snapshot Name" });
    const snapshotId = source.createSnapshot("before-edit");
    source.updateFiber(sampleFiber.id, { name: "After Snapshot" });

    source.restoreSnapshot(snapshotId);

    expect(source.getFiberById(sampleFiber.id)?.name).toBe("Snapshot Name");
  });

  it("gracefully handles localStorage write failures", () => {
    const source = new LocalStorageSource();
    const setItemSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });

    expect(() => {
      source.updateFiber(sampleFiber.id, { name: "Will Fail To Persist" });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
