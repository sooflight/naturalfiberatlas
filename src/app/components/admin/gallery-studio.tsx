/**
 * gallery-studio.tsx — Visual drag-and-drop gallery editor.
 *
 * C11: Replaces the linear list-based gallery editor with a visual
 * masonry board featuring large thumbnails, drag-to-reorder,
 * paste-to-add, bulk actions, and inline editing.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { GalleryImageEntry } from "../../data/atlas-data";
import {
  Star,
  Trash2,
  Plus,
  Clipboard,
  Image as ImageIcon,
  RectangleHorizontal,
  RectangleVertical,
  X,
  AlertTriangle,
  Pencil,
  ScanSearch,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { ImageContextActions } from "./image-context-actions";

/* ── Drag item type ── */
const GALLERY_IMAGE = "GALLERY_IMAGE";

interface DragItem {
  index: number;
  type: string;
}

/* ── Auto-detect orientation from loaded image ── */
function useAutoOrientation(url: string): "portrait" | "landscape" | null {
  const [result, setResult] = useState<"portrait" | "landscape" | null>(null);
  useEffect(() => {
    if (!url) { setResult(null); return; }
    const img = new Image();
    img.onload = () => {
      setResult(img.naturalHeight > img.naturalWidth ? "portrait" : "landscape");
    };
    img.onerror = () => setResult(null);
    img.src = url;
  }, [url]);
  return result;
}

/* ═══════════════════════════════════════════════════════════
   Draggable Gallery Tile
   ═══════════════════════════════════════════════════════════ */

interface GalleryTileProps {
  image: GalleryImageEntry;
  index: number;
  total: number;
  isHero: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onUpdate: (patch: Partial<GalleryImageEntry>) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onMoveToFront: () => void;
  onSendToFront: () => void;
  onSendToBack: () => void;
  onReplaceUrl: (nextUrl: string) => void;
  onRemove: () => void;
  onAutoOrient: (orientation: "portrait" | "landscape") => void;
}

