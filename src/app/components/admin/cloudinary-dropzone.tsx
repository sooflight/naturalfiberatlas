import { useEffect, useRef, useState } from "react";
import {
  getCloudinaryConfig,
  uploadImageFilesToCloudinary,
  uploadImageUrlsToCloudinary,
  type UploadedCloudinaryImage,
} from "./runtime/cloudinary-upload";

interface CloudinaryDropzoneProps {
  dropLabel: string;
  helperText: string;
  onUploaded: (entries: UploadedCloudinaryImage[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (!file.type) {
    // Finder and some drag sources can omit MIME metadata entirely.
    // Prefer to accept dropped files and let Cloudinary validate content.
    return true;
  }
  return false;
}

export function CloudinaryDropzone({
  dropLabel,
  helperText,
  onUploaded,
  onUploadingChange,
}: CloudinaryDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro-2", hypothesisId: "H6", location: "cloudinary-dropzone.tsx:mount", message: "src/app cloudinary dropzone mounted", data: { dropLabel }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
  }, [dropLabel]);

  const extractDroppedImageUrls = (event: React.DragEvent<HTMLElement>): string[] => {
    const dataTransfer = event.dataTransfer;
    const readData = typeof dataTransfer.getData === "function"
      ? dataTransfer.getData.bind(dataTransfer)
      : () => "";

    const values = new Set<string>();
    const maybeAdd = (value: string) => {
      const trimmed = value.trim();
      if (!/^https?:\/\//i.test(trimmed)) return;
      if (/\.(png|jpe?g|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(trimmed)) {
        values.add(trimmed);
      }
    };

    const uriList = readData("text/uri-list");
    for (const line of uriList.split("\n")) {
      const candidate = line.trim();
      if (!candidate || candidate.startsWith("#")) continue;
      maybeAdd(candidate);
    }

    maybeAdd(readData("text/plain"));

    const html = readData("text/html");
    const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null = imgSrcRegex.exec(html);
    while (match) {
      maybeAdd(match[1] ?? "");
      match = imgSrcRegex.exec(html);
    }

    return Array.from(values);
  };

  const uploadFiles = async (files: File[]) => {
    // #region agent log
    fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H3", location: "cloudinary-dropzone.tsx:uploadFiles:start", message: "uploadFiles invoked", data: { fileCount: files.length, files: files.slice(0, 5).map((f) => ({ name: f.name, type: f.type, size: f.size })) }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    if (files.length === 0) return;
    const config = getCloudinaryConfig();
    if (!config) {
      // #region agent log
      fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H3", location: "cloudinary-dropzone.tsx:uploadFiles:noConfig", message: "cloudinary config missing for dropped files", data: { hasConfig: false }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setUploadError("Cloudinary settings missing (cloud name or upload preset).");
      return;
    }

    setUploadError(null);
    onUploadingChange?.(true);
    try {
      const uploaded = await uploadImageFilesToCloudinary(files, config);
      // #region agent log
      fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H4", location: "cloudinary-dropzone.tsx:uploadFiles:success", message: "cloudinary file upload succeeded", data: { uploadedCount: uploaded.length, secureUrls: uploaded.slice(0, 5).map((u) => u.secureUrl) }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      onUploaded(uploaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      // #region agent log
      fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H4", location: "cloudinary-dropzone.tsx:uploadFiles:error", message: "cloudinary file upload failed", data: { errorMessage: message }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      setUploadError(message);
    } finally {
      onUploadingChange?.(false);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        // #region agent log
        fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H1", location: "cloudinary-dropzone.tsx:onDrop:entry", message: "drop event received", data: { fileCount: event.dataTransfer.files?.length ?? 0, itemCount: event.dataTransfer.items?.length ?? 0, itemTypes: Array.from(event.dataTransfer.items ?? []).slice(0, 8).map((i) => ({ kind: i.kind, type: i.type })) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        const files = Array.from(event.dataTransfer.files ?? []).filter(isImageFile);
        // #region agent log
        fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H2", location: "cloudinary-dropzone.tsx:onDrop:fileFilter", message: "drop files filtered for upload", data: { rawFiles: Array.from(event.dataTransfer.files ?? []).slice(0, 8).map((f) => ({ name: f.name, type: f.type, size: f.size })), acceptedFiles: files.slice(0, 8).map((f) => ({ name: f.name, type: f.type, size: f.size })) }, timestamp: Date.now() }) }).catch(() => {});
        // #endregion
        if (files.length > 0) {
          void uploadFiles(files);
          return;
        }
        const urls = extractDroppedImageUrls(event);
        if (urls.length === 0) return;
        const config = getCloudinaryConfig();
        if (!config) {
          // #region agent log
          fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H3", location: "cloudinary-dropzone.tsx:onDrop:urlPathNoConfig", message: "cloudinary config missing for dropped URLs", data: { droppedUrlCount: urls.length }, timestamp: Date.now() }) }).catch(() => {});
          // #endregion
          setUploadError("Cloudinary settings missing (cloud name or upload preset).");
          return;
        }
        setUploadError(null);
        onUploadingChange?.(true);
        void uploadImageUrlsToCloudinary(urls, config)
          .then((uploaded) => {
            // #region agent log
            fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H4", location: "cloudinary-dropzone.tsx:onDrop:urlUploadSuccess", message: "cloudinary URL upload succeeded", data: { droppedUrlCount: urls.length, uploadedCount: uploaded.length }, timestamp: Date.now() }) }).catch(() => {});
            // #endregion
            onUploaded(uploaded);
          })
          .catch((error) => {
            const message = error instanceof Error ? error.message : "Upload failed";
            // #region agent log
            fetch("http://127.0.0.1:7614/ingest/a3513545-33f8-4a04-a31f-147729a5d466", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "72f2cc" }, body: JSON.stringify({ sessionId: "72f2cc", runId: "finder-drop-repro", hypothesisId: "H4", location: "cloudinary-dropzone.tsx:onDrop:urlUploadError", message: "cloudinary URL upload failed", data: { errorMessage: message, droppedUrlCount: urls.length }, timestamp: Date.now() }) }).catch(() => {});
            // #endregion
            setUploadError(message);
          })
          .finally(() => onUploadingChange?.(false));
      }}
      className={`rounded border px-2.5 py-2 transition-colors ${
        isDragging
          ? "border-emerald-400/40 bg-emerald-400/10"
          : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-white/55" style={{ fontSize: "10px" }}>
          {dropLabel}
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-white/55 hover:text-white/80"
          style={{ fontSize: "10px" }}
        >
          Choose Files
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.currentTarget.value = "";
          void uploadFiles(files);
        }}
      />
      <div className="text-white/25 mt-1" style={{ fontSize: "9px" }}>
        {helperText}
      </div>
      {uploadError && (
        <div className="text-red-400/80 mt-1" style={{ fontSize: "9px" }}>
          {uploadError}
        </div>
      )}
    </div>
  );
}

