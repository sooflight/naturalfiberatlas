interface UpscaleReviewModalProps {
  beforeUrl: string;
  afterUrl: string;
  onConfirm: () => void;
  onReject: () => void;
}

export function UpscaleReviewModal({
  beforeUrl,
  afterUrl,
  onConfirm,
  onReject,
}: UpscaleReviewModalProps) {
  return (
    <div className="fixed inset-0 z-[13000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#0f0f10] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="text-white/80" style={{ fontSize: "13px", fontWeight: 600 }}>
            Upscale Review
          </div>
          <div className="text-white/35" style={{ fontSize: "10px" }}>
            Compare before applying.
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0">
          <div className="p-4 border-r border-white/[0.06]">
            <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Before
            </div>
            <img src={beforeUrl} alt="before" className="w-full max-h-[50vh] object-contain rounded bg-black/40" />
          </div>
          <div className="p-4">
            <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              After
            </div>
            <img src={afterUrl} alt="after" className="w-full max-h-[50vh] object-contain rounded bg-black/40" />
          </div>
        </div>
        <div className="p-3 border-t border-white/[0.06] flex gap-2 justify-end">
          <button
            onClick={onReject}
            className="px-3 py-1.5 rounded bg-white/[0.05] border border-white/[0.08] text-white/60 hover:text-white/80"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            Reject
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"
            style={{ fontSize: "11px", fontWeight: 600 }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

