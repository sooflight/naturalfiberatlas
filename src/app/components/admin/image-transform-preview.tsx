import { useMemo, useState } from "react";
import { UpscaleReviewModal } from "./upscale-review-modal";

interface ImageTransformPreviewProps {
  imageUrl: string | null;
  onApply: (nextUrl: string) => void;
}

function addCloudinaryStyleTransform(url: string, transform: string): string {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tr=${encodeURIComponent(transform)}`;
}

export function ImageTransformPreview({ imageUrl, onApply }: ImageTransformPreviewProps) {
  const [gravity, setGravity] = useState("auto");
  const [width, setWidth] = useState(1200);
  const [quality, setQuality] = useState(80);
  const [reviewOpen, setReviewOpen] = useState(false);

  const transformedUrl = useMemo(() => {
    if (!imageUrl) return "";
    const recipe = `c_fill,g_${gravity},w_${width},q_${quality}`;
    return addCloudinaryStyleTransform(imageUrl, recipe);
  }, [gravity, imageUrl, quality, width]);

  if (!imageUrl) {
    return (
      <div className="h-full flex items-center justify-center text-white/35" style={{ fontSize: "12px" }}>
        Select a profile with images to preview transforms.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-white/[0.06] flex items-center gap-2">
        <label className="text-white/35" style={{ fontSize: "10px" }}>
          Gravity
        </label>
        <select
          value={gravity}
          onChange={(e) => setGravity(e.target.value)}
          className="px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/70"
          style={{ fontSize: "10px" }}
        >
          <option value="auto">auto</option>
          <option value="face">face</option>
          <option value="center">center</option>
        </select>
        <label className="text-white/35 ml-2" style={{ fontSize: "10px" }}>
          Width
        </label>
        <input
          type="number"
          value={width}
          min={320}
          max={2400}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-20 px-1.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/70"
          style={{ fontSize: "10px" }}
        />
        <label className="text-white/35 ml-2" style={{ fontSize: "10px" }}>
          Quality
        </label>
        <input
          type="number"
          value={quality}
          min={10}
          max={100}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-16 px-1.5 py-1 bg-white/[0.04] border border-white/[0.08] rounded text-white/70"
          style={{ fontSize: "10px" }}
        />
        <button
          onClick={() => setReviewOpen(true)}
          className="ml-auto px-3 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"
          style={{ fontSize: "11px", fontWeight: 600 }}
        >
          Review Upscale
        </button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-0">
        <div className="p-4 border-r border-white/[0.06]">
          <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Original
          </div>
          <img src={imageUrl} alt="original" className="w-full max-h-[58vh] object-contain rounded bg-black/40" />
        </div>
        <div className="p-4">
          <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Preview
          </div>
          <img src={transformedUrl} alt="preview" className="w-full max-h-[58vh] object-contain rounded bg-black/40" />
        </div>
      </div>
      {reviewOpen && (
        <UpscaleReviewModal
          beforeUrl={imageUrl}
          afterUrl={transformedUrl}
          onReject={() => setReviewOpen(false)}
          onConfirm={() => {
            onApply(transformedUrl);
            setReviewOpen(false);
          }}
        />
      )}
    </div>
  );
}

