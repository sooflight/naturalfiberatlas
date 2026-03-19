/**
 * gallery-editor.tsx — Visual editor for a fiber's galleryImages array.
 *
 * The first image (index 0) is automatically used as the profile card hero.
 * Reordering images changes which one appears on the card.
 *
 * Features:
 *   - Reorder via arrow buttons — moving to front changes the hero
 *   - Thumbnail previews with broken-image detection
 *   - Inline editing for url, title, attribution, orientation
 *   - Add new / remove entries
 *   - Image count + orientation distribution stats
 *   - "Move to Front" promotes any gallery image to hero position
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { GalleryImageEntry } from "../../data/atlas-data";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  Copy,
  ChevronsUp,
  AlertTriangle,
  RectangleHorizontal,
  RectangleVertical,
  Star,
} from "lucide-react";

/* ── Shared styles ── */
const inputCls =
  "w-full px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors";
const inputStyle = { fontSize: "12px" };
const btnCls = "p-1 rounded text-white/30 hover:text-white/60 transition-colors cursor-pointer";

/* ── Orientation badge ── */
function OrientationBadge({ orientation }: { orientation?: "portrait" | "landscape" }) {
  if (!orientation) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-semibold ${
        orientation === "portrait"
          ? "bg-purple-400/10 text-purple-400/50 border border-purple-400/15"
          : "bg-blue-400/10 text-blue-400/50 border border-blue-400/15"
      }`}
    >
      {orientation === "portrait" ? (
        <RectangleVertical size={8} />
      ) : (
        <RectangleHorizontal size={8} />
      )}
      {orientation}
    </span>
  );
}

/* ── Single gallery image card ── */
function GalleryImageCard({
  image,
  index,
  total,
  isHero,
  onUpdate,
  onMove,
  onMoveToFront,
  onRemove,
}: {
  image: GalleryImageEntry;
  index: number;
  total: number;
  isHero: boolean;
  onUpdate: (patch: Partial<GalleryImageEntry>) => void;
  onMove: (dir: -1 | 1) => void;
  onMoveToFront: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [image.url]);

  return (
    <div
      className={`rounded-lg border overflow-hidden ${
        isHero
          ? "bg-blue-400/[0.03] border-blue-400/15"
          : "bg-white/[0.02] border-white/[0.04]"
      }`}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-2 p-1.5">
        {/* Thumbnail */}
        <div
          className={`w-12 h-12 rounded-md overflow-hidden bg-white/[0.04] shrink-0 flex items-center justify-center border ${
            isHero ? "border-blue-400/20" : "border-white/[0.06]"
          }`}
        >
          {image.url && !imgError ? (
            <img
              src={image.url}
              alt={image.title || `Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImageIcon
              size={16}
              className={imgError ? "text-red-400/40" : "text-white/15"}
            />
          )}
        </div>

        {/* Title / index */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isHero && (
              <Star size={10} className="text-blue-400/60 shrink-0" />
            )}
            <span
              className={`truncate ${isHero ? "text-blue-400/80" : "text-white/70"}`}
              style={{ fontSize: "11px" }}
            >
              {image.title || `Untitled #${index + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/20" style={{ fontSize: "9px" }}>
              {index + 1}/{total}
            </span>
            {isHero && (
              <span
                className="text-blue-400/40 uppercase tracking-wider"
                style={{ fontSize: "8px", fontWeight: 700 }}
              >
                Profile Card
              </span>
            )}
            <OrientationBadge orientation={image.orientation} />
            {imgError && (
              <AlertTriangle size={9} className="text-red-400/50" />
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isHero && (
            <button
              className={`${btnCls} text-blue-400/30 hover:text-blue-400/70`}
              onClick={onMoveToFront}
              title="Move to front (make profile image)"
            >
              <ChevronsUp size={11} />
            </button>
          )}
          <button
            className={btnCls}
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Move up"
            style={{ opacity: index === 0 ? 0.2 : 1 }}
          >
            <ArrowUp size={11} />
          </button>
          <button
            className={btnCls}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Move down"
            style={{ opacity: index === total - 1 ? 0.2 : 1 }}
          >
            <ArrowDown size={11} />
          </button>
          <button
            className={btnCls}
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown size={11} />
            ) : (
              <ChevronRight size={11} />
            )}
          </button>
          <button
            className={`${btnCls} text-red-400/30 hover:text-red-400/70`}
            onClick={onRemove}
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-2 border-t border-white/[0.04]">
          {/* URL */}
          <label className="block">
            <span
              className="block text-white/40 mb-1"
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              URL
            </span>
            <input
              type="text"
              value={image.url}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
              className={inputCls}
              style={inputStyle}
            />
          </label>

          {/* Title */}
          <label className="block">
            <span
              className="block text-white/40 mb-1"
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Title
            </span>
            <input
              type="text"
              value={image.title ?? ""}
              onChange={(e) =>
                onUpdate({ title: e.target.value || undefined })
              }
              placeholder="Image title..."
              className={inputCls}
              style={inputStyle}
            />
          </label>

          {/* Attribution */}
          <label className="block">
            <span
              className="block text-white/40 mb-1"
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Attribution
            </span>
            <input
              type="text"
              value={image.attribution ?? ""}
              onChange={(e) =>
                onUpdate({ attribution: e.target.value || undefined })
              }
              placeholder="Photographer / source..."
              className={inputCls}
              style={inputStyle}
            />
          </label>

          {/* Orientation */}
          <div>
            <span
              className="block text-white/40 mb-1"
              style={{
                fontSize: "10px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Orientation
            </span>
            <div className="flex gap-1.5">
              {(["landscape", "portrait", undefined] as const).map((ori) => (
                <button
                  key={ori ?? "auto"}
                  onClick={() => onUpdate({ orientation: ori })}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border cursor-pointer transition-colors ${
                    image.orientation === ori
                      ? "bg-white/[0.08] border-white/[0.15] text-white/80"
                      : "bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.1]"
                  }`}
                  style={{ fontSize: "10px" }}
                >
                  {ori === "landscape" && <RectangleHorizontal size={10} />}
                  {ori === "portrait" && <RectangleVertical size={10} />}
                  {ori === undefined ? "Auto" : ori}
                </button>
              ))}
            </div>
          </div>

          {/* Copy URL */}
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={() => navigator.clipboard.writeText(image.url)}
              className="flex items-center gap-1 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-md text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              style={{ fontSize: "10px" }}
              title="Copy URL"
            >
              <Copy size={9} /> Copy URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Gallery Editor
   ══════════════════════════════════════════════════════════ */