function GalleryTile({
  image,
  index,
  total,
  isHero,
  isSelected,
  onToggleSelect,
  onUpdate,
  onMove,
  onMoveToFront,
  onSendToFront,
  onSendToBack,
  onReplaceUrl,
  onRemove,
  onAutoOrient,
}: GalleryTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const detectedOrientation = useAutoOrientation(image.url);

  useEffect(() => { setImgError(false); }, [image.url]);

  /* Drag source */
  const [{ isDragging }, drag] = useDrag({
    type: GALLERY_IMAGE,
    item: { index, type: GALLERY_IMAGE },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  /* Drop target */
  const [{ isOver }, drop] = useDrop({
    accept: GALLERY_IMAGE,
    hover(item: DragItem) {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  drag(drop(ref));

  const tileWidth = isHero ? "col-span-2 row-span-2" : "";
  const hasOrientationMismatch = detectedOrientation && image.orientation && detectedOrientation !== image.orientation;

  return (
    <div
      ref={ref}
      className={`relative group rounded-lg overflow-hidden border transition-all ${tileWidth} ${
        isDragging
          ? "opacity-30 scale-95"
          : isOver
            ? "ring-2 ring-blue-400/30"
            : isHero
              ? "border-blue-400/25 ring-1 ring-blue-400/10"
              : isSelected
                ? "border-blue-400/30 ring-1 ring-blue-400/15"
                : "border-white/[0.06] hover:border-white/[0.12]"
      }`}
      style={{
        aspectRatio: image.orientation === "portrait" ? "3/4" : "4/3",
        cursor: "grab",
        minHeight: isHero ? 240 : 120,
      }}
    >
      {/* Image */}
      {image.url && !imgError ? (
        <img
          src={image.url}
          alt={image.title || `Image ${index + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02]">
          <ImageIcon size={24} className={imgError ? "text-red-400/30" : "text-white/10"} />
        </div>
      )}

      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        className="absolute top-2 left-2 z-10 p-0.5 rounded bg-black/40 backdrop-blur-sm text-white/50 hover:text-white/90 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>

      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-400/20 backdrop-blur-sm border border-blue-400/30">
          <Star size={9} className="text-blue-400" />
          <span className="text-blue-400/90 uppercase tracking-wider" style={{ fontSize: "8px", fontWeight: 700 }}>
            Hero
          </span>
        </div>
      )}

      {/* Index badge */}
      <div
        className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white/50"
        style={{ fontSize: "10px" }}
      >
        {index + 1}/{total}
      </div>

      {/* Orientation badge */}
      {image.orientation && (
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-0.5">
          {hasOrientationMismatch && (
            <AlertTriangle size={10} className="text-blue-400/60" />
          )}
          <span
            className={`px-1 py-0.5 rounded backdrop-blur-sm ${
              image.orientation === "portrait"
                ? "bg-purple-400/20 text-purple-400/70"
                : "bg-blue-400/20 text-blue-400/70"
            }`}
            style={{ fontSize: "8px", fontWeight: 700, textTransform: "uppercase" }}
          >
            {image.orientation === "portrait" ? (
              <RectangleVertical size={8} className="inline" />
            ) : (
              <RectangleHorizontal size={8} className="inline" />
            )}
          </span>
        </div>
      )}

      {/* Hover action bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1 py-1.5 px-2 bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <ImageContextActions
            url={image.url}
            onPromoteHero={() => {
              if (!isHero) onMoveToFront();
            }}
            onSendFront={onSendToFront}
            onSendBack={onSendToBack}
            onReplaceUrl={onReplaceUrl}
            onCopyUrl={() => toast.success("URL copied")}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(!editing); }}
            className="p-1 rounded bg-black/40 text-white/50 hover:text-white/90 transition-colors cursor-pointer"
            title="Edit metadata"
          >
            <Pencil size={12} />
          </button>
          {detectedOrientation && detectedOrientation !== image.orientation && (
            <button
              onClick={(e) => { e.stopPropagation(); onAutoOrient(detectedOrientation); }}
              className="p-1 rounded bg-black/40 text-emerald-400/60 hover:text-emerald-400 transition-colors cursor-pointer"
              title={`Auto-detect: ${detectedOrientation}`}
            >
              <ScanSearch size={12} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded bg-black/40 text-red-400/50 hover:text-red-400 transition-colors cursor-pointer"
            title="Remove"
          >
            <Trash2 size={12} />
          </button>
        </div>

      {/* Inline edit popover */}
      {editing && (
        <div
          className="absolute inset-x-0 bottom-0 z-20 p-3 space-y-2 bg-[#0d0d0d]/95 backdrop-blur-xl border-t border-white/[0.08]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/40 uppercase tracking-wider" style={{ fontSize: "9px", fontWeight: 600 }}>
              Edit Image
            </span>
            <button onClick={() => setEditing(false)} className="text-white/30 hover:text-white/60 cursor-pointer">
              <X size={12} />
            </button>
          </div>
          <input
            type="text"
            value={image.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="Image URL..."
            className="w-full px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
            style={{ fontSize: "11px" }}
          />
          <input
            type="text"
            value={image.title ?? ""}
            onChange={(e) => onUpdate({ title: e.target.value || undefined })}
            placeholder="Title..."
            className="w-full px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
            style={{ fontSize: "11px" }}
          />
          <input
            type="text"
            value={image.attribution ?? ""}
            onChange={(e) => onUpdate({ attribution: e.target.value || undefined })}
            placeholder="Attribution..."
            className="w-full px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
            style={{ fontSize: "11px" }}
          />
          <div className="flex gap-1">
            {(["landscape", "portrait", undefined] as const).map((ori) => (
              <button
                key={ori ?? "auto"}
                onClick={() => onUpdate({ orientation: ori })}
                className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded border cursor-pointer transition-colors ${
                  image.orientation === ori
                    ? "bg-white/[0.08] border-white/[0.15] text-white/80"
                    : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50"
                }`}
                style={{ fontSize: "9px" }}
              >
                {ori === "landscape" && <RectangleHorizontal size={9} />}
                {ori === "portrait" && <RectangleVertical size={9} />}
                {ori === undefined ? "Auto" : ori}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title overlay */}
      {image.title && !editing && (
        <div
          className="absolute bottom-0 left-0 right-0 px-2 py-1.5 z-[5]"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
        >
          <span className="text-white/60 truncate block" style={{ fontSize: "10px" }}>
            {image.title}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Gallery Studio — Main Component
   ═══════════════════════════════════════════════════════════ */

export function GalleryStudio({
  images,
  onChange,
  fiberName,
}: {
  images: GalleryImageEntry[];
  onChange: (images: GalleryImageEntry[]) => void;
  fiberName?: string;
}) {
  const [draft, setDraft] = useState<GalleryImageEntry[]>(images);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Sync from props */
  useEffect(() => { setDraft(images); setSelected(new Set()); }, [images]);

  const push = useCallback(
    (next: GalleryImageEntry[]) => {
      setDraft(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(next), 300);
    },
    [onChange],
  );

  const updateImage = (index: number, patch: Partial<GalleryImageEntry>) => {
    const next = draft.map((img, i) => (i === index ? { ...img, ...patch } : img));
    push(next);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const next = [...draft];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    push(next);
  };

  const moveToFront = (index: number) => {
    if (index === 0) return;
    const next = [...draft];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    push(next);
    toast.success("Image promoted to hero");
  };

  const sendToFront = (index: number) => {
    moveToFront(index);
  };

  const sendToBack = (index: number) => {
    if (index < 0 || index >= draft.length - 1) return;
    const next = [...draft];
    const [item] = next.splice(index, 1);
    next.push(item);
    push(next);
  };

  const removeImage = (index: number) => {
    push(draft.filter((_, i) => i !== index));
    setSelected((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const addImage = () => {
    push([...draft, { url: "", title: "" }]);
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  /* Paste-to-add: paste a URL anywhere in the gallery */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        e.preventDefault();
        push([...draft, { url: text, title: "" }]);
        toast.success("Image pasted");
      }
    };
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [draft, push]);

  /* Bulk actions */
  const handleBulkSetOrientation = (orientation: "portrait" | "landscape") => {
    const next = draft.map((img, i) => (selected.has(i) ? { ...img, orientation } : img));
    push(next);
    toast.success(`Set ${selected.size} images to ${orientation}`);
    setSelected(new Set());
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selected.size} selected images?`)) return;
    const next = draft.filter((_, i) => !selected.has(i));
    push(next);
    setSelected(new Set());
    toast.success(`Deleted ${selected.size} images`);
  };

  const handleAutoDetectAll = () => {
    let count = 0;
    const next = [...draft];
    const promises = next.map((img, i) => {
      if (img.orientation || !img.url) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const imgEl = new Image();
        imgEl.onload = () => {
          next[i] = {
            ...next[i],
            orientation: imgEl.naturalHeight > imgEl.naturalWidth ? "portrait" : "landscape",
          };
          count++;
          resolve();
        };
        imgEl.onerror = () => resolve();
        imgEl.src = img.url;
      });
    });
    Promise.all(promises).then(() => {
      push(next);
      toast.success(`Auto-detected orientation for ${count} images`);
    });
  };

  /* Stats */
  const portraitCount = draft.filter((img) => img.orientation === "portrait").length;
  const landscapeCount = draft.filter((img) => img.orientation === "landscape").length;
  const autoCount = draft.length - portraitCount - landscapeCount;

  return (
    <DndProvider backend={HTML5Backend}>
      <div ref={containerRef} className="flex flex-col h-full" tabIndex={0}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="text-white/40" style={{ fontSize: "10px" }}>
              {draft.length} image{draft.length !== 1 ? "s" : ""}
              {draft.length > 0 && (
                <span className="text-blue-400/30 ml-1">· #1 = hero</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {landscapeCount > 0 && (
                <span className="flex items-center gap-0.5 text-blue-400/40" style={{ fontSize: "9px" }}>
                  <RectangleHorizontal size={8} /> {landscapeCount}
                </span>
              )}
              {portraitCount > 0 && (
                <span className="flex items-center gap-0.5 text-purple-400/40" style={{ fontSize: "9px" }}>
                  <RectangleVertical size={8} /> {portraitCount}
                </span>
              )}
              {autoCount > 0 && (
                <span className="text-white/20" style={{ fontSize: "9px" }}>
                  auto: {autoCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {autoCount > 0 && (
              <button
                onClick={handleAutoDetectAll}
                className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                style={{ fontSize: "10px" }}
                title="Auto-detect orientations"
              >
                <ScanSearch size={10} /> Detect
              </button>
            )}
            <button
              onClick={addImage}
              className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
            >
              <Plus size={10} /> Add
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/25 cursor-default"
              style={{ fontSize: "10px" }}
              title="Paste a URL to add"
            >
              <Clipboard size={10} /> Paste URL
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-400/[0.04] border-b border-blue-400/10">
            <span className="text-blue-400/60" style={{ fontSize: "10px", fontWeight: 600 }}>
              {selected.size} selected
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => handleBulkSetOrientation("landscape")}
                className="flex items-center gap-1 px-2 py-1 bg-blue-400/10 border border-blue-400/15 rounded text-blue-400/60 hover:text-blue-400 cursor-pointer"
                style={{ fontSize: "9px" }}
              >
                <RectangleHorizontal size={9} /> Landscape
              </button>
              <button
                onClick={() => handleBulkSetOrientation("portrait")}
                className="flex items-center gap-1 px-2 py-1 bg-purple-400/10 border border-purple-400/15 rounded text-purple-400/60 hover:text-purple-400 cursor-pointer"
                style={{ fontSize: "9px" }}
              >
                <RectangleVertical size={9} /> Portrait
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-2 py-1 bg-red-400/10 border border-red-400/15 rounded text-red-400/60 hover:text-red-400 cursor-pointer"
                style={{ fontSize: "9px" }}
              >
                <Trash2 size={9} /> Delete
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="p-1 text-white/30 hover:text-white/60 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Hero preview strip */}
        {draft.length > 0 && draft[0].url && (
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <div
              className="w-16 h-[calc(16px*4/3*4/3)] rounded-lg overflow-hidden border border-blue-400/20 bg-white/[0.04] shrink-0"
              style={{ aspectRatio: "3/4", width: 56 }}
            >
              <img src={draft[0].url} alt="Hero preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-blue-400/60 uppercase tracking-wider block" style={{ fontSize: "9px", fontWeight: 700 }}>
                Profile Card Preview
              </span>
              <span className="text-white/30 block" style={{ fontSize: "10px" }}>
                3:4 crop — {draft[0].title || "Untitled"}
              </span>
            </div>
          </div>
        )}

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {draft.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/[0.06] rounded-xl">
              <ImageIcon size={32} className="text-white/10 mb-3" />
              <span className="text-white/25 mb-1" style={{ fontSize: "12px" }}>
                No gallery images
              </span>
              <span className="text-white/15" style={{ fontSize: "10px" }}>
                Add images or paste URLs to create a gallery
              </span>
            </div>
          ) : (
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              }}
            >
              {draft.map((img, i) => (
                <GalleryTile
                  key={`${img.url}-${i}`}
                  image={img}
                  index={i}
                  total={draft.length}
                  isHero={i === 0}
                  isSelected={selected.has(i)}
                  onToggleSelect={() => toggleSelect(i)}
                  onUpdate={(patch) => updateImage(i, patch)}
                  onMove={moveImage}
                  onMoveToFront={() => moveToFront(i)}
                  onSendToFront={() => sendToFront(i)}
                  onSendToBack={() => sendToBack(i)}
                  onReplaceUrl={(nextUrl) => updateImage(i, { url: nextUrl })}
                  onRemove={() => removeImage(i)}
                  onAutoOrient={(ori) => updateImage(i, { orientation: ori })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
