import { useMemo, useState } from "react";
import { Compass, ExternalLink, Upload } from "lucide-react";
import { CloudinaryDropzone } from "./cloudinary-dropzone";
import { parseImageUrlsFromPastedText } from "@/utils/paste-image-urls";
import { hotlinkProneImageUrlHint } from "@/utils/hotlink-host-hints";

type CommitMode = "direct" | "upload";

interface ImageQuickActionsProps {
  fiberId: string;
  fiberName: string;
  existingImageUrls: string[];
  onAddImages: (urls: string[], mode: CommitMode) => void;
  onOpenAdvancedWorkspace: () => void;
}

export function ImageQuickActions({
  fiberId,
  fiberName,
  existingImageUrls,
  onAddImages,
  onOpenAdvancedWorkspace,
}: ImageQuickActionsProps) {
  const [open, setOpen] = useState(false);
  const [stagedInput, setStagedInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const stagedUrls = useMemo(() => parseImageUrlsFromPastedText(stagedInput), [stagedInput]);

  const hotlinkHint = useMemo(() => {
    for (const u of stagedUrls) {
      const h = hotlinkProneImageUrlHint(u);
      if (h) return h;
    }
    return null;
  }, [stagedUrls]);

  const clearAndClose = () => {
    setStagedInput("");
    setIsUploading(false);
    setOpen(false);
  };

  const appendStagedUrls = (urls: string[]) => {
    if (urls.length === 0) return;
    setStagedInput((prev) => {
      const existing = parseImageUrlsFromPastedText(prev);
      const next = [...existing, ...urls];
      return next.join("\n");
    });
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/80 transition-colors cursor-pointer"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          <Compass size={11} /> Open Scout
        </button>
        <button
          onClick={onOpenAdvancedWorkspace}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          <ExternalLink size={11} /> Advanced Images
        </button>
        <span className="text-white/20 ml-auto" style={{ fontSize: "10px" }}>
          {fiberName} · {fiberId}
        </span>
      </div>

      {open && (
        <div className="fixed inset-0 z-[12000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0e0e0e] border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <div className="text-white/80" style={{ fontSize: "13px", fontWeight: 600 }}>
                  Scout Lite
                </div>
                <div className="text-white/35" style={{ fontSize: "10px" }}>
                  Stage URLs for {fiberName}
                </div>
              </div>
              <button
                onClick={clearAndClose}
                className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70"
                style={{ fontSize: "10px" }}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-0">
              <div className="p-4 border-r border-white/[0.06]">
                <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Existing Images
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {existingImageUrls.length === 0 ? (
                    <div className="text-white/20" style={{ fontSize: "11px" }}>No existing images</div>
                  ) : (
                    existingImageUrls.map((url, i) => (
                      <div key={`${url}-${i}`} className="text-white/35 truncate" style={{ fontSize: "10px" }}>
                        {i + 1}. {url}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4">
                <div className="text-white/40 mb-2" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Staged URLs
                </div>
                <div className="mb-2">
                  <CloudinaryDropzone
                    dropLabel="Drop images here"
                    helperText="Uploads to Cloudinary, then stages resulting URLs"
                    onUploadingChange={setIsUploading}
                    onUploaded={(entries) => {
                      // #region agent log
                      fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H5", location: "image-quick-actions.tsx:onUploaded", message: "dropzone returned uploaded entries", data: { entryCount: entries.length, secureUrls: entries.slice(0, 5).map((entry) => entry.secureUrl) }, timestamp: Date.now() }) }).catch(() => {});
                      // #endregion
                      appendStagedUrls(entries.map((entry) => entry.secureUrl));
                    }}
                  />
                </div>
                <textarea
                  value={stagedInput}
                  onChange={(e) => setStagedInput(e.target.value)}
                  className="w-full h-44 px-2 py-2 bg-white/[0.03] border border-white/[0.08] rounded text-white/75 placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  style={{ fontSize: "11px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                  placeholder={"Paste one URL per line..."}
                />
                {hotlinkHint && (
                  <div
                    className="mb-2 px-2 py-1.5 rounded border border-amber-500/25 bg-amber-500/[0.06] text-amber-200/80"
                    style={{ fontSize: "10px", lineHeight: 1.35 }}
                  >
                    {hotlinkHint}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      if (stagedUrls.length === 0) return;
                      onAddImages(stagedUrls, "direct");
                      clearAndClose();
                    }}
                    className="flex-1 px-3 py-2 rounded bg-blue-500/80 hover:bg-blue-500 text-white disabled:opacity-40"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                    disabled={stagedUrls.length === 0 || isUploading}
                  >
                    Add Direct
                  </button>
                  <button
                    onClick={() => {
                      if (stagedUrls.length === 0) return;
                      // #region agent log
                      fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H5", location: "image-quick-actions.tsx:uploadAndAdd", message: "upload and add clicked", data: { stagedUrlCount: stagedUrls.length, firstUrls: stagedUrls.slice(0, 5) }, timestamp: Date.now() }) }).catch(() => {});
                      // #endregion
                      onAddImages(stagedUrls, "upload");
                      clearAndClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-40"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                    disabled={stagedUrls.length === 0 || isUploading}
                  >
                    <Upload size={12} /> Upload & Add
                  </button>
                </div>
                <div className="text-white/30 mt-2" style={{ fontSize: "10px" }}>
                  {isUploading
                    ? "Uploading images..."
                    : `${stagedUrls.length} staged URL${stagedUrls.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