export function GalleryEditor({
  images,
  onChange,
}: {
  images: GalleryImageEntry[];
  onChange: (images: GalleryImageEntry[]) => void;
}) {
  const [draft, setDraft] = useState<GalleryImageEntry[]>(images);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync from props when fiber changes */
  useEffect(() => {
    setDraft(images);
  }, [images]);

  const push = useCallback(
    (next: GalleryImageEntry[]) => {
      setDraft(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(next);
      }, 300);
    },
    [onChange],
  );

  const updateImage = (
    index: number,
    patch: Partial<GalleryImageEntry>,
  ) => {
    const next = draft.map((img, i) =>
      i === index ? { ...img, ...patch } : img,
    );
    push(next);
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    push(next);
  };

  const moveToFront = (index: number) => {
    if (index === 0) return;
    const next = [...draft];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    push(next);
  };

  const removeImage = (index: number) => {
    push(draft.filter((_, i) => i !== index));
  };

  const addImage = () => {
    push([...draft, { url: "", title: "" }]);
  };

  /* Stats */
  const portraitCount = draft.filter(
    (img) => img.orientation === "portrait",
  ).length;
  const landscapeCount = draft.filter(
    (img) => img.orientation === "landscape",
  ).length;
  const autoCount = draft.length - portraitCount - landscapeCount;

  return (
    <div className="space-y-2">
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <span className="text-white/30" style={{ fontSize: "10px" }}>
          {draft.length} image{draft.length !== 1 ? "s" : ""}
          {draft.length > 0 && (
            <span className="text-blue-400/30 ml-1">
              · #1 = profile card
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {landscapeCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-blue-400/40"
              style={{ fontSize: "9px" }}
            >
              <RectangleHorizontal size={8} /> {landscapeCount}
            </span>
          )}
          {portraitCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-purple-400/40"
              style={{ fontSize: "9px" }}
            >
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

      {/* Thumbnail strip (visual overview) */}
      {draft.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {draft.map((img, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-md overflow-hidden bg-white/[0.04] shrink-0 border relative ${
                i === 0
                  ? "border-blue-400/30 ring-1 ring-blue-400/15"
                  : "border-white/[0.06]"
              }`}
            >
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.title || ""}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={10} className="text-white/10" />
                </div>
              )}
              {i === 0 && (
                <Star
                  size={7}
                  className="absolute top-0.5 left-0.5 text-blue-400/70"
                />
              )}
              <span
                className="absolute bottom-0 right-0 bg-black/60 text-white/50 px-1 rounded-tl"
                style={{ fontSize: "7px" }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Image cards */}
      {draft.map((img, i) => (
        <GalleryImageCard
          key={i}
          image={img}
          index={i}
          total={draft.length}
          isHero={i === 0}
          onUpdate={(patch) => updateImage(i, patch)}
          onMove={(dir) => moveImage(i, dir)}
          onMoveToFront={() => moveToFront(i)}
          onRemove={() => removeImage(i)}
        />
      ))}

      {/* Add button */}
      <button
        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] border-dashed rounded-md text-white/40 hover:text-white/60 hover:border-white/20 transition-colors cursor-pointer w-full justify-center"
        onClick={addImage}
        style={{ fontSize: "11px" }}
      >
        <Plus size={12} /> Add Image
      </button>

      {draft.length === 0 && (
        <div
          className="text-center py-4 text-white/15"
          style={{ fontSize: "11px" }}
        >
          No gallery images. Add images to create a contact sheet.
        </div>
      )}
    </div>
  );
}
