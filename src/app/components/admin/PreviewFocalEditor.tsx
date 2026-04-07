import { X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { clamp01, previewFocalToObjectPosition, type PreviewFocalPoint } from "../../utils/preview-focal";

export interface PreviewFocalEditorProps {
  imageSrc: string;
  initialFocal: PreviewFocalPoint;
  onSave: (focal: PreviewFocalPoint) => void;
  /** Dropped from stored metadata (default browser centering). */
  onRemoveCustom?: () => void;
  onClose: () => void;
}

/**
 * Click the preview (3:4 frame, object-cover) to set the grid card focal point.
 */
export function PreviewFocalEditor({
  imageSrc,
  initialFocal,
  onSave,
  onRemoveCustom,
  onClose,
}: PreviewFocalEditorProps) {
  const [focal, setFocal] = useState<PreviewFocalPoint>(() => ({
    x: clamp01(initialFocal.x),
    y: clamp01(initialFocal.y),
  }));

  const handlePointer = useCallback((clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    setFocal({
      x: clamp01((clientX - r.left) / r.width),
      y: clamp01((clientY - r.top) / r.height),
    });
  }, []);

  const objectPosition = previewFocalToObjectPosition(focal) ?? "50% 50%";

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Set preview focal point"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.1] bg-neutral-950 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Grid preview focal</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Click where the portrait crop should anchor (matches public grid 3:4 frame).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-white/[0.08] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="relative mx-auto aspect-[3/4] w-full max-h-[min(55vh,420px)] cursor-crosshair overflow-hidden rounded-lg border border-white/[0.08] bg-black"
          onClick={(e) => handlePointer(e.clientX, e.clientY, e.currentTarget)}
        >
          <img
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover select-none"
            style={{ objectPosition }}
            draggable={false}
          />
          <div
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{
              left: `${focal.x * 100}%`,
              top: `${focal.y * 100}%`,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
            }}
            aria-hidden
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-[11px] text-neutral-400 hover:text-white"
              onClick={() => setFocal({ x: 0.5, y: 0.5 })}
            >
              Reset center
            </button>
            {onRemoveCustom ? (
              <button
                type="button"
                className="text-[11px] text-neutral-500 hover:text-red-300"
                onClick={() => {
                  onRemoveCustom();
                  onClose();
                }}
              >
                Clear custom
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/[0.08]"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              onClick={() => onSave(focal)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
