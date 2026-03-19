import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuState {
  x: number;
  y: number;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceProfile?: string;
  sourceIndex?: number;
  sourceCount?: number;
  batchIndices?: number[];
}

interface Props {
  menu: ContextMenuState;
  allProfiles: string[];
  onSend: (targetProfile: string) => void;
  onCopyToProfile?: (targetProfile: string) => void;
  onCopyImage?: () => void;
  onUpscale?: () => void;
  onReplaceUrl?: () => void;
  onSendToFront?: (profile: string, index: number) => void;
  onSendToBack?: (profile: string, index: number) => void;
  onBatchMove?: (profile: string, indices: number[], target: string) => void;
  onDeleteImage?: (profile: string, index: number) => void;
  onTransform?: (index: number) => void;
  onPromoteToHero?: (index: number) => void;
  onQuickEnhance?: (index: number, effect: "sharpen" | "improve" | "vibrance") => void;
  onClose: () => void;
}

const displayName = (key: string) => key.replace(/-/g, ' ');

export default function ImageContextMenu({
  menu,
  allProfiles,
  onSend,
  onCopyToProfile,
  onCopyImage,
  onUpscale,
  onReplaceUrl,
  onSendToFront,
  onSendToBack,
  onBatchMove,
  onDeleteImage,
  onTransform,
  onQuickEnhance,
  onClose,
}: Props) {
  const isBatch = menu.batchIndices && menu.batchIndices.length > 1;
  const batchCount = menu.batchIndices?.length ?? 0;
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'move' | 'copy'>('move');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  useEffect(() => {
    if (showPicker) inputRef.current?.focus();
  }, [showPicker]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = allProfiles.filter(k => k !== menu.sourceProfile);
    if (!q) return list.slice(0, 30);
    return list.filter(k => k.toLowerCase().includes(q)).slice(0, 30);
  }, [allProfiles, search, menu.sourceProfile]);

  const handleMove = useCallback((profile: string) => {
    if (isBatch && onBatchMove && menu.sourceProfile && menu.batchIndices) {
      onBatchMove(menu.sourceProfile, menu.batchIndices, profile);
    } else {
      onSend(profile);
    }
    onClose();
  }, [onSend, onBatchMove, onClose, isBatch, menu.sourceProfile, menu.batchIndices]);

  const handleCopyToProfile = useCallback((profile: string) => {
    if (!onCopyToProfile) return;
    onCopyToProfile(profile);
    onClose();
  }, [onCopyToProfile, onClose]);

  const clampedX = Math.min(menu.x, window.innerWidth - 240);
  const clampedY = Math.min(menu.y, window.innerHeight - (showPicker ? 340 : 120));

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: clampedX,
        top: clampedY,
        zIndex: 9999,
        minWidth: 200,
        maxWidth: 260,
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        animation: 'scout-cascade 0.15s ease-out',
      }}
    >
      {/* Header with thumbnail */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {!isBatch ? (
          <div style={{ width: 32, height: 24, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: '#222' }}>
            <img
              src={menu.thumbnailUrl || menu.imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <div style={{ width: 32, height: 24, borderRadius: 4, background: 'rgba(96,165,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgb(96,165,250)' }}>{batchCount}</span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isBatch ? (
            <div style={{ fontSize: 10, color: 'rgb(96,165,250)', whiteSpace: 'nowrap' }}>
              {batchCount} images selected
            </div>
          ) : menu.sourceProfile ? (
            <div style={{ fontSize: 9, color: '#666', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName(menu.sourceProfile)}
            </div>
          ) : null}
        </div>
      </div>

      {!showPicker ? (
        <div style={{ padding: '4px 0' }}>
          {!isBatch && menu.sourceProfile != null && menu.sourceIndex != null && menu.sourceIndex > 0 && onSendToFront && (
            <button
              onClick={() => {
                onSendToFront(menu.sourceProfile!, menu.sourceIndex!);
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#ddd', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
              Send to front
            </button>
          )}
          {!isBatch && menu.sourceProfile != null && menu.sourceIndex != null && menu.sourceCount != null && menu.sourceIndex < menu.sourceCount - 1 && onSendToBack && (
            <button
              onClick={() => {
                onSendToBack(menu.sourceProfile!, menu.sourceIndex!);
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#ddd', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Send to back
            </button>
          )}
          <button
            onClick={() => {
              setPickerMode('move');
              setShowPicker(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 12px', background: 'transparent', border: 'none',
              color: isBatch ? 'rgb(96,165,250)' : '#ddd', fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 3L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {isBatch ? `Move ${batchCount} to profile…` : 'Move to profile…'}
          </button>
          {!isBatch && !!onCopyToProfile && (
            <button
              onClick={() => {
                setPickerMode('copy');
                setShowPicker(true);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#ddd', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75m11.25-1.5h-9.75A1.125 1.125 0 007.5 6.375v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125z" />
              </svg>
              Copy to profile…
            </button>
          )}

          {!isBatch && !!onCopyImage && (
            <button
              onClick={() => {
                onCopyImage();
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#999', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75A2.25 2.25 0 016.75 4.5h7.5A2.25 2.25 0 0116.5 6.75v7.5a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 014.5 14.25v-7.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 11.25l2.25-2.25 1.875 1.875 1.875-1.875 1.5 1.5" />
              </svg>
              Copy image
            </button>
          )}
          {!isBatch && !!onUpscale && (
            <button
              onClick={() => {
                onUpscale();
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#999', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m9-9H3" />
              </svg>
              Upscale
            </button>
          )}
          {!isBatch && !!onTransform && menu.sourceIndex != null && (
            <button
              onClick={() => {
                onTransform(menu.sourceIndex!);
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#60a5fa', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 9.53a.75.75 0 011.06 0l2.47 2.47 2.47-2.47a.75.75 0 111.06 1.06l-2.47 2.47 2.47 2.47a.75.75 0 11-1.06 1.06l-2.47-2.47-2.47 2.47a.75.75 0 01-1.06-1.06l2.47-2.47-2.47-2.47a.75.75 0 010-1.06z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.345 6.345a4.5 4.5 0 116.364 6.364 4.5 4.5 0 01-6.364-6.364z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
              </svg>
              Transform (Crop/Effects)
            </button>
          )}

          {/* Quick Enhance Effects (Step 10) */}
          {!isBatch && !!onQuickEnhance && menu.sourceIndex != null && (
            <>
              <div style={{ padding: '4px 12px', fontSize: 10, color: '#666', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Quick Enhance
              </div>
              <button
                onClick={() => {
                  onQuickEnhance(menu.sourceIndex!, 'sharpen');
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 12px', background: 'transparent', border: 'none',
                  color: '#a78bfa', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(167,139,250,0.1)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Sharpen
              </button>
              <button
                onClick={() => {
                  onQuickEnhance(menu.sourceIndex!, 'improve');
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 12px', background: 'transparent', border: 'none',
                  color: '#60a5fa', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(96,165,250,0.1)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
                Auto-Improve
              </button>
              <button
                onClick={() => {
                  onQuickEnhance(menu.sourceIndex!, 'vibrance');
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 12px', background: 'transparent', border: 'none',
                  color: '#f472b6', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(244,114,182,0.1)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                Vibrance
              </button>
            </>
          )}

          {!isBatch && !!onReplaceUrl && (
            <button
              onClick={() => {
                onReplaceUrl();
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#999', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6H6.75A2.25 2.25 0 004.5 8.25v9A2.25 2.25 0 006.75 19.5h9A2.25 2.25 0 0018 17.25V13.5m-5.25-3.75H21m0 0v8.25m0-8.25l-9.75 9.75" />
              </svg>
              Replace URL
            </button>
          )}

          {menu.sourceProfile && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(menu.imageUrl);
                onClose();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 12px', background: 'transparent', border: 'none',
                color: '#999', fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75m11.25-1.5h-9.75A1.125 1.125 0 007.5 6.375v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125z" />
              </svg>
              Copy URL
            </button>
          )}

          <button
            onClick={() => {
              window.open(menu.imageUrl, '_blank');
              onClose();
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '7px 12px', background: 'transparent', border: 'none',
              color: '#999', fontSize: 12, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-2.25-4.125h5.25v5.25M15 9l6-6" />
            </svg>
            Open original
          </button>
          {!!onDeleteImage && menu.sourceProfile != null && menu.sourceIndex != null && (
            <>
              <div style={{ height: 1, background: 'rgba(239,68,68,0.2)', margin: '4px 0 2px' }} />
              <button
                onClick={() => {
                  onDeleteImage(menu.sourceProfile!, menu.sourceIndex!);
                  onClose();
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 12px', background: 'transparent', border: 'none',
                  color: 'rgb(248,113,113)', fontSize: 12, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.14)'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-9.75 0V6a1.5 1.5 0 011.5-1.5h4.5a1.5 1.5 0 011.5 1.5v1.5m-8.25 0h6.75m-7.5 0l.75 10.5a1.5 1.5 0 001.5 1.5h4.5a1.5 1.5 0 001.5-1.5l.75-10.5" />
                </svg>
                Delete
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 280 }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search profiles…"
              style={{
                width: '100%', padding: '5px 8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, fontSize: 11, color: '#fff', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = 'rgba(96,165,250,0.4)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onKeyDown={e => {
                if (e.key === 'Enter' && filtered.length > 0) {
                  e.preventDefault();
                  if (pickerMode === 'copy') handleCopyToProfile(filtered[0]);
                  else handleMove(filtered[0]);
                }
                if (e.key === 'Escape') { e.stopPropagation(); setShowPicker(false); setSearch(''); }
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 11, color: '#555' }}>No profiles found</div>
            )}
            {filtered.map(k => (
              <button
                key={k}
                onClick={() => {
                  if (pickerMode === 'copy') handleCopyToProfile(k);
                  else handleMove(k);
                }}
                style={{
                  display: 'block', width: '100%', padding: '5px 12px',
                  background: 'transparent', border: 'none', color: '#ccc',
                  fontSize: 11, cursor: 'pointer', textAlign: 'left',
                  textTransform: 'capitalize', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.target as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#ccc'; }}
              >
                {displayName(k)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
