import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface UpscaleReviewModalProps {
  beforeUrl: string;
  afterUrl: string;
  onConfirm: () => void;
  onReject: () => void;
}

export default function UpscaleReviewModal({ beforeUrl, afterUrl, onConfirm, onReject }: UpscaleReviewModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onReject();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onReject]);

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Upscale Review</h2>
        <div className="text-xs text-neutral-400">Compare before and after, then confirm or reject.</div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
        <section className="min-h-0 rounded-xl border border-white/10 bg-neutral-950 flex flex-col overflow-hidden">
          <header className="shrink-0 px-3 py-2 text-xs text-neutral-400 border-b border-white/10">Before</header>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3">
            <img src={beforeUrl} alt="Before upscale" className="max-w-full max-h-full object-contain rounded-md" />
          </div>
        </section>
        <section className="min-h-0 rounded-xl border border-blue-400/40 bg-neutral-950 flex flex-col overflow-hidden">
          <header className="shrink-0 px-3 py-2 text-xs text-blue-300 border-b border-blue-400/30">After</header>
          <div className="flex-1 min-h-0 flex items-center justify-center p-3">
            <img src={afterUrl} alt="After upscale" className="max-w-full max-h-full object-contain rounded-md" />
          </div>
        </section>
      </div>
      <div className="shrink-0 flex items-center justify-end gap-2 p-3 border-t border-white/10">
        <button
          onClick={onReject}
          className="px-3 py-1.5 rounded-md text-xs font-medium border border-neutral-600 text-neutral-300 hover:text-white hover:border-neutral-400 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
        >
          Confirm Replace
        </button>
      </div>
    </div>,
    document.body
  );
}
