/**
 * Map crop rectangles from element space to source pixels when an <img> uses object-fit: contain.
 * Without this, letterboxing makes Cloudinary c_crop coordinates wrong.
 */

export interface ObjectContainBox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export function getObjectContainContentRect(el: HTMLImageElement): ObjectContainBox {
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  const nw = el.naturalWidth;
  const nh = el.naturalHeight;
  if (!cw || !ch || !nw || !nh) {
    return { offsetX: 0, offsetY: 0, width: cw || 0, height: ch || 0 };
  }
  const imageRatio = nw / nh;
  const boxRatio = cw / ch;
  if (imageRatio > boxRatio) {
    const width = cw;
    const height = cw / imageRatio;
    return { offsetX: 0, offsetY: (ch - height) / 2, width, height };
  }
  const height = ch;
  const width = ch * imageRatio;
  return { offsetX: (cw - width) / 2, offsetY: 0, width, height };
}

export function getPointerInImageContentCoords(
  el: HTMLImageElement,
  clientX: number,
  clientY: number
): { px: number; py: number } {
  const ir = el.getBoundingClientRect();
  const px = clientX - ir.left - el.clientLeft;
  const py = clientY - ir.top - el.clientTop;
  const w = el.clientWidth;
  const h = el.clientHeight;
  return { px: Math.max(0, Math.min(w, px)), py: Math.max(0, Math.min(h, py)) };
}

export function clampRectToBox(
  x: number,
  y: number,
  w: number,
  h: number,
  box: ObjectContainBox,
  minSide = 10
): { x: number; y: number; w: number; h: number } {
  let nw = Math.max(minSide, Math.min(w, box.width));
  let nh = Math.max(minSide, Math.min(h, box.height));
  let nx = Math.max(box.offsetX, Math.min(x, box.offsetX + box.width - nw));
  let ny = Math.max(box.offsetY, Math.min(y, box.offsetY + box.height - nh));
  if (nw > box.width) nw = box.width;
  if (nh > box.height) nh = box.height;
  nx = Math.max(box.offsetX, Math.min(nx, box.offsetX + box.width - nw));
  ny = Math.max(box.offsetY, Math.min(ny, box.offsetY + box.height - nh));
  return { x: nx, y: ny, w: nw, h: nh };
}

export function cropElementRectToSourcePixels(
  crop: { x: number; y: number; w: number; h: number },
  content: ObjectContainBox,
  naturalWidth: number,
  naturalHeight: number
): { x: number; y: number; width: number; height: number } | null {
  if (!naturalWidth || !naturalHeight || !content.width || !content.height) return null;
  const x1 = Math.max(crop.x, content.offsetX);
  const y1 = Math.max(crop.y, content.offsetY);
  const x2 = Math.min(crop.x + crop.w, content.offsetX + content.width);
  const y2 = Math.min(crop.y + crop.h, content.offsetY + content.height);
  const ew = x2 - x1;
  const eh = y2 - y1;
  if (ew < 1 || eh < 1) return null;
  const sx = naturalWidth / content.width;
  const sy = naturalHeight / content.height;
  return {
    x: (x1 - content.offsetX) * sx,
    y: (y1 - content.offsetY) * sy,
    width: ew * sx,
    height: eh * sy,
  };
}
