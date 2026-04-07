/**
 * ImageLightbox - Fullscreen image preview with zoom and cropping capabilities.
 */

import React, { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ImageLightboxProps } from './types';
import {
  buildCropUrl,
  canApplyCloudinaryCrop,
  isCloudinaryUrl,
  stripCropTransform,
} from '@/utils/cloudinary';
import {
  clampRectToBox,
  cropElementRectToSourcePixels,
  getObjectContainContentRect,
  getPointerInImageContentCoords,
} from "@/utils/object-contain-crop";

// Icons
const XIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
);
const ChevronL = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
);
const ChevronR = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
);
const CropIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 2v4m0 0H2m4 0h10a2 2 0 012 2v10m0 0v4m0-4h4M6 6v10a2 2 0 002 2h10" /></svg>
);
const DownloadIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v11m0 0l4-4m-4 4l-4-4M4 20h16" /></svg>
);

const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="96"><rect fill="#111" width="128" height="96"/><line x1="0" y1="0" x2="128" y2="96" stroke="#222"/><line x1="128" y1="0" x2="0" y2="96" stroke="#222"/></svg>'
);

export function ImageLightbox({
  urls,
  startIndex,
  label,
  entryKey,
  onClose,
  startCropRef,
  onCropFeedback,
  onCropImage,
  onContextMenuImage,
  onDownloadImage,
  onNavigateProfile,
  era,
  origin,
  scientific,
}: ImageLightboxProps) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx(i => (i - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % urls.length), [urls.length]);
  const [isChromeActive, setIsChromeActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [cropping, setCropping] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [hoverCursor, setHoverCursor] = useState('crosshair');
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    zone: string;
    sx: number;
    sy: number;
    sr: { x: number; y: number; w: number; h: number };
    anchor: { x?: number; y?: number };
    captureEl?: HTMLElement;
    pointerId?: number;
  } | null>(null);
  const cropAwaitingDimensionsRef = useRef(false);
  const croppingRef = useRef(false);
  const cropRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [sourceReady, setSourceReady] = useState(false);

  const currentUrl = urls[idx];
  const canCrop =
    isCloudinaryUrl(currentUrl) && canApplyCloudinaryCrop(currentUrl) && !!onCropImage;
  const chromeVisible = cropping || isChromeActive;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  useLayoutEffect(() => {
    const el = imgRef.current;
    setSourceReady(Boolean(el?.complete && el.naturalWidth > 0));
  }, [currentUrl, idx]);

  useEffect(() => {
    croppingRef.current = cropping;
  }, [cropping]);

  useEffect(() => {
    cropRectRef.current = cropRect;
  }, [cropRect]);

  useEffect(() => {
    if (!cropping) return;
    const onResize = () => {
      const el = imgRef.current;
      const r = cropRectRef.current;
      if (!el || !r) return;
      const box = getObjectContainContentRect(el);
      setCropRect(clampRectToBox(r.x, r.y, r.w, r.h, box));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [cropping]);

  const cropSourcePixels = useMemo(() => {
    if (!cropping || !cropRect || !sourceReady) return null;
    const el = imgRef.current;
    if (!el?.naturalWidth) return null;
    return cropElementRectToSourcePixels(cropRect, getObjectContainContentRect(el), el.naturalWidth, el.naturalHeight);
  }, [cropping, cropRect, sourceReady, currentUrl, idx]);

  const startCropping = useCallback(() => {
    setCropping(true);
    setAspectRatio(null);
    cropAwaitingDimensionsRef.current = true;
    requestAnimationFrame(() => {
      const el = imgRef.current;
      if (!el) return;
      const c = getObjectContainContentRect(el);
      setCropRect({ x: c.offsetX, y: c.offsetY, w: c.width, h: c.height });
      if (el.naturalWidth > 0) cropAwaitingDimensionsRef.current = false;
    });
  }, []);

  useLayoutEffect(() => {
    if (!startCropRef) return;
    if (!canCrop) {
      startCropRef.current = null;
      return () => {
        startCropRef.current = null;
      };
    }
    startCropRef.current = () => {
      startCropping();
    };
    return () => {
      startCropRef.current = null;
    };
  }, [startCropRef, canCrop, startCropping]);
  const cancelCrop = () => {
    cropAwaitingDimensionsRef.current = false;
    setCropping(false);
    setCropRect(null);
  };

  const applyCrop = useCallback(() => {
    if (!cropRect || !imgRef.current || cropRect.w < 5 || cropRect.h < 5) return;
    const img = imgRef.current;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const content = getObjectContainContentRect(img);
    const mapped = cropElementRectToSourcePixels(cropRect, content, img.naturalWidth, img.naturalHeight);
    if (!mapped || mapped.width < 1 || mapped.height < 1) return;
    const baseUrl = stripCropTransform(urls[idx]);
    if (!canApplyCloudinaryCrop(baseUrl)) {
      onCropFeedback?.('This image URL does not support in-place cropping (needs Cloudinary upload or fetch delivery).');
      return;
    }
    const newUrl = buildCropUrl(baseUrl, {
      x: mapped.x,
      y: mapped.y,
      width: mapped.width,
      height: mapped.height,
    });
    if (newUrl === baseUrl) {
      onCropFeedback?.('Could not build a crop URL for this asset.');
      return;
    }
    onCropImage!(entryKey, idx, newUrl);
    cropAwaitingDimensionsRef.current = false;
    setCropping(false);
    setCropRect(null);
  }, [cropRect, urls, idx, entryKey, onCropImage, onCropFeedback]);

  const resetCrop = () => {
    const baseUrl = stripCropTransform(currentUrl);
    if (baseUrl !== currentUrl) onCropImage!(entryKey, idx, baseUrl);
    cropAwaitingDimensionsRef.current = false;
    setCropping(false);
    setCropRect(null);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (cropping) cancelCrop(); else onClose(); }
      if (e.key === 'Enter' && cropping) { e.preventDefault(); applyCrop(); }
      if (!cropping && e.key === 'ArrowLeft') prev();
      if (!cropping && e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose, prev, next, cropping, applyCrop]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (cropping || prefersReducedMotion) {
      setIsChromeActive(true);
      return;
    }
    const timer = window.setTimeout(() => setIsChromeActive(false), 1700);
    return () => window.clearTimeout(timer);
  }, [cropping, idx, prefersReducedMotion]);

  const HR = 10;
  const getZone = useCallback((px: number, py: number): string => {
    if (!cropRect) return 'draw';
    const { x, y, w, h } = cropRect;
    const nL = Math.abs(px - x) <= HR, nR = Math.abs(px - (x + w)) <= HR;
    const nT = Math.abs(py - y) <= HR, nB = Math.abs(py - (y + h)) <= HR;
    if (nT && nL) return 'nw'; if (nT && nR) return 'ne';
    if (nB && nL) return 'sw'; if (nB && nR) return 'se';
    if (nT && px > x + HR && px < x + w - HR) return 'n';
    if (nB && px > x + HR && px < x + w - HR) return 's';
    if (nL && py > y + HR && py < y + h - HR) return 'w';
    if (nR && py > y + HR && py < y + h - HR) return 'e';
    if (px >= x && px <= x + w && py >= y && py <= y + h) return 'move';
    return 'draw';
  }, [cropRect]);

  const CURSORS: Record<string, string> = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', w: 'ew-resize', e: 'ew-resize', move: 'move', draw: 'crosshair' };

  const onOverlayMove = (e: React.PointerEvent) => {
    if (dragRef.current || !imgRef.current) return;
    const { px, py } = getPointerInImageContentCoords(imgRef.current, e.clientX, e.clientY);
    setHoverCursor(CURSORS[getZone(px, py)] || 'crosshair');
  };

  const onOverlayDown = (e: React.PointerEvent) => {
    if (!imgRef.current) return;
    e.preventDefault();
    const el = imgRef.current;
    const { px, py } = getPointerInImageContentCoords(el, e.clientX, e.clientY);
    const zone = getZone(px, py);
    const cr = cropRect || { x: px, y: py, w: 0, h: 0 };
    let anchor: { x?: number; y?: number };
    if (zone === 'nw') anchor = { x: cr.x + cr.w, y: cr.y + cr.h };
    else if (zone === 'ne') anchor = { x: cr.x, y: cr.y + cr.h };
    else if (zone === 'sw') anchor = { x: cr.x + cr.w, y: cr.y };
    else if (zone === 'se') anchor = { x: cr.x, y: cr.y };
    else if (zone === 'n') anchor = { y: cr.y + cr.h };
    else if (zone === 's') anchor = { y: cr.y };
    else if (zone === 'w') anchor = { x: cr.x + cr.w };
    else if (zone === 'e') anchor = { x: cr.x };
    else if (zone === 'draw') anchor = { x: px, y: py };
    else anchor = {};

    if (zone === 'draw') setCropRect({ x: px, y: py, w: 0, h: 0 });

    const captureEl = e.currentTarget as HTMLElement;
    if (typeof captureEl.setPointerCapture === "function") {
      try {
        captureEl.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    dragRef.current = { zone, sx: px, sy: py, sr: { ...cr }, anchor, captureEl, pointerId: e.pointerId };

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      const elMove = imgRef.current;
      if (!d || !elMove) return;
      const box = getObjectContainContentRect(elMove);
      const { px: cx, py: cy } = getPointerInImageContentCoords(elMove, ev.clientX, ev.clientY);

      if (d.zone === 'move') {
        const nx = clamp(d.sr.x + (cx - d.sx), box.offsetX, box.offsetX + box.width - d.sr.w);
        const ny = clamp(d.sr.y + (cy - d.sy), box.offsetY, box.offsetY + box.height - d.sr.h);
        setCropRect({ x: nx, y: ny, w: d.sr.w, h: d.sr.h });
        return;
      }

      let nx: number;
      let ny: number;
      let nw: number;
      let nh: number;
      const a = d.anchor;

      if (d.zone === 'n' || d.zone === 's') {
        nx = d.sr.x;
        nw = d.sr.w;
        ny = Math.min(a.y!, cy);
        nh = Math.abs(cy - a.y!);
        if (aspectRatio) {
          nw = nh * aspectRatio;
          nx = d.sr.x + (d.sr.w - nw) / 2;
        }
      } else if (d.zone === 'w' || d.zone === 'e') {
        ny = d.sr.y;
        nh = d.sr.h;
        nx = Math.min(a.x!, cx);
        nw = Math.abs(cx - a.x!);
        if (aspectRatio) {
          nh = nw / aspectRatio;
          ny = d.sr.y + (d.sr.h - nh) / 2;
        }
      } else {
        nx = Math.min(a.x!, cx);
        ny = Math.min(a.y!, cy);
        nw = Math.abs(cx - a.x!);
        nh = Math.abs(cy - a.y!);
        if (aspectRatio) {
          nh = nw / aspectRatio;
          if (cy < a.y!) ny = a.y! - nh;
        }
      }

      const clamped = clampRectToBox(nx, ny, nw, nh, box);
      setCropRect(clamped);
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d?.captureEl != null && d.pointerId != null) {
        try {
          d.captureEl.releasePointerCapture(d.pointerId);
        } catch {
          /* ignore */
        }
      }
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const RATIOS = [{ l: 'Free', v: null as number | null }, { l: '4 : 3', v: 4 / 3 }, { l: '1 : 1', v: 1 }, { l: '16 : 9', v: 16 / 9 }];
  const pickRatio = (v: number | null) => {
    setAspectRatio(v);
    if (v && cropRect && imgRef.current) {
      const b = getObjectContainContentRect(imgRef.current);
      const cx = cropRect.x + cropRect.w / 2;
      const cy = cropRect.y + cropRect.h / 2;
      let nw = cropRect.w;
      let nh = nw / v;
      if (nh > b.height) {
        nh = b.height;
        nw = nh * v;
      }
      if (nw > b.width) {
        nw = b.width;
        nh = nw / v;
      }
      setCropRect(clampRectToBox(cx - nw / 2, cy - nh / 2, nw, nh, b));
    }
  };

  const cr = cropRect;
  const showCrop = cr && cr.w > 2 && cr.h > 2;

  return (
    <div
      data-testid="lightbox-root"
      className="fixed inset-0 z-[90] bg-black/90 flex flex-col"
      onClick={onClose}
      onPointerMove={() => setIsChromeActive(true)}
    >
      <div
        data-testid="lightbox-top-cluster"
        className={`pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-20'}`}
      >
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/75 px-3 py-2 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="text-white/90 text-sm font-medium">
            {label} <span className="text-neutral-400 ml-2">{idx + 1}/{urls.length}</span>
            {(era || origin || scientific) && <span className="text-neutral-600 text-[11px] font-mono italic ml-3">{[era, origin, scientific].filter(Boolean).join(' · ')}</span>}
          </div>
          {canCrop && !cropping && (
            <button
              onClick={startCropping}
              aria-label="Crop image"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-xs transition-colors"
            >
              <CropIcon className="w-3.5 h-3.5" />
              Crop
            </button>
          )}
          {!cropping && (
            <button
              onClick={() => onDownloadImage?.(currentUrl, idx)}
              aria-label="Download Image"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-xs transition-colors"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Download Image
            </button>
          )}
          {cropping && (
            <div className="flex items-center gap-1.5" role="group" aria-label="Crop controls">
              {RATIOS.map(r => (
                <button key={r.l} onClick={() => pickRatio(r.v)} className={`px-2 py-0.5 rounded text-[11px] transition-colors ${aspectRatio === r.v ? 'bg-white text-black font-semibold' : 'text-neutral-500 hover:text-white'}`}>{r.l}</button>
              ))}
              <div className="w-px h-4 bg-neutral-700 mx-1" />
              {cropSourcePixels && (
                <span className="text-[11px] text-neutral-500 tabular-nums hidden sm:inline" aria-live="polite">
                  {Math.round(cropSourcePixels.width)}×{Math.round(cropSourcePixels.height)} px
                </span>
              )}
              <button
                onClick={applyCrop}
                disabled={!cr || cr.w < 5 || !sourceReady}
                className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-30"
              >
                Apply ⏎
              </button>
              <button onClick={resetCrop} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs transition-colors">Reset</button>
              <button onClick={cancelCrop} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs transition-colors">Cancel</button>
            </div>
          )}
          <button onClick={onClose} aria-label="Close lightbox" className="p-2 text-neutral-400 hover:text-white"><XIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 px-16 pb-8 relative" onClick={e => e.stopPropagation()}>
        {urls.length > 1 && !cropping && (
          <button
            onClick={prev}
            aria-label="Previous image"
            className={`absolute left-2 md:left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10 transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <ChevronL className="w-6 h-6" />
          </button>
        )}
        <div className="relative isolate inline-block max-w-full max-h-full">
          <div
            data-testid="lightbox-image-stage"
            aria-hidden
            className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl border border-white/10 bg-black/35 shadow-[0_18px_80px_rgba(0,0,0,0.55)]"
          />
          <img
            ref={imgRef}
            src={currentUrl}
            alt={`${label} ${idx + 1}`}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg select-none"
            onContextMenu={(event) => {
              if (cropping) return;
              onContextMenuImage?.(event, currentUrl, idx);
            }}
            onLoad={() => {
              setSourceReady(true);
              if (croppingRef.current && cropAwaitingDimensionsRef.current && imgRef.current) {
                const c = getObjectContainContentRect(imgRef.current);
                setCropRect({ x: c.offsetX, y: c.offsetY, w: c.width, h: c.height });
                cropAwaitingDimensionsRef.current = false;
              }
            }}
            onError={e => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = PLACEHOLDER;
              setSourceReady(false);
            }}
          />
          {cropping && (
            <div
              className="absolute inset-0 rounded-lg"
              style={{ cursor: hoverCursor }}
              onPointerMove={onOverlayMove}
              onPointerDown={onOverlayDown}
            >
              {showCrop && cr && (
                <>
                  <div className="absolute bg-black/60 left-0 right-0 top-0 transition-all duration-75" style={{ height: cr.y }} />
                  <div className="absolute bg-black/60 left-0 right-0" style={{ top: cr.y + cr.h, bottom: 0 }} />
                  <div className="absolute bg-black/60 left-0" style={{ top: cr.y, height: cr.h, width: cr.x }} />
                  <div className="absolute bg-black/60 right-0" style={{ top: cr.y, height: cr.h, left: cr.x + cr.w }} />

                  <div className="absolute border-[1.5px] border-white/90 pointer-events-none" style={{ left: cr.x, top: cr.y, width: cr.w, height: cr.h }}>
                    <div className="absolute inset-0 border border-white/30" style={{ background: 'repeating-linear-gradient(90deg,transparent,transparent 10px,rgba(255,255,255,0.1) 10px,rgba(255,255,255,0.1) 20px)' }} />
                    <div className="absolute" style={{ left: -4, top: -4, width: 8, height: 8, borderLeft: '2px solid white', borderTop: '2px solid white' }} />
                    <div className="absolute" style={{ right: -4, top: -4, width: 8, height: 8, borderRight: '2px solid white', borderTop: '2px solid white' }} />
                    <div className="absolute" style={{ left: -4, bottom: -4, width: 8, height: 8, borderLeft: '2px solid white', borderBottom: '2px solid white' }} />
                    <div className="absolute" style={{ right: -4, bottom: -4, width: 8, height: 8, borderRight: '2px solid white', borderBottom: '2px solid white' }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {urls.length > 1 && !cropping && (
          <button
            onClick={next}
            aria-label="Next image"
            className={`absolute right-2 md:right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white z-10 transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <ChevronR className="w-6 h-6" />
          </button>
        )}
      </div>

      {urls.length > 1 && (
        <div
          data-testid="lightbox-filmstrip-dock"
          className={`mx-auto mb-3 flex-none flex justify-center gap-2 py-2 px-3 rounded-2xl border border-white/10 bg-neutral-950/60 transition-opacity ${chromeVisible ? 'opacity-100' : 'opacity-30'}`}
          onClick={e => e.stopPropagation()}
        >
          {urls.map((u, i) => (
            <button key={i} onClick={() => { setIdx(i); cancelCrop(); }} className={`w-12 h-9 rounded overflow-hidden border-2 transition-all ${i === idx ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}>
              <img src={u} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = PLACEHOLDER; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
