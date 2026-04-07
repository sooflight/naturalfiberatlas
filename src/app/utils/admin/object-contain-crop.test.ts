import { describe, expect, it } from "vitest";
import {
  clampRectToBox,
  cropElementRectToSourcePixels,
  getObjectContainContentRect,
} from "./object-contain-crop";

function mockImg(opts: {
  clientWidth: number;
  clientHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}): HTMLImageElement {
  const el = document.createElement("img");
  Object.defineProperty(el, "clientWidth", { value: opts.clientWidth, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: opts.clientHeight, configurable: true });
  Object.defineProperty(el, "naturalWidth", { value: opts.naturalWidth, configurable: true });
  Object.defineProperty(el, "naturalHeight", { value: opts.naturalHeight, configurable: true });
  return el;
}

describe("getObjectContainContentRect", () => {
  it("returns full box when natural dimensions are missing", () => {
    const el = mockImg({ clientWidth: 200, clientHeight: 100, naturalWidth: 0, naturalHeight: 0 });
    expect(getObjectContainContentRect(el)).toEqual({ offsetX: 0, offsetY: 0, width: 200, height: 100 });
  });

  it("letterboxes a wide image in a tall box (horizontal bands)", () => {
    const el = mockImg({ clientWidth: 100, clientHeight: 100, naturalWidth: 200, naturalHeight: 100 });
    expect(getObjectContainContentRect(el)).toEqual({ offsetX: 0, offsetY: 25, width: 100, height: 50 });
  });

  it("letterboxes a tall image in a wide box (vertical bands)", () => {
    const el = mockImg({ clientWidth: 100, clientHeight: 100, naturalWidth: 100, naturalHeight: 200 });
    expect(getObjectContainContentRect(el)).toEqual({ offsetX: 25, offsetY: 0, width: 50, height: 100 });
  });
});

describe("cropElementRectToSourcePixels", () => {
  it("maps a crop in element space to natural pixels using the content box", () => {
    const content = { offsetX: 0, offsetY: 25, width: 100, height: 50 };
    const crop = { x: 0, y: 25, w: 100, h: 50 };
    const out = cropElementRectToSourcePixels(crop, content, 200, 100);
    expect(out).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it("returns null when crop does not intersect content", () => {
    const content = { offsetX: 25, offsetY: 0, width: 50, height: 100 };
    const crop = { x: 0, y: 0, w: 20, h: 20 };
    expect(cropElementRectToSourcePixels(crop, content, 100, 200)).toBeNull();
  });

  it("matches legacy full-element math when image fills the box (no letterboxing)", () => {
    const content = { offsetX: 0, offsetY: 0, width: 100, height: 100 };
    const crop = { x: 10, y: 20, w: 30, h: 40 };
    const out = cropElementRectToSourcePixels(crop, content, 800, 600);
    expect(out).toEqual({ x: 80, y: 120, width: 240, height: 240 });
  });
});

describe("clampRectToBox", () => {
  it("keeps rect inside the content box", () => {
    const box = { offsetX: 10, offsetY: 20, width: 80, height: 60 };
    const r = clampRectToBox(0, 0, 200, 200, box);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.w).toBe(80);
    expect(r.h).toBe(60);
  });
});
